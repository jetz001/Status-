const { db } = require('./db');

function getSetting(key, defaultValue = '') {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

/**
 * Robustly extract clean human-readable text from any string, even if raw or malformed JSON is returned
 */
function extractCleanText(rawText) {
  if (!rawText) return '';
  let str = String(rawText).trim();

  // If text is wrapped or contains JSON
  if (str.startsWith('{') || str.startsWith('[') || str.includes('```json') || str.includes('"task_description"') || str.includes('"scope_of_work"') || str.includes('"thai"')) {
    // Strip markdown fences
    str = str.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
    try {
      const jsonStart = str.indexOf('{');
      const jsonEnd = str.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const jsonStr = str.substring(jsonStart, jsonEnd + 1);
        const obj = JSON.parse(jsonStr);
        const textFromObj = (val) => {
          if (!val) return '';
          if (typeof val === 'string') return val.trim();
          if (Array.isArray(val)) {
            return val.map(v => textFromObj(v)).filter(Boolean).join('\n');
          }
          if (typeof val === 'object') {
            if (val.thai) return textFromObj(val.thai);
            if (val.description) return textFromObj(val.description);
            if (val.task_description) return textFromObj(val.task_description);
            if (val.scope_of_work) return textFromObj(val.scope_of_work);
            if (val.title) return textFromObj(val.title);
            if (val.name) return textFromObj(val.name);
            if (val.text) return textFromObj(val.text);
            if (val.polished) return textFromObj(val.polished);
            const parts = [];
            for (const k of Object.keys(val)) {
              const res = textFromObj(val[k]);
              if (res) parts.push(res);
            }
            return parts.join('\n');
          }
          return String(val);
        };
        const extracted = textFromObj(obj);
        if (extracted) return extracted.replace(/^["'“”‘’]|["'“”‘’]$/g, '').trim();
      }
    } catch (e) {
      // If incomplete or malformed JSON like {"task_description": {"thai": "จัดทำและปรับปรุง Stockcard สำหรับ
      const thaiMatch = str.match(/"(?:thai|description|text|title|name|task_description|scope_of_work)"\s*:\s*(?:\[\s*\{\s*"description"\s*:\s*)?"([^"\\]*(?:\\.[^"\\]*)*)/i);
      if (thaiMatch && thaiMatch[1]) {
        return thaiMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
      }
    }
  }

  // Remove surrounding quotes and clean
  return str.replace(/^["'“”‘’]|["'“”‘’]$/g, '').trim();
}

/**
 * Calls the configured AI Provider (Gemini / OpenAI / Ollama)
 */
async function callLLM(prompt, systemInstruction = '', fileProcessed = null, forceJson = false) {
  const provider = getSetting('ai_provider', 'gemini');
  const apiKey = getSetting('ai_api_key', '').trim();

  const defaultModelMap = {
    gemini: 'gemini-1.5-flash',
    openai: 'gpt-4o-mini',
    claude: 'claude-3-5-sonnet-20241022',
    mistral: 'pixtral-12b-2409',
    qwen: 'qwen-plus',
    kimi: 'moonshot-v1-8k',
    ollama: 'llama3'
  };

  let model = getSetting('ai_model', defaultModelMap[provider] || 'gemini-1.5-flash');

  // Auto-upgrade legacy or tier-restricted mistral model to vision-capable pixtral
  if (provider === 'mistral' && (model === 'mistral-large-latest' || !model)) {
    model = 'pixtral-12b-2409';
    try {
      db.prepare('UPDATE app_settings SET value = ? WHERE key = ?').run(model, 'ai_model');
    } catch (e) {}
  }

  // If no API key is set for cloud providers, use our intelligent local rule-based fallback
  if (provider !== 'ollama' && !apiKey) {
    return null; // Signals fallback
  }

  try {
    const hasImage = fileProcessed && fileProcessed.type === 'image' && fileProcessed.base64;

    // 1. Google Gemini
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const parts = [];
      const textContent = `${systemInstruction ? systemInstruction + '\n\n' : ''}${prompt}`;
      parts.push({ text: textContent });
      if (hasImage) {
        parts.push({
          inlineData: {
            mimeType: fileProcessed.mimeType || 'image/png',
            data: fileProcessed.base64
          }
        });
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      });
      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      throw new Error(data.error?.message || 'Gemini API Error');
    }

    // 2. OpenAI
    if (provider === 'openai') {
      const url = 'https://api.openai.com/v1/chat/completions';
      const messages = [];
      if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

      if (hasImage) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${fileProcessed.mimeType || 'image/png'};base64,${fileProcessed.base64}` }
            }
          ]
        });
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      const payload = {
        model,
        messages,
        temperature: 0.2
      };
      if (forceJson) {
        payload.response_format = { type: 'json_object' };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      throw new Error(data.error?.message || 'OpenAI API Error');
    }

    // 3. Anthropic Claude
    if (provider === 'claude') {
      const url = 'https://api.anthropic.com/v1/messages';
      const messages = [];

      if (hasImage) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: fileProcessed.mimeType || 'image/png',
                data: fileProcessed.base64
              }
            },
            { type: 'text', text: prompt }
          ]
        });
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: systemInstruction || undefined,
          messages
        })
      });
      const data = await res.json();
      if (data.content && data.content[0]?.text) {
        return data.content[0].text.trim();
      }
      throw new Error(data.error?.message || 'Anthropic Claude API Error');
    }

    // 4. Mistral AI
    if (provider === 'mistral') {
      const trimmedKey = (apiKey || '').trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
      const url = 'https://api.mistral.ai/v1/chat/completions';
      const messages = [];
      if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

      if (hasImage) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: `data:${fileProcessed.mimeType || 'image/png'};base64,${fileProcessed.base64}`
            }
          ]
        });
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      const sendMistral = async (targetModel) => {
        const payload = {
          model: targetModel,
          messages,
          temperature: 0.2,
          max_tokens: 4096
        };
        if (forceJson) {
          payload.response_format = { type: 'json_object' };
        }

        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`
          },
          body: JSON.stringify(payload)
        });
      };

      let res = await sendMistral(model);
      if (res.status === 403 && model !== 'pixtral-12b-2409') {
        // Fallback to pixtral-12b-2409 if subscription tier disallows current model
        model = 'pixtral-12b-2409';
        db.prepare('UPDATE app_settings SET value = ? WHERE key = ?').run(model, 'ai_model');
        res = await sendMistral(model);
      }

      const data = await res.json();
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      const errorDetail = typeof data.detail === 'string' ? data.detail : (data.detail ? JSON.stringify(data.detail) : null);
      throw new Error(data.error?.message || data.message || errorDetail || `Mistral API Error (${res.status})`);
    }

    // 5. Qwen (Alibaba Cloud DashScope)
    if (provider === 'qwen') {
      const url = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
      const messages = [];
      if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: model || 'qwen-plus', messages, temperature: 0.7 })
      });
      const data = await res.json();
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      throw new Error(data.error?.message || 'Qwen API Error');
    }

    // 6. Kimi (Moonshot AI)
    if (provider === 'kimi') {
      const url = 'https://api.moonshot.cn/v1/chat/completions';
      const messages = [];
      if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: model || 'moonshot-v1-8k', messages, temperature: 0.7 })
      });
      const data = await res.json();
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      throw new Error(data.error?.message || 'Kimi Moonshot API Error');
    }

    // 7. Local Ollama
    if (provider === 'ollama') {
      const url = 'http://localhost:11434/api/generate';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3',
          prompt: `${systemInstruction ? systemInstruction + '\n\n' : ''}${prompt}`,
          stream: false
        })
      });
      const data = await res.json();
      return data.response ? data.response.trim() : null;
    }
  } catch (err) {
    console.error(`AI API Call failed (${provider}):`, err.message);
    return null;
  }
  return null;
}

