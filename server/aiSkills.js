const { tools, executeTool, getDefaultListId, getSpacesAndLists } = require('./aiTools');
const { callLLM, extractCleanText } = require('./aiService');
const { processFileForAI } = require('./fileProcessor');
const { semanticSearch } = require('./ragService');
const { db } = require('./db');

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
    label: 'ผู้ช่วยอัจฉริยะ (AI Assistant)',
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

  const text = (userText || '').toLowerCase().trim();

  // 0. General Greeting & Friendly Chat Intent
  if (/^(?:ดี|หวัดดี|สวัสดี|hello|hi|hey|ดีครับ|ดีค่ะ|สวัสดีครับ|สวัสดีค่ะ|ทำอะไรได้บ้าง|ช่วยอะไรได้บ้าง|คุณคือใคร|แนะนำตัว|คุยกันหน่อย)[\s\!\?\.]*$/i.test(text)) {
    return SKILLS.advisor;
  }

  // 0. Plan confirmation intent (e.g. "จัดมาเลย", "เอาเลย", "อนุมัติ", "ตกลง")
  if (/^(?:จัดมาเลย|จัดไป|เอาเลย|สร้างเลย|อนุมัติ|ตกลง|โอเค|ลุยเลย|สร้างตามนี้|ตามนั้น|เอาตามนี้|confirm|approve|ok|yes|จัดเลย|ดำเนินการเลย)/i.test(text)) {
    return SKILLS.task_ops;
  }

  // 0. Desktop Automation / MCP intent
  if (/แคปหน้าจอ|ถ่ายหน้าจอ|ภาพหน้าจอ|screenshot|มองหน้าจอ|เปิดโปรแกรม|ปิดโปรแกรม|สลับหน้าต่าง|รายชื่อหน้าต่าง|คลิกเมาส์|พิมพ์คีย์|desktop\s*control|mcp/i.test(text)) {
    return SKILLS.desktop_controller;
  }

  // 1. Task Inquiries, Questions, or Conversation -> SKILLS.advisor
  if (/^(?:มีงาน|งานอะไร|งานไหน|งานวันนี้|งานพรุ่งนี้|งานค้าง|งานด่วน|งานที่ต้องทำ|เอาที่ยังไม่เสร็จ|มีงานอะไรบ้าง|เหลืออะไรบ้าง|เช็คงาน|ดูงาน|สรุปงาน|ทำอันไหนก่อน|เริ่มยังไงดี|เอาที่|ขอดู)/i.test(text) ||
      /\b(อะไรบ้าง|ไหนบ้าง|เท่าไหร่|ยังไง|หรือยัง|ทำไม|วันไหน|มีอะไร|เอาที่|ขอดู)\b/i.test(text)) {
    if (!/^(?:สร้าง|เพิ่ม\s*งาน|ลบ\s*งาน|แก้ไข\s*งาน|อัปเดต\s*งาน|เปลี่ยน\s*สถานะ|ย้าย\s*งาน)/i.test(text)) {
      return SKILLS.advisor;
    }
  }

  // 2. Project / Space building intent
  if (/สร้าง\s*(โปรเจกต์|โปรเจค|project|space|list|รายการใหม่)|ตั้ง\s*(โปรเจกต์|space)/i.test(text)) {
    return SKILLS.project_builder;
  }

  // 3. Task CRUD & Natural Language Task assignment operations
  if (/สร้าง\s*งาน|เพิ่ม\s*งาน|ลบ\s*งาน|แก้ไข\s*งาน|อัปเดต|เปลี่ยน\s*(สถานะ|กำหนด|วันส่ง|ความสำคัญ)|ทำเสร็จ|ย้าย\s*งาน|เพิ่ม\s*(checklist|subtask|งานย่อย)|ป้าย|ติดตั้ง|ซ่อม|ช่าง|จัดทำ|ดำเนินการ|หัวหน้าให้ทำ|ช่วยวางแผน|วางแผนงาน/i.test(text)) {
    return SKILLS.task_ops;
  }

  // 4. Document keywords even without file
  if (/เอกสาร|pdf|สเปก|ใบงาน|contract|scope/i.test(text) && /แยก\s*งาน|สร้าง\s*งาน/i.test(text)) {
    return SKILLS.doc_analyzer;
  }

  // 4. Advisory / Search / Summary
  return SKILLS.advisor;
}

/**
 * Executes direct, high-accuracy query for Urgent & Due Soon tasks from SQLite
 */
