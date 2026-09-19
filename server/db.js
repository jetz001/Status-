const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const USER_DATA_DIR = process.env.STATUS_USER_DATA || path.join(__dirname, '..');
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(USER_DATA_DIR, 'project_management.db');
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
      assignee TEXT DEFAULT '',
      position INTEGER DEFAULT 0,
      recurring_rule TEXT DEFAULT NULL,
      eisenhower_quadrant TEXT DEFAULT NULL,
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

    CREATE TABLE IF NOT EXISTS read_notifications (
      id TEXT PRIMARY KEY,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    CREATE TABLE IF NOT EXISTS mcp_activity_logs (
      id TEXT PRIMARY KEY,
      client_name TEXT DEFAULT 'External AI',
      action_type TEXT DEFAULT 'tool_execution', -- 'execution_report' or 'tool_execution'
      tool_name TEXT NOT NULL,
      input_params TEXT DEFAULT '',
      result_summary TEXT DEFAULT '',
      report_text TEXT DEFAULT '',
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migration for recurring_rule
  try {
    db.prepare('ALTER TABLE tasks ADD COLUMN recurring_rule TEXT DEFAULT NULL').run();
  } catch (e) {}

  // Safe migration for eisenhower_quadrant
  try {
    db.prepare('ALTER TABLE tasks ADD COLUMN eisenhower_quadrant TEXT DEFAULT NULL').run();
  } catch (e) {}

  // Clean up legacy mock test case columns if present
  try {
    db.prepare("DELETE FROM custom_fields WHERE id IN ('f-tester', 'f-case-id', 'f-severity', 'f-exec-date', 'f-qa-ai')").run();
    db.prepare("DELETE FROM task_field_values WHERE field_id IN ('f-tester', 'f-case-id', 'f-severity', 'f-exec-date', 'f-qa-ai')").run();
  } catch (e) {}

  // Seed default team member if empty
  try {
    const tmCount = db.prepare('SELECT COUNT(*) as count FROM team_members').get().count;
    if (tmCount === 0) {
      db.prepare('INSERT INTO team_members (id, name, label, color) VALUES (?, ?, ?, ?)').run('tm-1', 'Me', 'Me', '#7b68ee');
    }
  } catch (e) {}

  seedDefaultData();
}

function seedDefaultData() {
  const wsCount = db.prepare('SELECT COUNT(*) as count FROM workspaces').get().count;
  if (wsCount > 0) return; // Already seeded

  console.log('Seeding initial clean workspace data...');

  const wsId = 'ws-default';
  db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run(wsId, 'My Workspace');

  const spaceId = 'space-team';
  db.prepare('INSERT INTO spaces (id, workspace_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?, ?)')
    .run(spaceId, wsId, 'General', '#7b68ee', 'folder', 0);

  const listTasks = 'list-tasks';
  const insertList = db.prepare('INSERT INTO lists (id, space_id, name, color, position) VALUES (?, ?, ?, ?, ?)');
  insertList.run(listTasks, spaceId, 'Tasks', '#7b68ee', 0);

  // Default app settings
  const insertSetting = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)');
  insertSetting.run('ai_provider', 'gemini');
  insertSetting.run('ai_model', 'gemini-1.5-flash');
  insertSetting.run('wallpaper_theme', 'clickup-dark');
  insertSetting.run('wallpaper_auto_sync', 'true');
  insertSetting.run('wallpaper_position', 'top-right');
  insertSetting.run('wallpaper_blur', '10');
  insertSetting.run('wallpaper_opacity', '85');

  console.log('Initial clean workspace created with 0 tasks.');
}

initSchema();

function logMcpActivity({ client_name = 'External AI', action_type = 'tool_execution', tool_name, input_params = '', result_summary = '', report_text = '', status = 'success' }) {
  try {
    const id = `mcp-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stmt = db.prepare(`
      INSERT INTO mcp_activity_logs (id, client_name, action_type, tool_name, input_params, result_summary, report_text, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      id,
      client_name || 'External AI',
      action_type || 'tool_execution',
      tool_name || 'unknown',
      typeof input_params === 'object' ? JSON.stringify(input_params) : String(input_params || ''),
      typeof result_summary === 'object' ? JSON.stringify(result_summary) : String(result_summary || ''),
      report_text || '',
      status || 'success'
    );
    return id;
  } catch (err) {
    console.error('Error logging MCP activity:', err);
    return null;
  }
}

function getMcpLogs(limit = 100) {
  try {
    return db.prepare('SELECT * FROM mcp_activity_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  } catch (err) {
    console.error('Error getting MCP logs:', err);
    return [];
  }
}

function clearMcpLogs() {
  try {
    db.prepare('DELETE FROM mcp_activity_logs').run();
    return true;
  } catch (err) {
    console.error('Error clearing MCP logs:', err);
    return false;
  }
}

module.exports = {
  db,
  initSchema,
  logMcpActivity,
  getMcpLogs,
  clearMcpLogs
};