/**
 * Helper to build comprehensive workspace and project context
 */
function getFullContext(extraContext = '') {
  const wsContext = getSetting('workspace_context', '');
  const parts = [];
  if (wsContext && wsContext.trim()) {
    parts.push(`[บริบทองค์กรและมาตรฐานการทำงาน]:\n${wsContext.trim()}`);
  }
  if (extraContext && extraContext.trim()) {
    parts.push(`[บริบทรายการงานปัจจุบัน]:\n${extraContext.trim()}`);
  }
  return parts.join('\n\n');
}

/**
 * Polish / improve text wording
 */
async function polishText(text, extraContext = '') {
  if (!text || !text.trim()) return text;
  const baseText = extractCleanText(text);
  const contextStr = getFullContext(extraContext);
  const prompt = `${contextStr ? contextStr + '\n\n' : ''}กรุณาปรับปรุงข้อความต่อไปนี้ให้เป็นภาษาไทย/อังกฤษที่กระชับ สละสลวย เป็นทางการ ชัดเจน และสอดคล้องกับบริบทงาน:\n"${baseText}"\nตอบกลับเฉพาะข้อความธรรมดา (Plain text) ที่ปรับแก้แล้วเท่านั้น ห้ามตอบเป็น JSON หรือเครื่องหมายคำพูดเด็ดขาด`;
  const llmResult = await callLLM(prompt, 'คุณคือผู้ช่วยบริหารโครงการมืออาชีพ ตอบเฉพาะข้อความธรรมดา ห้ามใช้ JSON เด็ดขาด', null, false);
  if (llmResult && llmResult.trim()) {
    return extractCleanText(llmResult.trim());
  }

  // Local rule-based smart polish fallback
  let polished = baseText;
  polished = polished.replace(/%/g, 'ร้อยละ ');
  polished = polished.replace(/^ทำ\s*/g, 'ดำเนินการจัดทำ ');
  polished = polished.replace(/^เช็ค\s*/g, 'ตรวจสอบและประเมินผล ');
  polished = polished.replace(/^ตาม\s*/g, 'ติดตามความคืบหน้า ');
  polished = polished.replace(/^แจก\s*/g, 'จัดทำและแจกแจง ');
  polished = polished.replace(/^ส่ง\s*/g, 'จัดส่งและประสานงาน ');
  polished = polished.replace(/^แก้\s*/g, 'ดำเนินการแก้ไขและปรับปรุง ');
  polished = polished.replace(/\s+/g, ' ').trim();

  // Keyword specific enrichment
  if (polished.includes('ความพึงพอใจลูกค้า') && !polished.includes('รายงาน')) {
    polished = `จัดทำและแจกแจงรายงานการวิเคราะห์ร้อยละความพึงพอใจของลูกค้า (Customer Satisfaction Report)`;
  } else if (polished === baseText) {
    polished = `จัดทำและบริหารงาน: ${baseText}`;
  }

  return polished;
}