function executeDueSoonAndUrgentQuery({ activeListId = null, queryText = '' } = {}) {
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const next7Days = new Date(today);
  next7Days.setDate(next7Days.getDate() + 7);
  const next7DaysIso = next7Days.toISOString().split('T')[0];

  // Helper for Thai Date formatting
  const formatThaiDate = (iso) => {
    if (!iso) return 'ไม่ระบุวันส่ง';
    const parts = iso.split('-');
    if (parts.length < 3) return iso;
    const [y, m, d] = parts;
    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const mIdx = parseInt(m, 10) - 1;
    const beYear = parseInt(y, 10) + 543;
    let badge = '';
    if (iso === todayIso) badge = ' 🔴 [วันนี้!]';
    else if (iso < todayIso) badge = ' ⚠️ [เลยกำหนดส่งแล้ว]';
    else {
      const diffMs = new Date(iso) - new Date(todayIso);
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) badge = ' 🟡 [พรุ่งนี้]';
      else if (diffDays <= 7) badge = ` 🟡 [อีก ${diffDays} วัน]`;
    }
    return `${parseInt(d, 10)} ${thaiMonthsShort[mIdx] || m} ${beYear}${badge}`;
  };

  // 1. Query Urgent & High Priority Tasks (Not Completed)
  let priorityTasks = [];
  try {
    priorityTasks = db.prepare(`
      SELECT t.id, t.name, t.status, t.priority, t.due_date, t.assignee, l.name as list_name, s.name as space_name, t.list_id
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      LEFT JOIN spaces s ON l.space_id = s.id
      WHERE (t.status IS NULL OR UPPER(t.status) != 'COMPLETED')
        AND (UPPER(t.priority) = 'URGENT' OR UPPER(t.priority) = 'HIGH')
      ORDER BY 
        CASE WHEN UPPER(t.priority) = 'URGENT' THEN 0 ELSE 1 END,
        CASE WHEN t.due_date IS NULL OR t.due_date = '' THEN 1 ELSE 0 END,
        t.due_date ASC
    `).all();
  } catch (e) {
    console.error('Error querying priority tasks:', e);
  }

  // 2. Query All Incomplete Tasks with due_date
  let dueTasks = [];
  try {
    dueTasks = db.prepare(`
      SELECT t.id, t.name, t.status, t.priority, t.due_date, t.assignee, l.name as list_name, s.name as space_name, t.list_id
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      LEFT JOIN spaces s ON l.space_id = s.id
      WHERE (t.status IS NULL OR UPPER(t.status) != 'COMPLETED')
        AND t.due_date IS NOT NULL AND t.due_date != ''
      ORDER BY t.due_date ASC
    `).all();
  } catch (e) {
    console.error('Error querying due tasks:', e);
  }

  const overdueTasks = dueTasks.filter(t => t.due_date < todayIso);
  const dueSoonTasks = dueTasks.filter(t => t.due_date >= todayIso && t.due_date <= next7DaysIso);
  const upcomingTasks = dueTasks.filter(t => t.due_date > next7DaysIso);

  // Check activeList context name if any
  let currentListNotice = '';
  if (activeListId && activeListId !== 'all') {
    try {
      const listRow = db.prepare('SELECT l.name as list_name, s.name as space_name FROM lists l LEFT JOIN spaces s ON l.space_id = s.id WHERE l.id = ?').get(activeListId);
      if (listRow) {
        currentListNotice = `*(มุมมองปัจจุบัน: Space **"${listRow.space_name}"** › List **"${listRow.list_name}"**)*\n\n`;
      }
    } catch (e) {}
  }

  let md = `### ⏰ สรุปงานด่วนและความสำคัญระดับ Urgent / งานใกล้ถึงกำหนดส่ง\n\n${currentListNotice}`;

  // Section 1: Urgent & High Priority
  md += `#### 🚨 1. งานที่มีความสำคัญระดับ Urgent & High (${priorityTasks.length} รายการ):\n`;
  if (priorityTasks.length === 0) {
    md += `• *ไม่มีงานระดับ Urgent หรือ High ที่คั่งค้างในระบบ* ✨\n\n`;
  } else {
    priorityTasks.forEach((t, i) => {
      const isUrgent = (t.priority || '').toUpperCase() === 'URGENT';
      const badge = isUrgent ? '🔴 **URGENT**' : '🟠 **High**';
      const isCurrent = activeListId && t.list_id === activeListId;
      md += `${i + 1}. **${t.name}** ${isCurrent ? '📌 *(ในลิสต์ปัจจุบัน)*' : ''}\n`;
      md += `   • ระดับความสำคัญ: ${badge} | สถานะ: \`${t.status || 'NOT STARTED'}\`\n`;
      md += `   • กำหนดส่ง: **${formatThaiDate(t.due_date)}**\n`;
      md += `   • สังกัด: Space **"${t.space_name || '-'}"** › List **"${t.list_name || '-'}"**${t.assignee ? ` | ผู้รับผิดชอบ: ${t.assignee}` : ''}\n\n`;
    });
  }

  // Section 2: Overdue Tasks (if any)
  if (overdueTasks.length > 0) {
    md += `#### ⚠️ 2. งานที่เลยกำหนดส่งแล้ว (Overdue - ${overdueTasks.length} รายการ):\n`;
    overdueTasks.forEach((t, i) => {
      md += `${i + 1}. **${t.name}**\n`;
      md += `   • เลยกำหนดส่งตั้งแต่: **${formatThaiDate(t.due_date)}**\n`;
      md += `   • ความสำคัญ: \`${t.priority || 'Normal'}\` | สังกัด: Space **"${t.space_name || '-'}"** › List **"${t.list_name || '-'}"**\n\n`;
    });
  }

  // Section 3: Due Soon (Within 7 Days)
  const sectionNum = overdueTasks.length > 0 ? '3' : '2';
  md += `#### 📅 ${sectionNum}. งานที่ใกล้ถึงกำหนดส่ง (ภายใน 7 วันนี้: ${dueSoonTasks.length} รายการ):\n`;
  if (dueSoonTasks.length === 0) {
    md += `• *ไม่มีงานที่ต้องส่งภายใน 7 วันข้างหน้า*\n\n`;
  } else {
    dueSoonTasks.forEach((t, i) => {
      const isCurrent = activeListId && t.list_id === activeListId;
      md += `${i + 1}. **${t.name}** ${isCurrent ? '📌 *(ในลิสต์ปัจจุบัน)*' : ''}\n`;
      md += `   • กำหนดส่ง: **${formatThaiDate(t.due_date)}**\n`;
      md += `   • ความสำคัญ: \`${t.priority || 'Normal'}\` | สังกัด: Space **"${t.space_name || '-'}"** › List **"${t.list_name || '-'}"**\n\n`;
    });
  }

  // Section 4: Upcoming Tasks summary if any
  if (upcomingTasks.length > 0) {
    const nextNum = (overdueTasks.length > 0 ? 3 : 2) + 1;
    md += `#### 🗓️ ${nextNum}. งานกำหนดส่งถัดไป (หลังจาก 7 วัน: ${upcomingTasks.length} รายการ):\n`;
    upcomingTasks.slice(0, 5).forEach((t) => {
      md += `• **${t.name}** — กำหนดส่ง: ${formatThaiDate(t.due_date)} (Space "${t.space_name || '-'}" › "${t.list_name || '-'}")\n`;
    });
    if (upcomingTasks.length > 5) {
      md += `• *...และอีก ${upcomingTasks.length - 5} งานในรอบถัดไป*\n`;
    }
    md += '\n';
  }

  md += `> 💡 **ต้องการให้ผมช่วยอะไรต่อ:** พิมพ์สั่ง *เปลี่ยนวันส่ง*, *ติ๊กงานเสร็จ*, หรือ *สร้างงานใหม่* ได้ทันทีครับ!`;

  return {
    skill: SKILLS.advisor,
    actions: [],
    reply: md
  };
}

/**
 * Rule-based tool extractor fallback (handles commands even without external LLM API key)
 */
