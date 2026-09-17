const path = require('path');
const fs = require('fs');
const { db } = require('./db');
const { indexTask, reindexAll } = require('./ragService');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Clean up backups older than retentionDays (default 7 days)
 */
function cleanOldBackups(retentionDays = 7) {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          console.log(`Removed old backup file: ${file}`);
        }
      }
    });
  } catch (err) {
    console.error('Error cleaning old backups:', err.message);
  }
}

/**
 * Creates a full JSON snapshot of all tables
 */
function createFullBackup(note = 'manual') {
  try {
    const workspaces = db.prepare('SELECT * FROM workspaces').all();
    const spaces = db.prepare('SELECT * FROM spaces').all();
    const lists = db.prepare('SELECT * FROM lists').all();
    const tasks = db.prepare('SELECT * FROM tasks').all();
    const subtasks = db.prepare('SELECT * FROM subtasks').all();
    const customFields = db.prepare('SELECT * FROM custom_fields').all();
    const taskFieldValues = db.prepare('SELECT * FROM task_field_values').all();
    const attachments = db.prepare('SELECT * FROM attachments').all();
    const appSettings = db.prepare('SELECT * FROM app_settings').all();

    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      note,
      summary: {
        totalSpaces: spaces.length,
        totalLists: lists.length,
        totalTasks: tasks.length
      },
      data: {
        workspaces,
        spaces,
        lists,
        tasks,
        subtasks,
        customFields,
        taskFieldValues,
        attachments,
        appSettings
      }
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${note}-${dateStr}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
    cleanOldBackups(7);

    return {
      success: true,
      filename,
      filePath,
      timestamp: backupData.timestamp,
      summary: backupData.summary
    };
  } catch (err) {
    console.error('Error creating backup:', err.message);
    throw err;
  }
}

/**
 * List available backups in the backups/ folder
 */
function listBackups() {
  try {
    cleanOldBackups(7);
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    const list = files.map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      let summary = null;
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        summary = content.summary;
      } catch (e) {}

      return {
        filename: file,
        size: stats.size,
        createdAt: stats.mtime,
        summary
      };
    });

    // Sort newest first
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  } catch (err) {
    console.error('Error listing backups:', err.message);
    return [];
  }
}

/**
 * Restores system from a backup object
 * mode: 'replace' | 'merge'
 */