/**
 * Generate subtask checklist items from task title
 */
async function generateSubtasks(title, description = '', extraContext = '') {
  const cleanTitle = extractCleanText(title);
  const cleanDesc = extractCleanText(description);
  const contextStr = getFullContext(extraContext);
  const prompt = `${contextStr ? contextStr + '\n\n' : ''}วิเคราะห์ชื่องาน: "${cleanTitle}" ${cleanDesc ? 'รายละเอียด: ' + cleanDesc : ''}\nแตกเป็นขั้นตอนย่อย (Subtasks Checklist) สำหรับการทำงานจริง 3 ถึง 5 ข้อ ที่สอดคล้องกับมาตรฐานและบริบทงาน\nตอบกลับในรูปแบบรายการ 1 บรรทัดต่อ 1 ข้อความเท่านั้น โดยขึ้นต้นด้วยขีด (-) หรือตัวเลข ห้ามตอบเป็น JSON`;
  const llmResult = await callLLM(prompt, 'คุณคือ AI Project Planner ตอบเฉพาะรายการบรรทัดละ 1 ข้อ ห้ามใช้ JSON', null, false);
  
  if (llmResult) {
    const lines = llmResult.split('\n')
      .map(l => extractCleanText(l.replace(/^[-*•\d.]+\s*/, '').trim()))
      .filter(l => l.length > 2 && !l.startsWith('{') && !l.startsWith('}'));
    if (lines.length > 0) return lines;
  }

  // Local rule-based fallback based on keywords
  const titleLower = cleanTitle.toLowerCase();
  if (titleLower.includes('kpi') || titleLower.includes('format')) {
    return [
      'รวบรวมฟอร์แมต KPI เดิมจากทุกแผนก',
      'จัดทำร่างแบบฟอร์มมาตรฐานใหม่',
      'ส่งขอความเห็นชอบจากหัวหน้างาน',
      'ประกาศใช้และชี้แจงแนวทางการกรอกข้อมูล'
    ];
  }
  if (titleLower.includes('risk') || titleLower.includes('feasibility')) {
    return [
      'ระบุปัจจัยเสี่ยงและผลกระทบที่อาจเกิดขึ้น',
      'ประเมินระดับความเสี่ยง (Likelihood & Impact)',
      'กำหนดมาตรการป้องกันและแผนรองรับความเสี่ยง',
      'สรุปผลและรายงานผู้มีส่วนได้ส่วนเสีย'
    ];
  }
  if (titleLower.includes('supplier')) {
    return [
      'ดึงรายชื่อและประวัติการสั่งซื้อ Supplier ทั้งหมด',
      'ตรวจสอบเกณฑ์การประเมินคุณภาพและการส่งมอบ',
      'ให้คะแนนตามแบบประเมิน Supplier Audit',
      'บันทึกผลลงทะเบียน Approved Vendor List (AVL)'
    ];
  }
  if (titleLower.includes('audit') || titleLower.includes('iqa')) {
    return [
      'ตรวจสอบแผนการตรวจติดตามและ Checklist',
      'รวบรวมหลักฐานและบันทึกข้อค้นพบ (CAR/PAR)',
      'จัดทำรายงานสรุป Audit Report ฉบับสมบูรณ์',
      'ส่งรายงานและติดตามการปิดประเด็น'
    ];
  }

  // Generic fallback
  return [
    `วางแผนและรวบรวมข้อมูลเริ่มต้นสำหรับ: ${cleanTitle}`,
    'ดำเนินการจัดเตรียมเอกสารและประสานงานผู้เกี่ยวข้อง',
    'ตรวจสอบความถูกต้องและความเรียบร้อยตามมาตรฐาน',
    'สรุปผลและบันทึกความคืบหน้าโครงการ'
  ];
}