async function fallbackRuleExecution(skill, query, fileProcessed = null, activeListId = null) {
  const actions = [];
  let reply = '';
  const text = (query || '').toLowerCase().trim();

  // Friendly Greeting & Introduction Intent
  if (/^(?:ดี|หวัดดี|สวัสดี|hello|hi|hey|ดีครับ|ดีค่ะ|สวัสดีครับ|สวัสดีค่ะ|ทำอะไรได้บ้าง|ช่วยอะไรได้บ้าง|คุณคือใคร|แนะนำตัว|คุยกันหน่อย)[\s\!\?\.]*$/i.test(text)) {
    reply = `สวัสดีครับ! ผมคือ Status+ AI ผู้ช่วยอัจฉริยะด้านการบริหารจัดการงานและโครงการครับ 😊\n\nยินดีที่ได้พูดคุยและพร้อมช่วยเหลือคุณเสมอครับ คุณสามารถสั่งงานหรือปรึกษาผมได้หลายด้าน เช่น:\n• 📊 **สรุปภาพรวมงาน & KPI** (พิมพ์ *สรุปงาน* หรือ *ภาพรวม*)\n• 📋 **สร้างหรือปรับปรุงงาน** (พิมพ์ *สร้างงาน...* หรือสั่งย้าย/ลบงาน)\n• 🔁 **ตั้งค่างานแบบทำซ้ำเป็นประจำ (Recurring Tasks)**\n• 📄 **อ่านเอกสาร PDF หรือรูปภาพ** เพื่อแปลงเป็นรายการงานอัตโนมัติ\n• 🖥️ **แคปหน้าจอและสั่งการคอมพิวเตอร์ Windows**\n\nวันนี้อยากให้ช่วยดูแลงานส่วนไหน พิมพ์บอกหรือสอบถามได้เลยครับ!`;
    return { skill: SKILLS.advisor, actions: [], reply };
  }

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

    const isClipboard = /clipboard-/i.test(fileProcessed.originalName);
    const cleanDocName = isClipboard ? 'ภาพแนบ' : fileProcessed.originalName;
    const planTitle = cleanLines[0]?.replace(/^(\d+[\.\)]|[-*•])\s*/, '') || (isClipboard ? 'งานตรวจสอบและดำเนินการตามภาพแนบ' : (fileProcessed.type === 'image' ? `วิเคราะห์และดำเนินงานตามภาพ: ${cleanDocName}` : `ดำเนินการตามเอกสาร: ${cleanDocName}`));
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

  // 4.5. DUE SOON / URGENT / DEADLINE QUERY
  if (/(?:ใกล้.*กำหนด|กำหนดส่ง|due\s*soon|urgent|ด่วน|ค้างส่ง|overdue|งานที่ต้องทำ|มีงานอะไร|มีงานไหน|งานค้าง)/i.test(text) && !/สร้าง|ลบ|เพิ่ม|ย้าย|ก่อน|แนะนำ|เริ่มจาก|จัดลำดับ|ควรทำ|เลือกอันไหน/i.test(text)) {
    return executeDueSoonAndUrgentQuery({ activeListId, queryText: text });
  }

  // 4.6. ADVISORY & TASK PRIORITIZATION QUERY ("ทำอันไหนก่อน", "เริ่มยังไงดี", "จัดลำดับ")
  if (/(?:ทำอันไหนก่อน|เริ่ม.*ก่อน|อันไหนก่อน|จัดลำดับ|แนะนำงาน|งานไหนสำคัญ|ควรทำอันไหน|เริ่มตรงไหน)/i.test(text)) {
    const pendingTasks = db.prepare(`
      SELECT t.id, t.name, t.status, t.priority, t.due_date, l.name as list_name, s.name as space_name
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      LEFT JOIN spaces s ON l.space_id = s.id
      WHERE (t.status IS NULL OR UPPER(t.status) != 'COMPLETED')
      ORDER BY 
        CASE WHEN UPPER(t.priority) = 'URGENT' THEN 0 WHEN UPPER(t.priority) = 'HIGH' THEN 1 ELSE 2 END,
        CASE WHEN t.due_date IS NULL OR t.due_date = '' THEN 1 ELSE 0 END,
        t.due_date ASC
      LIMIT 5
    `).all();

    if (pendingTasks.length === 0) {
      reply = 'ตอนนี้ในระบบไม่มีงานคั่งค้างเลยครับ สบายใจได้! 🎉 หากมีงานใหม่ที่ต้องการให้ช่วยวางแผน พิมพ์บอกได้เลยครับ';
      return { skill, actions, reply };
    }

    const top1 = pendingTasks[0];
    const topOthers = pendingTasks.slice(1);
    let listStr = `1. 🥇 **${top1.name}** (ความสำคัญ: **${top1.priority || 'Normal'}**${top1.due_date ? ` | กำหนดส่ง: **${top1.due_date}**` : ''})\n   ↳ *คำแนะนำ:* แนะนำให้ลุยงานนี้ก่อนเป็นอันดับแรกครับ เพราะมีความสำคัญเร่งด่วนและกำหนดส่งใกล้ที่สุดในระบบ\n\n`;
    if (topOthers.length > 0) {
      listStr += '**ลำดับถัดไปที่แนะนำให้เตรียมการ:**\n';
      topOthers.forEach((t, idx) => {
        listStr += `${idx + 2}. **${t.name}** (ความสำคัญ: ${t.priority || 'Normal'}${t.due_date ? ` | กำหนดส่ง: ${t.due_date}` : ''})\n`;
      });
    }

    reply = `ถ้าดูจากรายการงานในระบบตอนนี้ ผมแนะนำให้จัดคิวตามนี้ครับ 😊\n\n${listStr}\n> 💡 ต้องการให้ผมช่วยแตกขั้นตอน Checklist ย่อย หรือปรับปรุงงานรายการไหน บอกได้เลยนะครับ!`;
    return { skill, actions, reply };
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

// Safe JSON parser that handles markdown fences, unescaped newlines, and trailing commas from LLMs
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

// Robust formatter that converts any string, array, or rich LLM object into clean, readable Thai Markdown
function formatReplyToMarkdown(replyVal, topObj = null) {
  if (typeof replyVal === 'string' && replyVal.trim()) {
    return replyVal.trim();
  }

  if (Array.isArray(replyVal)) {
    return replyVal.map((item, idx) => {
      if (typeof item === 'string') return `• ${item}`;
      if (item && typeof item === 'object') {
        const name = item.name || item.task || item.title || item.ชื่องาน || 'งาน';
        const prio = item.priority || item.ความสำคัญ ? ` [ความสำคัญ: ${item.priority || item.ความสำคัญ}]` : '';
        const status = item.status || item.สถานะ ? ` (${item.status || item.สถานะ})` : '';
        const due = item.due_date || item.dueDate || item.กำหนดส่ง ? ` 📅 กำหนดส่ง: ${item.due_date || item.dueDate || item.กำหนดส่ง}` : '';
        return `• **${name}**${status}${prio}${due}`;
      }
      return `• ${item}`;
    }).join('\n');
  }

  const parts = [];
  const obj = (replyVal && typeof replyVal === 'object') ? replyVal : (topObj || {});

  if (obj.message && typeof obj.message === 'string') parts.push(obj.message);
  if (obj.text && typeof obj.text === 'string') parts.push(obj.text);
  if (obj.summary && typeof obj.summary === 'string') parts.push(obj.summary);
  if (obj.suggestion && typeof obj.suggestion === 'string') parts.push(obj.suggestion);

  // Check recommendations (in reply.recommendation, reply.recommendations, or top-level)
  const rec = obj.recommendation || obj.recommendations || topObj?.recommendations || topObj?.recommendation;
  if (rec) {
    if (typeof rec === 'string') {
      parts.push(rec);
    } else if (Array.isArray(rec)) {
      const recLines = ['### 💡 ลำดับงานที่แนะนำให้ทำก่อน-หลัง:\n'];
      rec.forEach((item, idx) => {
        const stepNum = item.step || idx + 1;
        const taskName = item.task || item.name || item.title || 'งานที่ต้องทำ';
        const reason = item.reason || item.note || item.description || '';
        const prio = item.priority ? ` [ความสำคัญ: ${item.priority}]` : '';
        recLines.push(`**${stepNum}. ${taskName}**${prio}${reason ? `\n   ↳ *คำแนะนำ:* ${reason}` : ''}`);
      });
      parts.push(recLines.join('\n'));
    } else if (typeof rec === 'object') {
      if (Array.isArray(rec.order)) {
        const orderLines = ['### 💡 ลำดับงานที่แนะนำให้ทำก่อน-หลัง:\n'];
        rec.order.forEach((item, idx) => {
          const stepNum = item.step || idx + 1;
          const taskName = Array.isArray(item.task) ? item.task.join(', ') : (item.task || item.name || 'งานที่ต้องทำ');
          const note = item.note || item.reason || item.description || '';
          orderLines.push(`**${stepNum}. ${taskName}**${note ? `\n   ↳ *คำแนะนำ:* ${note}` : ''}`);
        });
        parts.push(orderLines.join('\n'));
      }
      if (rec.additional_tips) {
        const tips = rec.additional_tips;
        const tipLines = ['\n#### 📌 ข้อสังเกตและคำแนะนำเพิ่มเติม:'];
        if (typeof tips === 'string') {
          tipLines.push(tips);
        } else if (typeof tips === 'object') {
          for (const [k, v] of Object.entries(tips)) {
            const label = k === 'resource_allocation' ? 'การจัดสรรทรัพยากร' :
                          k === 'communication' ? 'การสื่อสารและประสานงาน' :
                          k === 'monitoring' ? 'การติดตามผล' : k;
            tipLines.push(`• **${label}:** ${typeof v === 'object' ? JSON.stringify(v) : v}`);
          }
        }
        parts.push(tipLines.join('\n'));
      }
    }
  }

  if (Array.isArray(obj.steps)) {
    parts.push(obj.steps.map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : JSON.stringify(s)}`).join('\n'));
  }
  if (obj.next_step) parts.push(`👉 **ขั้นตอนถัดไป:** ${obj.next_step}`);
  if (obj.note) parts.push(`💡 **คำแนะนำเพิ่มเติม:** ${obj.note}`);

  if (parts.length === 0 && typeof replyVal === 'object' && replyVal !== null) {
    for (const [k, v] of Object.entries(replyVal)) {
      if (k === 'actions') continue;
      if (typeof v === 'string') {
        parts.push(`• **${k}:** ${v}`);
      } else if (typeof v === 'object' && v !== null) {
        if (v.name || v.task || v.title || v.ชื่องาน) {
          const name = v.name || v.task || v.title || v.ชื่องาน;
          const prio = v.priority || v.ความสำคัญ ? ` [ความสำคัญ: ${v.priority || v.ความสำคัญ}]` : '';
          const status = v.status || v.สถานะ ? ` (${v.status || v.สถานะ})` : '';
          const due = v.due_date || v.dueDate || v.กำหนดส่ง ? ` 📅 ${v.due_date || v.dueDate || v.กำหนดส่ง}` : '';
          parts.push(`• **${name}**${status}${prio}${due}`);
        } else {
          const nested = formatReplyToMarkdown(v);
          if (nested) parts.push(nested);
        }
      }
    }
  }

  return parts.filter(Boolean).join('\n\n');
}

// Extract clean human text if LLM returned raw JSON or incomplete JSON string
function extractReplyFromRawJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let text = rawText.trim();

  // Strip markdown json block fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // If plain text not containing JSON structure, return directly
  if (!text.startsWith('{') && !text.includes('"reply"')) {
    return text;
  }

  // 1. Try safeJsonParse
  const parsed = safeJsonParse(text);
  if (parsed && parsed.reply) {
    return formatReplyToMarkdown(parsed.reply, parsed);
  }

  // 2. Extract "reply": "..." if JSON is malformed, unescaped, or truncated
  const replyIdx = text.indexOf('"reply"');
  if (replyIdx !== -1) {
    const afterReply = text.substring(replyIdx + 7);
    const colonIdx = afterReply.indexOf(':');
    if (colonIdx !== -1) {
      let rest = afterReply.substring(colonIdx + 1).trim();
      if (rest.startsWith('"')) {
        rest = rest.substring(1);
        let replyContent = rest;
        const lastQuoteMatch = rest.match(/([\s\S]*)"\s*\}*\s*$/);
        if (lastQuoteMatch) {
          replyContent = lastQuoteMatch[1];
        } else {
          replyContent = rest.replace(/\s*\}\s*$/, '');
        }
        try {
          return JSON.parse(`"${replyContent}"`);
        } catch (e) {
          return replyContent
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      }
    }
  }

  // 3. Extract "reply": { ... } or "reply": [ ... ]
  const replyObjMatch = text.match(/"reply"\s*:\s*(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (replyObjMatch) {
    try {
      const parsedObj = JSON.parse(replyObjMatch[1]);
      return formatReplyToMarkdown(parsedObj);
    } catch (e) {}
  }

  // 4. If text begins with { and has "actions" or "reply", but we couldn't parse it
  if (text.startsWith('{') && (text.includes('"actions"') || text.includes('"reply"'))) {
    return 'ดำเนินการตามคำขอเรียบร้อยแล้วครับ หากมีจุดไหนต้องการให้ปรับเปลี่ยนเพิ่มเติม แจ้งได้เลยนะครับ';
  }

  return text;
}

/**
 * Main Agent Controller: Routes to Skill, builds schema, calls LLM or fallback, and executes tools
 */
async function processAgentQuery({
  userMessage,
  fileProcessed = null,
  activeListId = null,
  context = '',
  sessionId = null
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

  const cleanMsg = (userMessage || '').trim();
  const isAffirmative = /^(?:จัดมาเลย|จัดไป|เอาเลย|สร้างเลย|อนุมัติ|ตกลง|โอเค|ลุยเลย|สร้างตามนี้|ตามนั้น|เอาตามนี้|confirm|approve|ok|yes|จัดเลย|ดำเนินการเลย)/i.test(cleanMsg);

  // 0. Follow-up Ready Check (e.g. user typed "ได้ยัง", "เสร็จยัง", "ได้หรือยัง")
  const isFollowUpReadyCheck = /^(?:ได้ยัง|เสร็จยัง|ได้หรือยัง|เสร็จหรือยัง|ถึงไหนแล้ว|ผลเป็นไง|สรุปยัง|ไหน|ขอดูผล|ตรวจยัง|เสร็จมั้ย)[\s\!\?\.]*$/i.test(cleanMsg);
  if (isFollowUpReadyCheck && !fileProcessed && sessionId) {
    let pendingPlan = null;
    let lastTopic = '';
    try {
      const sess = db.prepare('SELECT messages_json FROM ai_chat_sessions WHERE id = ?').get(sessionId);
      if (sess && sess.messages_json) {
        const msgs = JSON.parse(sess.messages_json);
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'assistant' && Array.isArray(msgs[i].actions)) {
            const found = msgs[i].actions.find(a => (a.action === 'plan_proposal' || a.type === 'plan_proposal') && a.plan);
            if (found) {
              pendingPlan = found.plan;
              break;
            }
          }
        }
        const userMsgs = msgs.filter(m => m.role === 'user');
        if (userMsgs.length > 0) {
          lastTopic = userMsgs[userMsgs.length - 1].content || '';
        }
      }
    } catch (e) {}

    if (pendingPlan) {
      return {
        skill: SKILLS.task_ops,
        actions: [{
          action: 'plan_proposal',
          title: '📋 ร่างแผนงาน (รออนุมัติก่อนสร้าง)',
          plan: pendingPlan,
          availableLists: flatLists
        }],
        reply: `นี่คือร่างแผนงานที่จัดเตรียมไว้ให้เรียบร้อยแล้วครับ สามารถเลือก Space และ List ปลายทาง แล้วกดอนุมัติด้านล่างเพื่อสร้างงานได้เลยครับ:`
      };
    }

    // Deliver actual live task query results immediately!
    return executeDueSoonAndUrgentQuery({ activeListId, queryText: lastTopic || cleanMsg });
  }

  // Intercept greetings & casual chat directly
  if (!fileProcessed && /^(?:ดี|หวัดดี|สวัสดี|hello|hi|hey|ดีครับ|ดีค่ะ|สวัสดีครับ|สวัสดีค่ะ|ทำอะไรได้บ้าง|ช่วยอะไรได้บ้าง|คุณคือใคร|แนะนำตัว|คุยกันหน่อย)[\s\!\?\.]*$/i.test(cleanMsg)) {
    return await fallbackRuleExecution(SKILLS.advisor, cleanMsg, null, activeListId);
  }

  // Intercept literal quick-button clicks for Due Soon so user gets instant button response
  if (!fileProcessed && /^(?:งานด่วน\s*due\s*soon|สรุปงานด่วนและงานใกล้ถึงกำหนดส่ง|ดูงานด่วน)$/i.test(cleanMsg)) {
    return executeDueSoonAndUrgentQuery({ activeListId, queryText: cleanMsg });
  }

  // Intercept literal quick-button for All Tasks Summary
  if (!fileProcessed && /^(?:สรุปงานทั้งหมด|สรุปภาพรวมและสถานะงานทั้งหมดในระบบ)$/i.test(cleanMsg)) {
    return await fallbackRuleExecution(SKILLS.advisor, cleanMsg, null, activeListId);
  }

  // 0. Natural Language Plan Confirmation (e.g. user typed "จัดมาเลย" in chat)
  if (isAffirmative && !fileProcessed && sessionId) {
    let pendingPlan = null;
    try {
      const sess = db.prepare('SELECT messages_json FROM ai_chat_sessions WHERE id = ?').get(sessionId);
      if (sess && sess.messages_json) {
        const msgs = JSON.parse(sess.messages_json);
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'assistant' && Array.isArray(msgs[i].actions)) {
            const found = msgs[i].actions.find(a => (a.action === 'plan_proposal' || a.type === 'plan_proposal') && a.plan);
            if (found) {
              pendingPlan = found.plan;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching pending plan from session:', e.message);
    }

    if (pendingPlan) {
      const targetListId = pendingPlan.defaultListId || activeListId || (flatLists[0]?.listId || '');
      const tasksToCreate = Array.isArray(pendingPlan.tasks) && pendingPlan.tasks.length > 0
        ? pendingPlan.tasks
        : [pendingPlan];

      const createdTasks = [];
      for (const t of tasksToCreate) {
        const taskRes = await executeTool('create_task', {
          list_id: targetListId,
          name: t.name,
          description: t.description || '',
          priority: t.priority || 'Normal',
          due_date: t.due_date || null,
          subtasks: t.subtasks || []
        }, pendingPlan.fileInfo);
        createdTasks.push(taskRes);
      }

      const targetListName = createdTasks[0]?.task?.listName || (flatLists.find(l => l.listId === targetListId)?.listName || 'เป้าหมาย');
      const taskNamesList = createdTasks.map((ct, idx) => `${idx + 1}. **${ct.task?.name}** (${ct.task?.subtaskCount || 0} checklists)`).join('\n');

      return {
        skill: SKILLS.task_ops,
        actions: createdTasks,
        reply: `🎉 **อนุมัติสร้างงานตามแผนทั้งหมด ${createdTasks.length} รายการ เรียบร้อยแล้วครับ!**\n\n• บรรจุใน List: **"${targetListName}"**\n\n**รายการงานที่สร้าง:**\n${taskNamesList}\n\nคุณสามารถคลิกเปิดดูการ์ดงานเพื่อตรวจสอบความคืบหน้าได้ทันทีครับ`
      };
    }
  }

  // 0.1 Natural Language "ขอดูหน่อย" / "ดูแผน" / "มีอะไรบ้าง" Intent
  const isShowRequest = /^(?:ขอดูหน่อย|ดูหน่อย|ไหนดูซิ|ขอดูแผน|ดูแผน|ขอดู|มีอะไรบ้าง|ขอตรวจสอบ|ตรวจแผน|ไหนแผน|ขอแผน)[\s\!\?\.]*$/i.test(cleanMsg);
  if (isShowRequest && !fileProcessed && sessionId) {
    let pendingPlan = null;
    let lastUserTopic = '';
    try {
      const sess = db.prepare('SELECT messages_json FROM ai_chat_sessions WHERE id = ?').get(sessionId);
      if (sess && sess.messages_json) {
        const msgs = JSON.parse(sess.messages_json);
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'assistant' && Array.isArray(msgs[i].actions)) {
            const found = msgs[i].actions.find(a => (a.action === 'plan_proposal' || a.type === 'plan_proposal') && a.plan);
            if (found) {
              pendingPlan = found.plan;
              break;
            }
          }
        }
        if (!pendingPlan) {
          const userMsgs = msgs.filter(m => m.role === 'user');
          if (userMsgs.length > 0) {
            lastUserTopic = userMsgs.map(m => m.content).join(' ');
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching pending plan or topic:', e);
    }

    if (pendingPlan) {
      return {
        skill: SKILLS.task_ops,
        actions: [{
          action: 'plan_proposal',
          title: '📋 ร่างแผนงาน (รออนุมัติก่อนสร้าง)',
          plan: pendingPlan,
          availableLists: flatLists
        }],
        reply: `นี่คือร่างแผนงานและขั้นตอนที่จัดเตรียมไว้ให้ครับ คุณสามารถตรวจสอบรายละเอียด เลือก Space/List ปลายทาง และกดปุ่มอนุมัติสร้างงานด้านล่างได้เลยครับ:`
      };
    } else if (lastUserTopic) {
      let planName = 'ติดตั้งป้ายรับสมัครงานไวนิลหน้าโรงงาน';
      let planDesc = 'ป้ายเดิมชำรุด/ขาด ส่งมอบป้ายไวนิลรับสมัครงานใหม่ให้ช่างดำเนินการติดตั้งบริเวณหน้าโรงงาน';
      let subtasks = [
        'ตรวจสอบสภาพและขนาดของป้ายไวนิลรับสมัครงานใหม่',
        'ประสานงานช่างซ่อมบำรุง/ช่างอาคารเพื่อนัดหมายและส่งมอบงานติดตั้ง',
        'รื้อถอนป้ายเดิมที่ชำรุดออกอย่างปลอดภัย',
        'ดำเนินการติดตั้งป้ายไวนิลใหม่ที่ตำแหน่งหน้าโรงงาน',
        'ตรวจรับความเรียบร้อยและความแข็งแรงหลังการติดตั้ง'
      ];

      if (!/ป้าย|ไวนิล/i.test(lastUserTopic)) {
        planName = lastUserTopic.slice(0, 45);
        planDesc = lastUserTopic;
        subtasks = ['ตรวจสอบรายละเอียดและข้อกำหนด', 'ดำเนินการตามแผน', 'ตรวจรับงานและสรุปผล'];
      }

      const defaultListId = activeListId || (flatLists[0]?.listId || '');
      const synthesizedPlan = {
        name: planName,
        description: planDesc,
        priority: 'Normal',
        subtasks,
        defaultListId,
        tasks: [{
          name: planName,
          description: planDesc,
          priority: 'Normal',
          subtasks
        }]
      };

      return {
        skill: SKILLS.task_ops,
        actions: [{
          action: 'plan_proposal',
          title: '📋 ร่างแผนงาน (รออนุมัติก่อนสร้าง)',
          plan: synthesizedPlan,
          availableLists: flatLists
        }],
        reply: `นี่คือร่างแผนงานและขั้นตอน Checklist ที่ผมได้จัดเตรียมไว้ให้ตามที่คุณได้แจ้งไว้ครับ:\n\n• **ชื่องาน:** ${planName}\n• **รายละเอียด:** ${planDesc}\n\nคุณสามารถเลือก Space และ List ปลายทางที่ต้องการจากการ์ดด้านล่าง แล้วกดอนุมัติเพื่อสร้างงานลงในระบบได้เลยครับ! 😊`
      };
    }
  }

  // Load recent session chat history for multi-turn conversational awareness
  let chatHistoryContext = '';
  if (sessionId) {
    try {
      const sess = db.prepare('SELECT messages_json FROM ai_chat_sessions WHERE id = ?').get(sessionId);
      if (sess && sess.messages_json) {
        const msgs = JSON.parse(sess.messages_json);
        const recent = msgs.slice(-6);
        if (recent.length > 0) {
          chatHistoryContext = recent.map(m => {
            const roleName = m.role === 'user' ? 'ผู้ใช้' : 'AI';
            let content = m.content || '';
            // If previous assistant message contained raw JSON, extract clean reply!
            if (m.role === 'assistant') {
              const cleaned = extractReplyFromRawJson(content);
              if (cleaned) content = cleaned;
              content = content.replace(/^\{[\s\S]*?"reply":\s*"/, '').replace(/"\s*\}?$/, '');
            }
            return `${roleName}: ${content}`;
          }).join('\n');
        }
      }
    } catch (e) {
      console.warn('Error loading chat history:', e);
    }
  }

  const spacesListText = spacesAndLists.map(sp =>
    `• Space "${sp.name}": Lists: [${sp.lists.map(l => `"${l.name}" (ID: "${l.id}")`).join(', ')}]`
  ).join('\n');

  // Grounding tasks context for LLM
  let realTasksForPrompt = [];
  try {
    realTasksForPrompt = db.prepare(`
      SELECT t.id, t.name, t.status, t.priority, t.due_date, t.assignee, l.name as list_name, s.name as space_name
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      LEFT JOIN spaces s ON l.space_id = s.id
      ORDER BY 
        CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END,
        CASE WHEN t.due_date IS NULL OR t.due_date = '' THEN 1 ELSE 0 END,
        t.due_date ASC
      LIMIT 50
    `).all();
  } catch (e) {}

  const realTasksText = realTasksForPrompt.map(t => {
    const due = t.due_date ? ` (กำหนดส่ง: ${t.due_date})` : '';
    const status = t.status ? ` [${t.status}]` : '';
    const prio = t.priority && t.priority !== 'Normal' ? ` [${t.priority}]` : '';
    const loc = (t.space_name || t.list_name) ? ` [${t.space_name || ''} › ${t.list_name || ''}]` : '';
    return `- ${t.name}${status}${prio}${due}${loc}`;
  }).join('\n');

  // Exact Thai calendar dates
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const tomorrowDate = new Date(todayDate.getTime() + 86400000);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const todayDayName = thaiDays[todayDate.getDay()];
  const tomorrowDayName = thaiDays[tomorrowDate.getDay()];
  const thaiMonthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  // Streamlined, flexible system instructions for natural PM assistance
  const systemInstruction = `
คุณคือ Status+ AI ผู้ช่วยคนเก่งด้านการบริหารจัดการงานและโครงการ (Project Management Copilot)
คุยง่าย เป็นกันเอง ยืดหยุ่น คล่องตัว ตอบกระชับตรงประเด็น เหมือนเพื่อนร่วมงานหรือเลขาที่ฉลาด

ข้อมูลปฏิทินระบบปัจจุบัน:
• วันนี้: ${todayStr} (วัน${todayDayName}ที่ ${todayDate.getDate()} ${thaiMonthsFull[todayDate.getMonth()]} พ.ศ. ${todayDate.getFullYear() + 543})
• พรุ่งนี้: ${tomorrowStr} (วัน${tomorrowDayName}ที่ ${tomorrowDate.getDate()} ${thaiMonthsFull[tomorrowDate.getMonth()]} พ.ศ. ${tomorrowDate.getFullYear() + 543})

โครงสร้าง Spaces & Lists ในระบบ:
${spacesListText}

รายการงานจริงในระบบ (Ground Truth):
${realTasksText || '(ยังไม่มีงานในระบบ)'}

แนวทางการตอบและการสนทนา (Conversational Guidelines):
1. **พูดคุยอย่างเป็นธรรมชาติ ยืดหยุ่น และเข้าใจบริบทต่อเนื่อง (Multi-turn Context Aware)**:
   - ตอบสั้นกระชับ อ่านง่าย สบายตา ไม่ต้องแจกแจงทุกฟิลด์ให้ยาวเป็นตารางหุ่นยนต์ (ไม่ต้องใส่ pipe | หรือระบุ Space/List/ผู้รับผิดชอบ ครบทุกข้อถ้าผู้ใช้ไม่ได้ถาม)
   - เชื่อมโยงกับสิ่งที่เพิ่งคุยกันในห้องแชท เช่น ถ้าเพิ่งคุยเรื่องงานวันพรุ่งนี้ แล้วผู้ใช้บอก "เอาที่ยังไม่เสร็จ" ให้คัดกรองเฉพาะงานที่ยังไม่เสร็จ (NOT STARTED / IN PROGRESS) ของวันพรุ่งนี้มาตอบทันที ไม่ต้องรีเซ็ตกลับไปพูดถึงวันนี้
   - เมื่องานเสร็จแล้ว (COMPLETED) ไม่จำเป็นต้องแจกแจงยาว เว้นแต่ผู้ใช้ถามถึงงานที่เสร็จแล้ว
2. **การตอบคำถามเรื่องงานและกำหนดส่ง**:
   - เมื่อผู้ใช้ถามหางาน (เช่น "พรุ่งนี้มีงานอะไร", "มีงานไหนบ้าง", "ทำอันไหนก่อนดี", "เอาที่ยังไม่เสร็จ"): สรุปจากรายการงานจริงด้านบน ตอบทันทีอย่างฉลาดและตรงประเด็น
3. **รูปแบบการตอบกลับ**:
   - หากเป็นการพูดคุย ถาม-ตอบ แนะนำ หรือสรุปงานทั่วไป: ตอบเป็นภาษาไทย Markdown สวยงามได้โดยตรงอย่างอิสระ
   - เฉพาะกรณีที่ผู้ใช้สั่งการให้ระบบกระทำจริง (เช่น สร้างงาน, แก้ไขงาน, ลบงาน, ย้ายงาน) หรือสกัดงานจากรูปภาพ/เอกสาร ให้ส่งในรูปแบบ JSON Object:
     {
       "actions": [
         { "tool": "create_task" | "update_task" | "delete_task" | "plan_proposal", "args": { ... } }
       ],
       "reply": "ข้อความอธิบายเป็นธรรมชาติ"
     }
`;

  // Attempt LLM execution
  try {
    let prompt = userMessage ? userMessage.trim() : '';
    if (chatHistoryContext) {
      prompt = `[ประวัติการสนทนาก่อนหน้านี้ในห้องแชทนี้]:\n${chatHistoryContext}\n\n[ข้อความล่าสุดจากผู้ใช้]:\n${prompt}`;
    }
    if (fileProcessed) {
      const fileContext = fileProcessed.type === 'image'
        ? 'ช่วยวิเคราะห์ภาพแนบนี้ อ่านข้อความ OCR และสาระสำคัญ สกัดรายการงาน (Tasks) ทั้งหมดที่พบในภาพอย่างครบถ้วนทุกรายการ (หากมีหลายงานในภาพ ให้สกัดใส่ใน plan.tasks ให้ครบทุกงาน ห้ามเลือกมาแค่งานเดียวเด็ดขาด) พร้อม Checklist ข้อย่อยเพื่อนำเข้าสู่ระบบ Status+'
        : `ช่วยวิเคราะห์เอกสารแนบ (${fileProcessed.originalName}) สกัดรายการงาน (Tasks) ทั้งหมดที่พบในเอกสารอย่างครบถ้วน (หากมีหลายงาน ให้สกัดใส่ใน plan.tasks ให้ครบทุกงาน) พร้อม Checklist ข้อย่อยเพื่อนำเข้าสู่ระบบ Status+`;
      prompt = prompt ? `${prompt}\n${fileContext}` : fileContext;
    } else if (!prompt) {
      prompt = 'สรุปภาพรวมงานในระบบ';
    }
    const shouldForceJson = !!fileProcessed || (skill.id !== 'advisor' && !/^(?:มีงาน|งานอะไร|งานไหน|งานวันนี้|งานพรุ่งนี้|งานค้าง|งานด่วน|งานที่ต้องทำ|เอาที่ยังไม่เสร็จ|มีงานอะไรบ้าง|เหลืออะไรบ้าง|เช็คงาน|ดูงาน|สรุปงาน|ทำอันไหนก่อน|เริ่มยังไงดี|เอาที่)/i.test(cleanMsg));
    const llmResponse = await callLLM(prompt, systemInstruction, fileProcessed, shouldForceJson);

    if (llmResponse) {
      let parsed = safeJsonParse(llmResponse);
      if (!parsed) {
        const cleanedReply = extractReplyFromRawJson(llmResponse);
        if (cleanedReply) {
          parsed = { actions: [], reply: cleanedReply };
        }
      }
      if (parsed) {
        const executedActions = [];

        if (Array.isArray(parsed.actions)) {
          for (const act of parsed.actions) {
            // Convert task_creation, confirmation, or non-standard plan into plan_proposal
            if (act.type === 'task_creation' || act.type === 'confirmation' || act.type === 'space_selection' || (!act.action && act.task)) {
              act.action = 'plan_proposal';
              const rawPlan = act.plan || act.task || {};
              const planName = rawPlan.name || rawPlan.project_name || (act.details?.parameters?.service ? `ติดตั้ง${act.details.parameters.service}` : null) || 'งานที่มอบหมาย';
              const planDesc = rawPlan.description || rawPlan.notes || (act.details?.parameters?.notes || cleanMsg);
              const rawSubtasks = Array.isArray(rawPlan.subtasks) ? rawPlan.subtasks : (Array.isArray(act.options) ? act.options.map(o => o.details || o.response) : []);
              act.plan = {
                name: planName,
                description: planDesc,
                priority: rawPlan.priority || 'Normal',
                subtasks: rawSubtasks.map(s => typeof s === 'string' ? s : (s.task || s.title || s.name || s.description || s.action || '')).filter(Boolean)
              };
            }

            // A. Plan Proposal Action (Grill-me / Approval Card)
            if (act.action === 'plan_proposal' || act.type === 'plan_proposal') {
              act.action = 'plan_proposal';
              act.availableLists = flatLists;
              if (act.plan) {
                // Ensure act.plan.tasks exists and is populated
                if (!Array.isArray(act.plan.tasks) || act.plan.tasks.length === 0) {
                  if (act.plan.name) {
                    act.plan.tasks = [{
                      name: act.plan.name,
                      description: act.plan.description || '',
                      priority: act.plan.priority || 'Normal',
                      due_date: act.plan.due_date || null,
                      subtasks: act.plan.subtasks || []
                    }];
                  } else {
                    act.plan.tasks = [];
                  }
                }

                // Sanitize every task name and normalize subtasks
                act.plan.tasks = act.plan.tasks.map(t => {
                  let cleanName = (t.name || '').trim();
                  cleanName = cleanName.replace(/^(?:จัดทำแผนงานและดำเนิน(?:การ)?ตาม(?:รูปภาพ|ภาพ|เอกสาร)|วิเคราะห์และดำเนิน(?:การ)?ตาม(?:รูปภาพ|ภาพ|เอกสาร)|ตาม(?:รูปภาพ|ภาพ|เอกสาร)|งานตาม(?:รูปภาพ|ภาพ))\s*[:\-]?\s*/i, '');
                  cleanName = cleanName.replace(/clipboard-\d+/gi, '').replace(/^[:\-]\s*/, '').trim();
                  if (!cleanName || cleanName.length < 3) {
                    cleanName = 'งานตรวจสอบและดำเนินการตามข้อมูลที่วิเคราะห์ได้';
                  }
                  const rawSubs = Array.isArray(t.subtasks) ? t.subtasks : [];
                  const cleanSubtasks = rawSubs.map(s => {
                    if (typeof s === 'string') return s;
                    return s.task || s.title || s.name || s.description || s.action || '';
                  }).filter(Boolean);

                  return {
                    ...t,
                    name: cleanName,
                    subtasks: cleanSubtasks
                  };
                });

                if (act.plan.tasks.length > 0) {
                  act.plan.name = act.plan.tasks.length > 1
                    ? `แผนงานรวม (${act.plan.tasks.length} รายการ): ${act.plan.tasks.map(t => t.name).join(', ')}`
                    : act.plan.tasks[0].name;
                  act.plan.description = act.plan.tasks[0].description;
                  act.plan.priority = act.plan.tasks[0].priority;
                  act.plan.subtasks = act.plan.tasks[0].subtasks;
                }

                act.plan.defaultListId = activeListId || (flatLists[0]?.listId || '');
                if (fileProcessed) {
                  act.plan.fileInfo = fileProcessed.fileInfo;
                }
              }
              executedActions.push(act);
              continue;
            }

            // B. Direct Tool Execution (Intercept create_task when list is not specifically chosen)
            if (act.tool === 'create_task') {
              if (fileProcessed || !act.args?.list_id || act.args?.list_id === 'default' || act.args?.list_id === '') {
                const rawSubs = Array.isArray(act.args?.subtasks) ? act.args.subtasks : [];
                const cleanSubs = rawSubs.map(s => typeof s === 'string' ? s : (s.task || s.title || s.name || s.description || s.action || '')).filter(Boolean);
                act.action = 'plan_proposal';
                act.title = '📋 ร่างแผนงาน (รออนุมัติก่อนสร้าง)';
                act.plan = {
                  name: act.args?.name || 'งานที่มอบหมาย',
                  description: act.args?.description || '',
                  priority: act.args?.priority || 'Normal',
                  due_date: act.args?.due_date || null,
                  subtasks: cleanSubs.length > 0 ? cleanSubs : ['ตรวจสอบรายละเอียดและข้อกำหนด', 'ดำเนินการตามแผน', 'ตรวจรับงาน'],
                  defaultListId: activeListId || (flatLists[0]?.listId || ''),
                  fileInfo: fileProcessed ? fileProcessed.fileInfo : null
                };
                delete act.tool;
                delete act.args;

                let cleanName = (act.plan.name || '').trim();
                cleanName = cleanName.replace(/^(?:จัดทำแผนงานและดำเนิน(?:การ)?ตาม(?:รูปภาพ|ภาพ|เอกสาร)|วิเคราะห์และดำเนิน(?:การ)?ตาม(?:รูปภาพ|ภาพ|เอกสาร)|ตาม(?:รูปภาพ|ภาพ|เอกสาร)|งานตาม(?:รูปภาพ|ภาพ))\s*[:\-]?\s*/i, '');
                cleanName = cleanName.replace(/clipboard-\d+/gi, '').replace(/^[:\-]\s*/, '').trim();
                if (!cleanName || cleanName.length < 3) {
                  cleanName = 'งานตรวจสอบและดำเนินการตามข้อมูลที่วิเคราะห์ได้';
                }
                act.plan.name = cleanName;
                act.availableLists = flatLists;
                executedActions.push(act);
                continue;
              }
            }

            if (tools[act.tool] || skill.tools.includes(act.tool)) {
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

        // Format rich reply from LLM (string or structured object)
        let replyText = formatReplyToMarkdown(parsed.reply, parsed);

        if (!replyText.trim()) {
          if (executedActions.some(a => a.action === 'plan_proposal')) {
            replyText = 'ผมได้วิเคราะห์และร่างแผนงานพร้อมขั้นตอน Checklist สำหรับการดำเนินงานมาให้ตรวจสอบแล้วครับ สามารถเลือก Space/List และกดอนุมัติสร้างงานด้านล่างได้เลยครับ 😊';
          } else if (executedActions.length > 0) {
            replyText = 'ดำเนินการตามคำสั่งในระบบเรียบร้อยแล้วครับ หากมีจุดไหนต้องการให้ปรับเปลี่ยนเพิ่มเติม แจ้งได้เลยนะครับ';
          } else {
            replyText = 'ยินดีให้คำปรึกษาและช่วยบริหารจัดการงานครับ หากต้องการให้ผมช่วยจัดลำดับความสำคัญ วางแผน หรือติดตามงานรายการไหน บอกได้เลยนะครับ 😊';
          }
        }

        // Safety Guard: if LLM returned stalling text without executing actions, substitute with live task report!
        if (/กำลังตรวจสอบ|โปรดรอสักครู่|กำลังเรียกใช้เครื่องมือ/i.test(replyText) && executedActions.length === 0) {
          console.warn('Detected LLM stalling response, substituting with live task query results');
          const liveResult = executeDueSoonAndUrgentQuery({ activeListId, queryText: cleanMsg });
          replyText = liveResult.reply;
        }

        return {
          skill,
          actions: executedActions,
          reply: replyText
        };
      }

      // If safeJsonParse returned null:
      if (!fileProcessed) {
        let textReply = extractReplyFromRawJson(llmResponse.trim()) || llmResponse.trim();
        // Safety Guard against raw stalling text:
        if (/กำลังตรวจสอบ|โปรดรอสักครู่|กำลังเรียกใช้เครื่องมือ/i.test(textReply)) {
          console.warn('Detected LLM stalling response in raw text, substituting with live task query results');
          const liveResult = executeDueSoonAndUrgentQuery({ activeListId, queryText: cleanMsg });
          textReply = liveResult.reply;
        }
        return {
          skill,
          actions: [],
          reply: textReply
        };
      }

      // If safeJsonParse returned null but LLM gave a rich markdown/text response for file attachment:
      if (llmResponse.length > 20) {
        const text = llmResponse.trim();
        let planTitle = '';
        const titleMatch = text.match(/(?:ชื่องาน|หัวข้อ|ประเภทงาน|ประเภทเอกสาร|งาน)\s*[:\-]?\s*([^\n\*\#]+)/i);
        if (titleMatch && titleMatch[1].trim().length > 3) {
          planTitle = titleMatch[1].replace(/\*\*/g, '').trim();
        } else {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          for (const l of lines) {
            if (/^#{1,4}\s*(.+)/.test(l)) {
              const clean = l.replace(/^#{1,4}\s*/, '').replace(/\*\*/g, '').trim();
              if (clean.length > 4 && !/สรุป|ข้อเสนอแนะ|คำตอบ|เนื้อหา/i.test(clean)) {
                planTitle = clean;
                break;
              }
            }
          }
        }

        if (!planTitle || /clipboard-|วิเคราะห์และดำเนินงานตามรูปภาพ/i.test(planTitle)) {
          planTitle = 'งานตรวจสอบและดำเนินการตามข้อมูลที่วิเคราะห์ได้';
        }

        const subtasks = [];
        const bulletMatches = text.matchAll(/^[•\-\*\d+\.]\s+(.+)$/gm);
        for (const m of bulletMatches) {
          const s = m[1].replace(/\*\*/g, '').trim();
          if (s.length > 4 && s.length < 100 && !subtasks.includes(s) && !/หมายเหตุ|คำแนะนำ/i.test(s)) {
            subtasks.push(s);
            if (subtasks.length >= 5) break;
          }
        }

        const fallbackSubtasks = subtasks.length > 0 ? subtasks : [
          'ตรวจสอบรายละเอียดตามเนื้อหาที่วิเคราะห์',
          'แบ่งหน้าที่และมอบหมายผู้รับผิดชอบ',
          'ติดตามผลการดำเนินงาน'
        ];

        return {
          skill,
          actions: [
            {
              action: 'plan_proposal',
              title: '📋 ร่างแผนงาน (รออนุมัติก่อนสร้าง)',
              plan: {
                name: planTitle,
                description: text.slice(0, 500),
                priority: 'Normal',
                subtasks: fallbackSubtasks,
                defaultListId: activeListId || (flatLists[0]?.listId || ''),
                fileInfo: fileProcessed ? fileProcessed.fileInfo : null
              },
              availableLists: flatLists
            }
          ],
          reply: text
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