function restoreBackupData(backupData, mode = 'replace') {
  if (!backupData || !backupData.data) {
    throw new Error('Invalid backup file format.');
  }

  const { data } = backupData;

  // Create a safety snapshot before replacing
  if (mode === 'replace') {
    createFullBackup('pre-restore-safety');
  }

  // Atomic database transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    if (mode === 'replace') {
      // Clear tables
      db.exec('DELETE FROM task_embeddings;');
      db.exec('DELETE FROM task_field_values;');
      db.exec('DELETE FROM subtasks;');
      db.exec('DELETE FROM attachments;');
      db.exec('DELETE FROM tasks;');
      db.exec('DELETE FROM custom_fields;');
      db.exec('DELETE FROM lists;');
      db.exec('DELETE FROM spaces;');
      db.exec('DELETE FROM workspaces;');

      // Insert workspaces
      const insWs = db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)');
      (data.workspaces || []).forEach(w => insWs.run(w.id, w.name, w.created_at));

      // Insert spaces
      const insSp = db.prepare('INSERT INTO spaces (id, workspace_id, name, color, icon, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      (data.spaces || []).forEach(s => insSp.run(s.id, s.workspace_id, s.name, s.color, s.icon, s.position, s.created_at));

      // Insert lists
      const insLs = db.prepare('INSERT INTO lists (id, space_id, name, color, position, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      (data.lists || []).forEach(l => insLs.run(l.id, l.space_id, l.name, l.color, l.position, l.created_at));

      // Insert custom fields
      const insCf = db.prepare('INSERT INTO custom_fields (id, list_id, name, type, options_json, position) VALUES (?, ?, ?, ?, ?, ?)');
      (data.customFields || []).forEach(cf => insCf.run(cf.id, cf.list_id, cf.name, cf.type, cf.options_json, cf.position));
    }

    // Insert tasks
    const insTask = db.prepare(`
      INSERT OR REPLACE INTO tasks (id, list_id, name, description, status, priority, due_date, start_date, assignee, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    (data.tasks || []).forEach(t => {
      insTask.run(
        t.id,
        t.list_id,
        t.name,
        t.description || '',
        t.status || 'NOT STARTED',
        t.priority || 'Normal',
        t.due_date || null,
        t.start_date || null,
        t.assignee || 'JM',
        t.position || 0,
        t.created_at || new Date().toISOString(),
        t.updated_at || new Date().toISOString()
      );
    });

    // Insert subtasks
    const insSub = db.prepare('INSERT OR REPLACE INTO subtasks (id, task_id, title, completed, position, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    (data.subtasks || []).forEach(s => insSub.run(s.id, s.task_id, s.title, s.completed ? 1 : 0, s.position, s.created_at));

    // Insert task field values
    const insTfv = db.prepare('INSERT OR REPLACE INTO task_field_values (id, task_id, field_id, value) VALUES (?, ?, ?, ?)');
    (data.taskFieldValues || []).forEach(tfv => insTfv.run(tfv.id, tfv.task_id, tfv.field_id, tfv.value));

    db.exec('COMMIT;');

    // Reindex all tasks into SQLite vector store
    reindexAll();

    return { success: true, restoredTasks: (data.tasks || []).length };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error during restore:', err);
    throw err;
  }
}

/**
 * Generates CSV string for a list with UTF-8 BOM for Microsoft Excel compatibility
 */
function exportListToCSV(listId) {
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(listId);
  const tasks = db.prepare('SELECT * FROM tasks WHERE list_id = ? ORDER BY position ASC').all(listId);
  const fields = db.prepare('SELECT * FROM custom_fields WHERE list_id = ? ORDER BY position ASC').all(listId);

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  // Header Row
  const headers = ['Task ID', 'Name', 'Status', 'Priority', 'Due Date', 'Assignee', 'Description', 'Subtasks Count', 'Completed Subtasks'];
  fields.forEach(f => headers.push(f.name));

  const rows = [headers.map(escapeCSV).join(',')];

  tasks.forEach(t => {
    const subtasks = db.prepare('SELECT completed FROM subtasks WHERE task_id = ?').all(t.id);
    const totalSubs = subtasks.length;
    const completedSubs = subtasks.filter(s => s.completed).length;

    const row = [
      t.id,
      t.name,
      t.status,
      t.priority,
      t.due_date || '',
      t.assignee || '',
      t.description || '',
      totalSubs,
      completedSubs
    ];

    // Append custom fields
    fields.forEach(f => {
      const valRow = db.prepare('SELECT value FROM task_field_values WHERE task_id = ? AND field_id = ?').get(t.id, f.id);
      row.push(valRow ? valRow.value : '');
    });

    rows.push(row.map(escapeCSV).join(','));
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens Thai characters properly
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Imports tasks from CSV content into a target list
 */
function importTasksFromCSV(listId, csvText) {
  if (!csvText) return { success: false, count: 0 };

  // Remove BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return { success: false, count: 0 };

  // Helper to parse CSV line handling quoted commas
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('ชื่อ'));
  const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('สถานะ'));
  const priorityIdx = headers.findIndex(h => h.includes('priority') || h.includes('ความสำคัญ'));
  const dueIdx = headers.findIndex(h => h.includes('due') || h.includes('กำหนดส่ง'));
  const assigneeIdx = headers.findIndex(h => h.includes('assignee') || h.includes('ผู้รับผิดชอบ'));
  const descIdx = headers.findIndex(h => h.includes('description') || h.includes('คำอธิบาย') || h.includes('รายละเอียด'));

  let insertedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const taskName = nameIdx !== -1 ? cols[nameIdx]?.trim() : cols[1]?.trim() || cols[0]?.trim();
    if (!taskName) continue;

    const taskId = `task-${Date.now()}-${i}`;
    const status = statusIdx !== -1 && cols[statusIdx] ? cols[statusIdx].trim() : 'NOT STARTED';
    const priority = priorityIdx !== -1 && cols[priorityIdx] ? cols[priorityIdx].trim() : 'Normal';
    const dueDate = dueIdx !== -1 && cols[dueIdx] ? cols[dueIdx].trim() : null;
    const assignee = assigneeIdx !== -1 && cols[assigneeIdx] ? cols[assigneeIdx].trim() : 'JM';
    const description = descIdx !== -1 && cols[descIdx] ? cols[descIdx].trim() : '';

    db.prepare(`
      INSERT INTO tasks (id, list_id, name, description, status, priority, due_date, assignee, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(taskId, listId, taskName, description, status, priority, dueDate, assignee, i);

    indexTask(taskId);
    insertedCount++;
  }

  return { success: true, count: insertedCount };
}

// Perform initial daily backup check on startup
try {
  const existing = listBackups();
  const todayStr = new Date().toISOString().split('T')[0];
  const hasToday = existing.some(b => b.filename.includes(todayStr));
  if (!hasToday) {
    createFullBackup('auto-daily');
    console.log('Daily auto-backup created successfully.');
  }
} catch (e) {}

module.exports = {
  createFullBackup,
  listBackups,
  restoreBackupData,
  exportListToCSV,
  importTasksFromCSV,
  BACKUP_DIR
};