/**
 * Smart Auto-fill metadata (Priority, Defect Severity, suggested due days)
 */
async function autofillMetadata(title, extraContext = '') {
  const cleanTitle = extractCleanText(title);
  const contextStr = getFullContext(extraContext);
  const prompt = `${contextStr ? contextStr + '\n\n' : ''}วิเคราะห์ชื่องาน: "${cleanTitle}"\nให้แนะนำค่าในรูปแบบ JSON ดังนี้:\n{"priority": "Urgent"|"High"|"Normal"|"Low", "severity": "Critical"|"Major"|"Minor"|"Low", "suggestedDays": 3}\nตอบเฉพาะ JSON เท่านั้น`;
  const llmResult = await callLLM(prompt, 'ตอบเฉพาะ JSON Object เท่านั้น', null, true);
  if (llmResult) {
    try {
      const match = llmResult.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (e) {}
  }

  // Local rule-based fallback
  const t = cleanTitle.toLowerCase();
  let priority = 'Normal';
  let severity = 'Minor';
  let days = 7;

  if (t.includes('risk') || t.includes('urgent') || t.includes('ด่วน') || t.includes('วิกฤต')) {
    priority = 'Urgent';
    severity = 'Critical';
    days = 3;
  } else if (t.includes('kpi') || t.includes('audit') || t.includes('iqa') || t.includes('สำคัญ')) {
    priority = 'High';
    severity = 'Major';
    days = 5;
  } else if (t.includes('supplier') || t.includes('stock')) {
    priority = 'Normal';
    severity = 'Minor';
    days = 7;
  } else {
    priority = 'Normal';
    severity = 'Low';
    days = 10;
  }

  return { priority, severity, suggestedDays: days };
}

/**
 * Single Unified AI Action: Auto-complete, Polish, Description & Subtasks in One Go
 */
async function completeTaskAll(title, description = '', extraContext = '') {
  const cleanTitle = extractCleanText(title);
  const cleanDesc = extractCleanText(description);
  const contextStr = getFullContext(extraContext);

  const [polishedTitle, autofillData, subtasksList] = await Promise.all([
    polishText(cleanTitle, extraContext),
    (async () => {
      const meta = await autofillMetadata(cleanTitle, extraContext);
      const descPrompt = `${contextStr ? contextStr + '\n\n' : ''}วิเคราะห์ชื่องาน: "${cleanTitle}" ${cleanDesc ? 'รายละเอียดเดิม: ' + cleanDesc : ''}
กรุณาเขียนคำอธิบายงานและแนวทางการปฏิบัติงาน (Scope of Work & Key Deliverables) สำหรับชิ้นงานนี้
สรุปเป็น 2-4 บรรทัด หรือรายการข้อที่กระชับ ชัดเจน เป็นภาษาไทยสำหรับฝ่ายบริหารและทีมงาน
ตอบเป็นข้อความธรรมดาหรือรายการข้อ ห้ามตอบเป็น JSON หรือโค้ดเด็ดขาด`;
      const descRes = await callLLM(descPrompt, 'คุณคือผู้จัดการโครงการมืออาชีพ ตอบเฉพาะข้อความธรรมดา ห้ามใช้ JSON', null, false);
      const finalDesc = descRes ? extractCleanText(descRes) : (cleanDesc || `รายละเอียดการดำเนินงานสำหรับ: ${cleanTitle}\n- ตรวจสอบความถูกต้องและรวบรวมข้อมูลที่เกี่ยวข้อง\n- ดำเนินการตามขั้นตอนและมาตรฐานของโครงการ\n- ประเมินผลลัพธ์และสรุปรายงานเสนอฝ่ายบริหาร`);
      return {
        priority: meta.priority || 'Normal',
        severity: meta.severity || 'Minor',
        suggestedDays: meta.suggestedDays || 7,
        description: finalDesc
      };
    })(),
    generateSubtasks(cleanTitle, cleanDesc, extraContext)
  ]);

  return {
    title: polishedTitle || cleanTitle,
    description: autofillData.description,
    priority: autofillData.priority,
    severity: autofillData.severity,
    suggestedDays: autofillData.suggestedDays,
    subtasks: subtasksList
  };
}

/**
 * Conversational Assistant with Project & RAG Context
 */
async function chatAssistant(messages, ragContext, extraContext = '') {
  const contextStr = getFullContext(extraContext);
  const systemInstruction = `คุณคือ AI Project Assistant ผู้เชี่ยวชาญด้านการบริหารจัดการโครงการ (Project Manager AI)
ทำงานร่วมกับโปรแกรม Status+ Project Manager โดยช่วยผู้ใช้ตอบคำถาม สรุปงาน ติดตามสถานะงาน และวางแผนงาน
${contextStr ? `\n${contextStr}\n` : ''}
ข้อมูลบริบทงานในระบบปัจจุบันที่ค้นหาพบจาก Vector Database:\n${ragContext || 'ไม่มีข้อมูลเพิ่มเติม'}\n
ให้ตอบคำถามอย่างกระชับ สุภาพ เป็นภาษาไทย/อังกฤษที่ชัดเจน ตรงกับบริบทการทำงาน และอ้างอิงข้อมูลทาสก์ที่มีในระบบอย่างแม่นยำ`;

  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const llmResult = await callLLM(lastUserMsg, systemInstruction);
  if (llmResult) return llmResult;

  // Local fallback response using RAG context
  if (ragContext) {
    return `สวัสดีครับ จากข้อมูลในโปรเจกต์ที่เกี่ยวข้องกับข้อความของคุณ:\n\n${ragContext}\n\n💡 หมายเหตุ: คุณสามารถใส่ API Key (Google Gemini หรือ OpenAI) ในเมนู Settings เพื่อเปิดใช้งานฟีเจอร์สนทนา AI แบบเต็มประสิทธิภาพได้ตลอดเวลาครับ!`;
  }
  return `สวัสดีครับ! ผมคือ AI Project Manager ขณะนี้ระบบกำลังทำงานในโหมด Local ออฟไลน์ คุณสามารถค้นหางาน สรุปสถานะงาน หรือตั้งค่า API Key ในปุ่ม Settings เพื่อสนทนาแบบฉลาดล้ำลึกได้ครับ`;
}

module.exports = {
  extractCleanText,
  callLLM,
  polishText,
  generateSubtasks,
  autofillMetadata,
  completeTaskAll,
  chatAssistant
};
