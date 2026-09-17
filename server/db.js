const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'project_management.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize Tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS spaces (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#7b68ee',
      icon TEXT DEFAULT 'folder',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      space_id TEXT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#7b68ee',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'NOT STARTED',
      priority TEXT DEFAULT 'Normal',
      due_date TEXT,
      start_date TEXT,
      assignee TEXT DEFAULT 'JM',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- text, number, date, select, tag
      options_json TEXT DEFAULT '[]',
      position INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS task_field_values (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      value TEXT DEFAULT '',
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_embeddings (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text_chunk TEXT NOT NULL,
      vector_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info', -- due_soon, overdue, info
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT DEFAULT '#7b68ee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      messages_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clean up legacy mock test case columns if present
  try {
    db.prepare("DELETE FROM custom_fields WHERE id IN ('f-tester', 'f-case-id', 'f-severity', 'f-exec-date', 'f-qa-ai')").run();
    db.prepare("DELETE FROM task_field_values WHERE field_id IN ('f-tester', 'f-case-id', 'f-severity', 'f-exec-date', 'f-qa-ai')").run();
  } catch (e) {}

  // Seed default team member if empty
  try {
    const tmCount = db.prepare('SELECT COUNT(*) as count FROM team_members').get().count;
    if (tmCount === 0) {
      db.prepare('INSERT INTO team_members (id, name, label, color) VALUES (?, ?, ?, ?)').run('tm-1', 'JM', 'JM (Jet Mut)', '#7b68ee');
    }
  } catch (e) {}

  seedDefaultData();
}

function seedDefaultData() {
  const wsCount = db.prepare('SELECT COUNT(*) as count FROM workspaces').get().count;
  if (wsCount > 0) return; // Already seeded

  console.log('Seeding initial ClickUp project data...');

  const wsId = 'ws-default';
  db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run(wsId, "Jet mut's Workspace");

  const spaceId = 'space-team';
  db.prepare('INSERT INTO spaces (id, workspace_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?, ?)')
    .run(spaceId, wsId, 'Team Space', '#7b68ee', 'users', 0);

  // Lists matching the user's workflow
  const listIQA26 = 'list-iqa26';
  const listFSC = 'list-fsc';
  const listRoutine = 'list-routine';
  const listSafety = 'list-safety';
  const listDocs = 'list-docs';

  const insertList = db.prepare('INSERT INTO lists (id, space_id, name, color, position) VALUES (?, ?, ?, ?, ?)');
  insertList.run(listFSC, spaceId, 'งาน FSC', '#3b82f6', 0);
  insertList.run(listIQA26, spaceId, 'IQA26', '#7b68ee', 1);
  insertList.run(listRoutine, spaceId, 'Routine', '#10b981', 2);
  insertList.run(listSafety, spaceId, 'งาน Safety', '#f59e0b', 3);
  insertList.run(listDocs, spaceId, 'Team Docs', '#8b5cf6', 4);

  // The 10 Tasks from the user's project
  const initialTasks = [
    {
      id: 'task-1',
      name: 'Revise KPI Format ทุกแผนก',
      description: 'ทบทวนและปรับปรุงฟอร์แมต KPI ของทุกแผนกให้สอดคล้องกับมาตรฐานปี 2026',
      status: 'NOT STARTED',
      priority: 'High',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      severity: 'Major'
    },
    {
      id: 'task-2',
      name: 'ทำ Feasibility + Risk Analysis',
      description: 'วิเคราะห์ความเป็นไปได้และการประเมินความเสี่ยงเชิงลึกของโครงการและกระบวนการ',
      status: 'NOT STARTED',
      priority: 'Urgent',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      severity: 'Critical'
    },
    {
      id: 'task-3',
      name: 'ทำประเมิน Supplier List2026',
      description: 'ดำเนินการประเมินผลการดำเนินงานของผู้ขายและคู่ค้า (Supplier Performance Evaluation 2026)',
      status: 'NOT STARTED',
      priority: 'Normal',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      severity: 'Minor'
    },
    {
      id: 'task-4',
      name: 'ตรวจสอบ Supplier ที่มีการใช้งานในปี2026',
      description: 'ตรวจสอบรายชื่อประวัติการสั่งซื้อและคุณภาพของ Supplier ที่มีกิจกรรมการค้าในปี 2026',
      status: 'NOT STARTED',
      priority: 'Normal',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
      severity: 'Minor'
    },
    {
      id: 'task-5',
      name: 'ให้ทำวันทำ Stockcard Adella',
      description: 'จัดทำระบบบันทึกและวันตรวจนับ Stockcard ผลิตภัณฑ์ Adella ให้เป็นปัจจุบัน',
      status: 'NOT STARTED',
      priority: 'Normal',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      severity: 'Low'
    },
    {
      id: 'task-6',
      name: 'หาข้อมูลการประเมินผลการฝึกอบรมนอก26',
      description: 'รวบรวมหลักฐานและผลการประเมินความพึงพอใจและประสิทธิผลการฝึกอบรมภายนอกปี 26',
      status: 'NOT STARTED',
      priority: 'Normal',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 8).toISOString().split('T')[0],
      severity: 'Minor'
    },
    {
      id: 'task-7',
      name: 'ขึ้นทะเบียน F-TR-02 บัญชี รถขนส่ง',
      description: 'จัดทำแบบฟอร์มขึ้นทะเบียน F-TR-02 สำหรับรายการและประวัติรถขนส่งทั้งหมด',
      status: 'NOT STARTED',
      priority: 'Normal',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 9).toISOString().split('T')[0],
      severity: 'Normal'
    },
    {
      id: 'task-8',
      name: 'ขึ้นทะเบียน ฟอร์มความสามารถผู้ตรวจติดตาม A...',
      description: 'ขึ้นทะเบียนฟอร์มประเมินความสามารถและคุณสมบัติของผู้ตรวจติดตามภายใน (Internal Auditor Competency)',
      status: 'NOT STARTED',
      priority: 'High',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      severity: 'Major'
    },
    {
      id: 'task-9',
      name: 'แจก % ความพึงพอใจลูกค้า',
      description: 'สรุปและแจกแจงผลวิเคราะห์ร้อยละความพึงพอใจของลูกค้าให้กับฝ่ายบริหารและทีมงาน',
      status: 'NOT STARTED',
      priority: 'Normal',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
      severity: 'Minor'
    },
    {
      id: 'task-10',
      name: 'เพิ่มขึ้นทะเบียน IQA audit report',
      description: 'จัดระบบทะเบียนและอัปโหลดรายงานผลการตรวจติดตามคุณภาพภายใน (IQA Audit Report) ฉบับสมบูรณ์',
      status: 'NOT STARTED',
      priority: 'High',
      assignee: 'JM',
      due_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      severity: 'Major'
    }
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, list_id, name, description, status, priority, due_date, assignee, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFieldValue = db.prepare(`
    INSERT INTO task_field_values (id, task_id, field_id, value)
    VALUES (?, ?, ?, ?)
  `);

  const insertSubtask = db.prepare(`
    INSERT INTO subtasks (id, task_id, title, completed, position)
    VALUES (?, ?, ?, ?, ?)
  `);

  initialTasks.forEach((t, idx) => {
    insertTask.run(t.id, listIQA26, t.name, t.description, t.status, t.priority, t.due_date, t.assignee, idx);
    insertFieldValue.run(`val-${t.id}-sev`, t.id, 'f-severity', t.severity);
    insertFieldValue.run(`val-${t.id}-case`, t.id, 'f-case-id', `TC-2026-${String(idx + 1).padStart(3, '0')}`);
    
    // Add sample subtasks to demonstrate checklist feature
    insertSubtask.run(`sub-${t.id}-1`, t.id, 'รวบรวมเอกสารและข้อกำหนดที่เกี่ยวข้อง', 0, 0);
    insertSubtask.run(`sub-${t.id}-2`, t.id, 'จัดทำร่างฉบับแรกและตรวจสอบความถูกต้อง', 0, 1);
  });

  // Default app settings
  const insertSetting = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)');
  insertSetting.run('ai_provider', 'gemini');
  insertSetting.run('ai_model', 'gemini-1.5-flash');
  insertSetting.run('wallpaper_theme', 'clickup-dark');
  insertSetting.run('wallpaper_auto_sync', 'true');
  insertSetting.run('wallpaper_position', 'top-right');
  insertSetting.run('wallpaper_blur', '10');
  insertSetting.run('wallpaper_opacity', '85');

  console.log('Default data successfully seeded.');
}

initSchema();

module.exports = {
  db,
  initSchema
};
