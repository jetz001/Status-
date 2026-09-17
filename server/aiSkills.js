const { tools, executeTool, getDefaultListId, getSpacesAndLists } = require('./aiTools');
const { callLLM } = require('./aiService');
const { processFileForAI } = require('./fileProcessor');
const { semanticSearch } = require('./ragService');

// Skill Metadata Registry
const SKILLS = {
  doc_analyzer: {
    id: 'doc_analyzer',
    label: 'วิเคราะห์เอกสาร PDF / รูปภาพ',
    icon: 'FileText',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    tools: ['create_task', 'create_subtasks', 'create_project']
  },
  task_ops: {
    id: 'task_ops',
    label: 'จัดการงาน (Task Ops)',
    icon: 'CheckSquare',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    tools: ['create_task', 'update_task', 'delete_task', 'create_subtasks', 'move_task']
  },
  project_builder: {
    id: 'project_builder',
    label: 'วางโครงสร้างโปรเจกต์',
    icon: 'FolderPlus',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    tools: ['create_project', 'create_task']
  },
  advisor: {
    id: 'advisor',
    label: 'ที่ปรึกษาวางแผนงาน (Advisor)',
    icon: 'Sparkles',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    tools: ['query_tasks', 'get_project_overview']
  },
  desktop_controller: {
    id: 'desktop_controller',
    label: 'ควบคุมหน้าจอ Windows (Desktop Control & MCP)',
    icon: 'Monitor',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    tools: ['take_screenshot', 'list_windows', 'activate_window', 'click_mouse', 'type_input', 'launch_app', 'quit_app']
  }
};

/**
 * Skill Router: Selects the appropriate skill based on user query and attachments
 */
function routeSkill(userText, hasAttachment = false) {
  if (hasAttachment) {
    return SKILLS.doc_analyzer;
  }

  const text = (userText || '').toLowerCase();

  // 0. Desktop Automation / MCP intent
  if (/แคปหน้าจอ|ถ่ายหน้าจอ|ภาพหน้าจอ|screenshot|มองหน้าจอ|เปิดโปรแกรม|ปิดโปรแกรม|สลับหน้าต่าง|รายชื่อหน้าต่าง|คลิกเมาส์|พิมพ์คีย์|desktop\s*control|mcp/i.test(text)) {
    return SKILLS.desktop_controller;
  }

  // 1. Project / Space building intent
  if (/สร้าง\s*(โปรเจกต์|โปรเจค|project|space|list|รายการใหม่)|ตั้ง\s*(โปรเจกต์|space)/i.test(text)) {
    return SKILLS.project_builder;
  }

  // 2. Task CRUD operations
  if (/สร้าง\s*งาน|เพิ่ม\s*งาน|ลบ\s*งาน|แก้ไข\s*งาน|อัปเดต|เปลี่ยน\s*(สถานะ|กำหนด|วันส่ง|ความสำคัญ)|ทำเสร็จ|ย้าย\s*งาน|เพิ่ม\s*(checklist|subtask|งานย่อย)/i.test(text)) {
    return SKILLS.task_ops;
  }

  // 3. Document keywords even without file
  if (/เอกสาร|pdf|สเปก|ใบงาน|contract|scope/i.test(text) && /แยก\s*งาน|สร้าง\s*งาน/i.test(text)) {
    return SKILLS.doc_analyzer;
  }

  // 4. Advisory / Search / Summary
  return SKILLS.advisor;
}

/**
 * Rule-based tool extractor fallback (handles commands even without external LLM API key)
 */
