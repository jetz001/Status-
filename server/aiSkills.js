const { tools, executeTool, getDefaultListId } = require('./aiTools');
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
    tools: ['query_tasks']
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

  // Document extraction fallback
  if (fileProcessed) {
    const listId = activeListId || getDefaultListId();
    const docText = fileProcessed.text || '';
    const lines = docText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5 && (/^(\d+[\.\)]|[-*•])/.test(l) || /task|งาน|จัดทำ|ตรวจสอบ|ดำเนินการ/i.test(l)))
      .slice(0, 10);

    if (lines.length > 0) {
      for (const line of lines) {
        const cleanName = line.replace(/^(\d+[\.\)]|[-*•])\s*/, '').slice(0, 80);
        const res = await executeTool('create_task', {
          list_id: listId,
          name: cleanName,
          description: `แยกงานอัตโนมัติจากไฟล์: ${fileProcessed.originalName}`,
          priority: 'Normal'
        }, fileProcessed.fileInfo);
        actions.push(res);
      }
      reply = `วิเคราะห์ไฟล์ "${fileProcessed.originalName}" สำเร็จ และแยกเป็นงานให้เรียบร้อยแล้วจำนวน ${lines.length} งาน (พร้อมแนบไฟล์ต้นฉบับเข้าการ์ดงานแล้วครับ)`;
    } else {
      // Create single parent task for document
      const res = await executeTool('create_task', {
        list_id: listId,
        name: `ดำเนินการตามเอกสาร: ${fileProcessed.originalName}`,
        description: `สรุปเอกสาร:\n${docText.slice(0, 300)}...`,
        priority: 'Normal',
        subtasks: ['ตรวจสอบความถูกต้องของเอกสาร', 'แบ่งงานให้ผู้รับผิดชอบ', 'ติดตามผลการดำเนินงาน']
      }, fileProcessed.fileInfo);
      actions.push(res);
      reply = `สร้างงานหลักสำหรับเอกสาร "${fileProcessed.originalName}" พร้อม Checklist เริ่มต้นเรียบร้อยแล้วครับ`;
    }

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

  // System instructions for structured tool execution
  const systemInstruction = `
คุณคือ Status+ AI Agent ผู้ช่วยอัจฉริยะในการบริหารจัดการโปรเจกต์และงาน
สกิลปัจจุบันที่ถูกเลือก: "${skill.label}" (${skill.id})
เครื่องมือที่คุณมีสิทธิ์เรียกใช้: ${skill.tools.join(', ')}

บริบทโปรเจกต์ปัจจุบัน: ${context || 'ทั่วไป'} (Active List ID: ${activeListId || 'default'})

${fileProcessed ? `
มีไฟล์แนบเข้ามา: "${fileProcessed.originalName}" (${fileProcessed.type})
${fileProcessed.text ? `เนื้อหาในเอกสารที่สกัดได้:\n"""\n${fileProcessed.text.slice(0, 3000)}\n"""` : 'ไฟล์รูปภาพ (วิเคราะห์ภาพและองค์ประกอบของงาน)'}
หน้าที่ของคุณ: วิเคราะห์เนื้อหาในเอกสาร แล้วแยกเป็นงาน (create_task) หรือโปรเจกต์ (create_project) พร้อมระบุ Subtasks ที่เหมาะสม
` : ''}

หากผู้ใช้สั่งให้ เพิ่ม/สร้าง/แก้ไข/ลบ ข้อมูล หรือต้องการแยกงาน ให้ตอบกลับเป็น JSON ในรูปแบบนี้เท่านั้น:
{
  "actions": [
    {
      "tool": "create_task",
      "args": {
        "list_id": "${activeListId || ''}",
        "name": "ชื่องาน",
        "description": "รายละเอียดงาน",
        "priority": "Normal/High/Urgent/Low",
        "due_date": "YYYY-MM-DD หรือ null",
        "subtasks": ["ข้อย่อย 1", "ข้อย่อย 2"]
      }
    }
  ],
  "reply": "ข้อความสรุปการดำเนินงานที่สุภาพ เป็นมิตร และชัดเจนในภาษาไทย"
}

หากเป็นการปรึกษาหรือถามทั่วไปที่ไม่ต้องปรับแก้ข้อมูล:
{
  "actions": [],
  "reply": "คำตอบและคำแนะนำของคุณ..."
}
`;

  // Attempt LLM execution
  try {
    const prompt = userMessage || (fileProcessed ? `ช่วยวิเคราะห์และแยกงานจากไฟล์ ${fileProcessed.originalName}` : 'สรุปงาน');
    const llmResponse = await callLLM(prompt, systemInstruction);

    if (llmResponse) {
      // Parse JSON from LLM response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const executedActions = [];

        if (Array.isArray(parsed.actions)) {
          for (const act of parsed.actions) {
            if (skill.tools.includes(act.tool)) {
              try {
                const res = await executeTool(act.tool, act.args, fileProcessed ? fileProcessed.fileInfo : null);
                executedActions.push(res);
              } catch (toolErr) {
                console.error(`Tool ${act.tool} error:`, toolErr);
                executedActions.push({ success: false, tool: act.tool, error: toolErr.message });
              }
            }
          }
        }

        return {
          skill,
          actions: executedActions,
          reply: parsed.reply || 'ดำเนินการตามคำสั่งเรียบร้อยแล้วครับ'
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
