const { db } = require('./db');

function getSetting(key, defaultValue = '') {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

/**
 * Calls the configured AI Provider (Gemini / OpenAI / Ollama)
 */
async function callLLM(prompt, systemInstruction = '', fileProcessed = null) {
  const provider = getSetting('ai_provider', 'gemini');
  const apiKey = getSetting('ai_api_key', '');

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

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages, temperature: 0.7 })
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
        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ model: targetModel, messages, temperature: 0.7 })
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
      throw new Error(data.error?.message || data.message || 'Mistral API Error');
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
  const contextStr = getFullContext(extraContext);
  const prompt = `${contextStr ? contextStr + '\n\n' : ''}กรุณาปรับปรุงข้อความต่อไปนี้ให้เป็นภาษาไทย/อังกฤษที่กระชับ สละสลวย เป็นทางการ ชัดเจน และสอดคล้องกับบริบทงาน:\n"${text.trim()}"\nตอบกลับเฉพาะข้อความที่ปรับแก้แล้วเท่านั้น ไม่ต้องมีคำนำหรือคำลงท้ายหรือเครื่องหมายคำพูด`;
  const llmResult = await callLLM(prompt, 'คุณคือผู้ช่วยบริหารโครงการมืออาชีพ');
  if (llmResult && llmResult.trim()) {
    return llmResult.trim().replace(/^["'“”‘’]|["'“”‘’]$/g, '');
  }

  // Local rule-based smart polish fallback
  let polished = text.trim();
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
  } else if (polished === text.trim()) {
    polished = `จัดทำและบริหารงาน: ${text.trim()}`;
  }

  return polished;
}

/**
 * Generate subtask checklist items from task title
 */
async function generateSubtasks(title, description = '', extraContext = '') {
  const contextStr = getFullContext(extraContext);
  const prompt = `${contextStr ? contextStr + '\n\n' : ''}วิเคราะห์ชื่องาน: "${title}" ${description ? 'รายละเอียด: ' + description : ''}\nแตกเป็นขั้นตอนย่อย (Subtasks Checklist) สำหรับการทำงานจริง 3 ถึง 5 ข้อ ที่สอดคล้องกับมาตรฐานและบริบทงาน\nตอบกลับในรูปแบบรายการ 1 บรรทัดต่อ 1 ข้อความเท่านั้น โดยขึ้นต้นด้วยขีด (-) หรือตัวเลข`;
  const llmResult = await callLLM(prompt, 'คุณคือ AI Project Planner');
  
  if (llmResult) {
    const lines = llmResult.split('\n')
      .map(l => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(l => l.length > 2);
    if (lines.length > 0) return lines;
  }

  // Local rule-based fallback based on keywords
  const titleLower = title.toLowerCase();
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
    `วางแผนและรวบรวมข้อมูลเริ่มต้นสำหรับ: ${title}`,
    'ดำเนินการจัดเตรียมเอกสารและประสานงานผู้เกี่ยวข้อง',
    'ตรวจสอบความถูกต้องและความเรียบร้อยตามมาตรฐาน',
    'สรุปผลและบันทึกความคืบหน้าโครงการ'
  ];
}

/**
 * Smart Auto-fill metadata (Priority, Defect Severity, suggested due days)
 */
async function autofillMetadata(title, extraContext = '') {
  const contextStr = getFullContext(extraContext);
  const prompt = `${contextStr ? contextStr + '\n\n' : ''}วิเคราะห์ชื่องาน: "${title}"\nให้แนะนำค่าในรูปแบบ JSON ดังนี้:\n{"priority": "Urgent"|"High"|"Normal"|"Low", "severity": "Critical"|"Major"|"Minor"|"Low", "suggestedDays": 3}\nตอบเฉพาะ JSON เท่านั้น`;
  const llmResult = await callLLM(prompt);
  if (llmResult) {
    try {
      const match = llmResult.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (e) {}
  }

  // Local rule-based fallback
  const t = title.toLowerCase();
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
  callLLM,
  polishText,
  generateSubtasks,
  autofillMetadata,
  chatAssistant
};