async function fallbackRuleExecution(skill, query, fileProcessed = null, activeListId = null) {
  const actions = [];
  let reply = '';
  const text = query.trim();

  // Document extraction fallback -> PROPOSE PLAN FIRST (Grill-me)
  if (fileProcessed) {
    const spacesAndLists = getSpacesAndLists();
    const flatLists = [];
    spacesAndLists.forEach(sp => {
      sp.lists.forEach(l => {
        flatLists.push({ spaceName: sp.name, listId: l.id, listName: l.name });
      });
    });

    const docText = fileProcessed.text || '';
    const cleanLines = docText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5 && (/^(\d+[\.\)]|[-*•])/.test(l) || /task|งาน|จัดทำ|ตรวจสอบ|ดำเนินการ/i.test(l)))
      .slice(0, 5);

    const planTitle = cleanLines[0]?.replace(/^(\d+[\.\)]|[-*•])\s*/, '') || (fileProcessed.type === 'image' ? `วิเคราะห์และดำเนินงานตามรูปภาพ: ${fileProcessed.originalName}` : `ดำเนินการตามเอกสาร: ${fileProcessed.originalName}`);
    const subtasks = cleanLines.length > 1 
      ? cleanLines.slice(1).map(l => l.replace(/^(\d+[\.\)]|[-*•])\s*/, ''))
      : ['ตรวจสอบความถูกต้องและรายละเอียดในภาพ/เอกสาร', 'แบ่งหน้าที่และมอบหมายผู้รับผิดชอบ', 'ติดตามผลการดำเนินงาน'];

    const targetListId = activeListId || (flatLists[0]?.listId || '');

    actions.push({
      action: 'plan_proposal',
      title: '📋 ร่างแผนงาน (รออนุมัติก่อนสร้าง)',
      plan: {
        name: planTitle,
        description: `วิเคราะห์จาก: ${fileProcessed.originalName}\n${docText ? docText.slice(0, 300) : 'เอกสาร/ภาพแนบ'}`,
        priority: 'Normal',
        subtasks,
        defaultListId: targetListId,
        fileInfo: fileProcessed.fileInfo
      },
      availableLists: flatLists
    });

    const listNamesStr = flatLists.map(l => `• **${l.spaceName}** › ${l.listName}`).join('\n');
    reply = `ผมได้วิเคราะห์และร่างแผนงานเบื้องต้นมาให้ตรวจสอบแล้วครับ (ยังไม่ได้สร้างลงระบบ)\n\n🎯 **กรุณาเลือก Space หรือ List ปลายทาง** ที่ต้องการนำงานนี้ไปบรรจุ หรือกดปุ่มอนุมัติสร้างงานตามแผนด้านล่างได้เลยครับ:\n\n${listNamesStr}`;
    return { skill, actions, reply };
  }

  // DESKTOP AUTOMATION & MCP COMMANDS:
  // 1. Screenshot
  if (/แคปหน้าจอ|ถ่ายหน้าจอ|ภาพหน้าจอ|screenshot|ดูหน้าจอ/i.test(text)) {
    try {
      const res = await executeTool('take_screenshot', {});
      actions.push(res);
      reply = `📸 **แคปภาพหน้าจอ Windows เรียบร้อยแล้วครับ!**\n\nบันทึกไฟล์ไว้ที่: \`${res.filePath}\`\nคุณสามารถให้ผมช่วยวิเคราะห์ข้อมูลบนหน้าจอ สรุปงาน หรือสั่งการเมาส์/คีย์บอร์ดต่อได้เลยครับ`;
    } catch (e) {
      reply = `⚠️ เกิดข้อผิดพลาดในการแคปหน้าจอ: ${e.message}`;
    }
    return { skill, actions, reply };
  }

  // 2. List Windows
  if (/หน้าต่าง.*เปิด|โปรแกรม.*เปิด|list\s*window/i.test(text)) {
    try {
      const res = await executeTool('list_windows', {});
      actions.push(res);
      const winList = res.windows.map(w => `• **${w.title}** (PID: ${w.pid})`).join('\n');
      reply = `🖥️ **รายชื่อหน้าต่างโปรแกรมที่เปิดอยู่บน Windows (${res.count} หน้าต่าง):**\n\n${winList || 'ไม่พบหน้าต่างโปรแกรมที่เปิดค้างไว้'}`;
    } catch (e) {
      reply = `⚠️ ไม่สามารถตรวจสอบรายชื่อหน้าต่างได้: ${e.message}`;
    }
    return { skill, actions, reply };
  }

  // 3. Activate Window
  const switchMatch = text.match(/สลับ\s*(?:หน้าต่าง|ไปที่)?\s*[:"']?([^"'\n]+)/i);
  if (switchMatch && !/สรุป|งาน/i.test(switchMatch[1])) {
    const targetTitle = switchMatch[1].trim();
    try {
      const res = await executeTool('activate_window', { title: targetTitle });
      actions.push(res);
      reply = res.message;
    } catch (e) {
      reply = `⚠️ ไม่พบหน้าต่างที่ตรงกับ "${targetTitle}" บนระบบครับ`;
    }
    return { skill, actions, reply };
  }

  // 4. Quit App
  if (/ปิดโปรแกรม|quit\s*app|exit\s*app/i.test(text)) {
    const res = await executeTool('quit_app', { force: /force|บังคับ/i.test(text) });
    actions.push(res);
    reply = res.message;
    return { skill, actions, reply };
  }

  // DELETE command fallback
  const deleteMatch = text.match(/ลบ\s*งาน\s*[:"']?([^"'\n]+?)["']?(\s*$|\s+ยืนยัน)/i);
  if (deleteMatch) {
    const taskName = deleteMatch[1].trim();
    const res = await executeTool('delete_task', { name: taskName, confirmed: /ยืนยัน/i.test(text) });
    actions.push(res);
    reply = res.requiresConfirmation 
      ? `ต้องการลบงาน "${res.task?.name}" ใช่หรือไม่? กรุณากดยืนยันด้านล่างครับ`
      : res.message;
    return { skill, actions, reply };
  }

  // CREATE TASK command fallback
  const createMatch = text.match(/(?:สร้าง|เพิ่ม)\s*งาน(?:\s*ใหม่)?(?:\s*ชื่อ)?\s*[:"']?([^"'\n,]+)/i);
  if (createMatch) {
    const taskName = createMatch[1].replace(/ความสำคัญ.*|กำหนดส่ง.*|ใน.*$/i, '').trim();
    
    let priority = 'Normal';
    if (/urgent|ด่วนที่สุด|วิกฤต/i.test(text)) priority = 'Urgent';
    else if (/high|ด่วน|สูง/i.test(text)) priority = 'High';
    else if (/low|ต่ำ/i.test(text)) priority = 'Low';

    let dueDate = null;
    if (/วันนี้/i.test(text)) dueDate = new Date().toISOString().split('T')[0];
    else if (/พรุ่งนี้/i.test(text)) dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    else {
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) dueDate = dateMatch[1];
    }

    const res = await executeTool('create_task', {
      list_id: activeListId || getDefaultListId(),
      name: taskName,
      priority,
      due_date: dueDate
    });
    actions.push(res);
    reply = `สร้างงาน "${taskName}" เรียบร้อยแล้วครับ (ความสำคัญ: ${priority}${dueDate ? `, กำหนดส่ง: ${dueDate}` : ''})`;
    return { skill, actions, reply };
  }

  // ADD SUBTASKS fallback
  const subMatch = text.match(/เพิ่ม\s*(?:checklist|subtask|งานย่อย)\s*(?:ในงาน\s*[:"']?([^"'\n]+?)["']?)?\s*[:\-]\s*(.+)/i);
  if (subMatch) {
    const taskName = subMatch[1] ? subMatch[1].trim() : '';
    const items = subMatch[2].split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    if (items.length > 0) {
      const res = await executeTool('create_subtasks', { task_name: taskName, subtasks: items });
      actions.push(res);
      reply = res.message;
      return { skill, actions, reply };
    }
  }

  // 5. PROJECT OVERVIEW / STATUS SUMMARY QUERY
  if (/สรุป|ภาพรวม|สถานะ|งานทั้งหมด|รายงาน|overview|dashboard|kpi|งานในระบบ/i.test(text)) {
    const overview = await executeTool('get_project_overview', { list_id: activeListId });
    actions.push(overview);
    const { total, completed, inProgress, notStarted, percent } = overview.stats;

    let taskListStr = '';
    if (overview.tasks.length > 0) {
      taskListStr = overview.tasks.map(t => 
        `• **${t.name}** (สถานะ: ${t.status}, ลิสต์: ${t.listName}${t.dueDate ? `, กำหนดส่ง: ${t.dueDate}` : ''})`
      ).join('\n');
    } else {
      taskListStr = 'ยังไม่มีรายการงานในระบบ';
    }

    reply = `### 📊 สรุปภาพรวมและสถานะงานในระบบ

[STATS: total=${total}, completed=${completed}, inProgress=${inProgress}, notStarted=${notStarted}, percent=${percent}]

พบงานทั้งหมด **${total} รายการ** ในระบบ (อัตราความสำเร็จ **${percent}%**)

#### 📋 รายการงานปัจจุบัน:
${taskListStr}

> 💡 **แนะนำคำสั่งถัดไป:** คุณสามารถพิมพ์สั่ง *สร้างงานใหม่*, *อัปเดตสถานะงาน*, หรือแนบไฟล์เอกสาร PDF/รูปภาพ เพื่อให้ AI ดำเนินการวิเคราะห์และแยกงานได้ทันที`;

    return { skill, actions, reply };
  }

  // 6. Default query / advisory fallback
  const ragResults = semanticSearch(text, 5);
  let ragSnippet = '';
  if (ragResults.length > 0) {
    ragSnippet = ragResults.map(r => `• **${r.name}** (สถานะ: ${r.status}, ลิสต์: ${r.listName})`).join('\n');
  }

  reply = `### 🔍 ข้อมูลงานที่เกี่ยวข้องในระบบ

${ragSnippet || 'ยังไม่พบข้อมูลงานที่ตรงกับคำค้นหาโดยตรง'}

> 💡 **คุณสามารถสั่งให้ผม:**
> 1. สร้างงานใหม่ หรือ โครงการใหม่
> 2. สรุปภาพรวมงาน หรือ งานที่ใกล้ถึงกำหนดส่ง
> 3. แก้ไขข้อมูลผู้รับผิดชอบ และความสำคัญ
> 4. แนบไฟล์ PDF หรือ รูปภาพ เพื่อสกัดงานอัตโนมัติ`;

  return { skill, actions, reply };
}

/**
 * Main Agent Controller: Routes to Skill, builds schema, calls LLM or fallback, and executes tools
 */
async function processAgentQuery({
  userMessage,
  fileProcessed = null,
  activeListId = null,
  context = ''
}) {
  const skill = routeSkill(userMessage, !!fileProcessed);

  // Fetch real-time spaces & lists to ground the AI
  const spacesAndLists = getSpacesAndLists();
  const flatLists = [];
  spacesAndLists.forEach(sp => {
    sp.lists.forEach(l => {
      flatLists.push({ spaceName: sp.name, listId: l.id, listName: l.name });
    });
  });

  const spacesListText = spacesAndLists.map(sp =>
    `• Space "${sp.name}": Lists: [${sp.lists.map(l => `"${l.name}" (ID: "${l.id}")`).join(', ')}]`
  ).join('\n');

  // System instructions for structured tool execution
  const systemInstruction = `
คุณคือ Status+ AI Agent ผู้ช่วยอัจฉริยะในการบริหารจัดการโปรเจกต์และงาน
สกิลปัจจุบันที่ถูกเลือก: "${skill.label}" (${skill.id})
เครื่องมือที่คุณมีสิทธิ์เรียกใช้: ${skill.tools.join(', ')}

บริบทโปรเจกต์ปัจจุบัน: ${context || 'ทั่วไป'} (Active List ID: ${activeListId || 'default'})

โครงสร้าง Spaces และ Lists ในระบบปัจจุบัน:
${spacesListText}

${fileProcessed ? `
มีไฟล์แนบเข้ามา: "${fileProcessed.originalName}" (${fileProcessed.type})
${fileProcessed.text ? `เนื้อหาในเอกสารที่สกัดได้:\n"""\n${fileProcessed.text.slice(0, 3000)}\n"""` : 'ไฟล์รูปภาพ (ให้วิเคราะห์ภาพ อ่านข้อความ OCR และสรุปองค์ประกอบงาน)'}
` : ''}

## กฎเหล็กในการทำงาน (Grill-Me & Plan-First Principle):
1. เมื่อมีเอกสารหรือรูปภาพแนบเข้ามา หรือผู้ใช้สั่งให้ "จัดงาน", "แยกงาน", "วิเคราะห์", "วางแผน" (และยังไม่ได้ระบุยืนยันว่าให้สร้างลง Space/List ใดชัดเจน):
   - **ห้ามเรียกใช้ "create_task" ทันทีโดยเด็ดขาด!**
   - ให้วิเคราะห์ข้อความ/ภาพอย่างละเอียด สกัดชื่องานจริง (ห้ามตั้งชื่อ dummy เช่น ดำเนินการตามเอกสาร: ...)
   - สรุปรายละเอียดงาน และจัดทำรายการ Checklist (subtasks) 3-5 ข้อ
   - ให้ส่งผลลัพธ์เป็น Action ชนิด "plan_proposal" เท่านั้น เพื่อให้ผู้ใช้ตรวจทานและเลือก Space/List ก่อนสร้าง:
   {
     "actions": [
       {
         "action": "plan_proposal",
         "title": "📋 ร่างแผนงาน (รออนุมัติก่อนสร้าง)",
         "plan": {
           "name": "ชื่องานจริงที่สกัดได้จากเอกสารหรือภาพ",
           "description": "รายละเอียดงานและขอบเขต",
           "priority": "Normal/High/Urgent/Low",
           "due_date": "YYYY-MM-DD หรือ null",
           "subtasks": ["Checklist 1", "Checklist 2", "Checklist 3"]
         }
       }
     ],
     "reply": "ข้อความสรุปสิ่งที่อ่านได้จากเอกสาร/ภาพ พร้อมนำเสนอแผนงาน และถามผู้ใช้ (Grill-me) ชัดเจนว่าต้องการให้นำเข้า Space หรือ List ใดในระบบ"
   }

2. หากผู้ใช้สั่ง "สร้างงานใหม่ X โดยตรง" (ระบุชื่อและต้องการสร้างทันที) หรือ "อนุมัติสร้างแผนงาน" หรือ "สร้างลงใน Space/List Y":
   - ให้ตอบกลับเป็น JSON เพื่อเรียกใช้ Tool "create_task":
   {
     "actions": [
       {
         "tool": "create_task",
         "args": {
           "list_id": "ID ของ List ที่ถูกต้องจากรายชื่อ Lists ในระบบ",
           "name": "ชื่องาน",
           "description": "รายละเอียดงาน",
           "priority": "Normal/High/Urgent/Low",
           "due_date": "YYYY-MM-DD หรือ null",
           "subtasks": ["ข้อย่อย 1", "ข้อย่อย 2"]
         }
       }
     ],
     "reply": "ข้อความสรุปการสร้างงานที่เรียบร้อยและชัดเจน"
   }

3. หากเป็นการปรึกษา สรุปภาพรวม หรือถามทั่วไปที่ไม่ต้องสร้างหรือแก้ไขงาน:
   {
     "actions": [],
     "reply": "คำตอบและคำแนะนำของคุณ..."
   }
`;

// Safe JSON parser that handles markdown fences and unescaped newlines from LLMs
function safeJsonParse(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();

  // Strip ```json ... ``` or ``` ... ```
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch (e) {}

  try {
    let inString = false;
    let escaped = false;
    let cleaned = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      if (inString && (char === '\n' || char === '\r')) {
        cleaned += '\\n';
      } else if (inString && char === '\t') {
        cleaned += '\\t';
      } else {
        cleaned += char;
      }
      escaped = char === '\\' && !escaped;
    }
    return JSON.parse(cleaned);
  } catch (e) {}

  return null;
}

  // Attempt LLM execution
  try {
    const prompt = userMessage || (fileProcessed ? `ช่วยวิเคราะห์และแยกงานจากไฟล์ ${fileProcessed.originalName}` : 'สรุปงาน');
    const llmResponse = await callLLM(prompt, systemInstruction, fileProcessed);

    if (llmResponse) {
      const parsed = safeJsonParse(llmResponse);
      if (parsed) {
        const executedActions = [];

        if (Array.isArray(parsed.actions)) {
          for (const act of parsed.actions) {
            // Convert task_creation or non-standard plan into plan_proposal if plan_proposal is requested
            if (act.type === 'task_creation' || (!act.action && act.task)) {
              act.action = 'plan_proposal';
              act.plan = {
                name: act.task?.name || act.task?.project_name || 'งานที่สกัดจากเอกสาร/ภาพ',
                description: act.task?.description || act.task?.notes || 'สกัดจากเอกสาร/ภาพ',
                priority: act.task?.priority || 'Normal',
                subtasks: (act.task?.subtasks || []).map(s => typeof s === 'string' ? s : (s.description || s.action || s.title || ''))
              };
            }

            // A. Plan Proposal Action (Grill-me / Approval Card)
            if (act.action === 'plan_proposal' || act.type === 'plan_proposal') {
              act.action = 'plan_proposal';
              act.availableLists = flatLists;
              if (act.plan) {
                act.plan.defaultListId = activeListId || (flatLists[0]?.listId || '');
                if (fileProcessed) {
                  act.plan.fileInfo = fileProcessed.fileInfo;
                }
              }
              executedActions.push(act);
              continue;
            }

            // B. Direct Tool Execution
            if (skill.tools.includes(act.tool)) {
              try {
                if (act.tool === 'create_task' && (!act.args.list_id || act.args.list_id === 'default')) {
                  act.args.list_id = activeListId || (flatLists[0]?.listId || '');
                }
                const res = await executeTool(act.tool, act.args, fileProcessed ? fileProcessed.fileInfo : null);
                executedActions.push(res);
              } catch (toolErr) {
                console.error(`Tool ${act.tool} error:`, toolErr);
                executedActions.push({ success: false, tool: act.tool, error: toolErr.message });
              }
            }
          }
        }

        const replyText = typeof parsed.reply === 'string' 
          ? parsed.reply 
          : (parsed.reply?.text || 'วิเคราะห์ข้อมูลและร่างแผนงานเรียบร้อยแล้วครับ');

        return {
          skill,
          actions: executedActions,
          reply: replyText
        };
      }
    }
  } catch (err) {
    console.warn('LLM agent invocation failed, switching to smart rule-based execution:', err.message);
  }

  // Intelligent local fallback if LLM has no API key or errors
  return await fallbackRuleExecution(skill, userMessage, fileProcessed, activeListId);
}

module.exports = {
  SKILLS,
  routeSkill,
  processAgentQuery
};
