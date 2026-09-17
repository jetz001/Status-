const { db } = require('./db');
const { indexTask } = require('./ragService');
const { attachFileToTask } = require('./fileProcessor');

// Helper to get active or fallback list
function getDefaultListId() {
  const row = db.prepare('SELECT id FROM lists ORDER BY position ASC, created_at ASC LIMIT 1').get();
  return row ? row.id : 'list-iqa26';
}

// Helper to find task by id or partial name
function findTask(identifier) {
  if (!identifier) return null;
  // Try by exact id
  let task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(identifier);
  if (task) return task;

  // Try by exact name
  task = db.prepare('SELECT * FROM tasks WHERE LOWER(name) = LOWER(?)').get(identifier);
  if (task) return task;

  // Try by LIKE name
  task = db.prepare('SELECT * FROM tasks WHERE LOWER(name) LIKE LOWER(?)').get(`%${identifier}%`);
  return task || null;
}

// Tool Implementation Registry
const tools = {
  /**
   * 1. CREATE TASK
   */
  async create_task(args, fileInfo = null) {
    const listId = args.list_id || getDefaultListId();
    const name = args.name?.trim();
    if (!name) throw new Error('Task name is required');

    const id = `task-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    const description = args.description || '';
    const status = (args.status || 'NOT STARTED').toUpperCase();
    const priority = args.priority || 'Normal';
    const dueDate = args.due_date || null;
    const startDate = args.start_date || null;
    const assignee = args.assignee || 'JM';

    // Get max position
    const maxPos = db.prepare('SELECT COALESCE(MAX(position), 0) as maxP FROM tasks WHERE list_id = ?').get(listId).maxP;

    db.prepare(`
      INSERT INTO tasks (id, list_id, name, description, status, priority, due_date, start_date, assignee, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, listId, name, description, status, priority, dueDate, startDate, assignee, maxPos + 1);

    // Add subtasks if provided
    let subtaskCount = 0;
    if (Array.isArray(args.subtasks) && args.subtasks.length > 0) {
      const stmt = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, 0, ?)');
      args.subtasks.forEach((sub, i) => {
        const title = typeof sub === 'string' ? sub.trim() : sub?.title?.trim();
        if (title) {
          stmt.run(`sub-${Date.now()}-${i}`, id, title, i);
          subtaskCount++;
        }
      });
    }

    // Auto-attach file if provided
    let attachmentId = null;
    if (fileInfo) {
      attachmentId = attachFileToTask(id, fileInfo);
    }

    // Index vector search
    try { indexTask(id); } catch (e) {}

    const listRow = db.prepare('SELECT name FROM lists WHERE id = ?').get(listId);

    return {
      success: true,
      action: 'created_task',
      task: {
        id,
        name,
        listId,
        listName: listRow ? listRow.name : '',
        status,
        priority,
        dueDate,
        subtaskCount,
        hasAttachment: !!attachmentId
      },
      message: `สร้างงาน "${name}" เรียบร้อยแล้ว${subtaskCount > 0 ? ` พร้อม Checklist ${subtaskCount} รายการ` : ''}${attachmentId ? ' (แนบไฟล์เอกสารเข้าการ์ดงานแล้ว)' : ''}`
    };
  },

  /**
   * 2. UPDATE TASK
   */
  async update_task(args) {
    const task = findTask(args.task_id || args.name);
    if (!task) {
      throw new Error(`ไม่พบงานที่ระบุ: ${args.task_id || args.name}`);
    }

    const updates = [];
    const params = [];

    if (args.name && args.name.trim()) {
      updates.push('name = ?');
      params.push(args.name.trim());
    }
    if (args.description !== undefined) {
      updates.push('description = ?');
      params.push(args.description);
    }
    if (args.status) {
      updates.push('status = ?');
      params.push(args.status.toUpperCase());
    }
    if (args.priority) {
      updates.push('priority = ?');
      params.push(args.priority);
    }
    if (args.due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(args.due_date || null);
    }
    if (args.assignee) {
      updates.push('assignee = ?');
      params.push(args.assignee);
    }

    if (updates.length === 0) {
      return { success: false, message: 'ไม่มีข้อมูลที่ต้องอัปเดต' };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(task.id);

    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // If adding subtasks
    if (Array.isArray(args.add_subtasks) && args.add_subtasks.length > 0) {
      const stmt = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, 0, ?)');
      args.add_subtasks.forEach((sub, i) => {
        const title = typeof sub === 'string' ? sub.trim() : sub?.title?.trim();
        if (title) {
          stmt.run(`sub-${Date.now()}-${i}`, task.id, title, i);
        }
      });
    }

    try { indexTask(task.id); } catch (e) {}

    return {
      success: true,
      action: 'updated_task',
      task: {
        id: task.id,
        name: args.name || task.name,
        updatedFields: updates.map(u => u.split(' ')[0])
      },
      message: `อัปเดตข้อมูลงาน "${args.name || task.name}" เรียบร้อยแล้ว`
    };
  },

  /**
   * 3. DELETE TASK (With Confirmation Guard)
   */
  async delete_task(args) {
    const task = findTask(args.task_id || args.name);
    if (!task) {
      throw new Error(`ไม่พบงานที่ต้องการลบ: ${args.task_id || args.name}`);
    }

    // Confirmation Guard
    if (args.confirmed !== true) {
      return {
        requiresConfirmation: true,
        actionType: 'delete_task',
        payload: { task_id: task.id, confirmed: true },
        title: 'ยืนยันการลบงาน',
        message: `คุณต้องการลบงาน "${task.name}" ออกจากระบบถาวรใช่หรือไม่?`,
        task: { id: task.id, name: task.name, status: task.status }
      };
    }

    // Execute Deletion
    db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
    db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(task.id);
    db.prepare('DELETE FROM attachments WHERE task_id = ?').run(task.id);
    db.prepare('DELETE FROM task_embeddings WHERE task_id = ?').run(task.id);

    return {
      success: true,
      action: 'deleted_task',
      task: { id: task.id, name: task.name },
      message: `ลบงาน "${task.name}" ออกจากระบบเรียบร้อยแล้ว`
    };
  },

  /**
   * 4. ADD SUBTASKS
   */
  async create_subtasks(args) {
    const task = findTask(args.task_id || args.task_name);
    if (!task) throw new Error(`ไม่พบงาน: ${args.task_id || args.task_name}`);

    if (!Array.isArray(args.subtasks) || args.subtasks.length === 0) {
      throw new Error('กรุณาระบุรายการ Subtasks');
    }

    const currentCount = db.prepare('SELECT COUNT(*) as c FROM subtasks WHERE task_id = ?').get(task.id).c;
    const stmt = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, 0, ?)');

    let added = 0;
    args.subtasks.forEach((sub, i) => {
      const title = typeof sub === 'string' ? sub.trim() : sub?.title?.trim();
      if (title) {
        stmt.run(`sub-${Date.now()}-${i}`, task.id, title, currentCount + i);
        added++;
      }
    });

    try { indexTask(task.id); } catch (e) {}

    return {
      success: true,
      action: 'added_subtasks',
      task: { id: task.id, name: task.name, subtasksAdded: added },
      message: `เพิ่ม Checklist ในงาน "${task.name}" จำนวน ${added} ข้อ เรียบร้อยแล้ว`
    };
  },

  /**
   * 5. CREATE PROJECT (Space & List)
   */
  async create_project(args, fileInfo = null) {
    const spaceName = args.space_name || 'Projects';
    let space = db.prepare('SELECT * FROM spaces WHERE LOWER(name) = LOWER(?)').get(spaceName);
    
    if (!space) {
      const spaceId = `space-${Date.now()}`;
      const ws = db.prepare('SELECT id FROM workspaces LIMIT 1').get();
      db.prepare('INSERT INTO spaces (id, workspace_id, name, color, icon) VALUES (?, ?, ?, ?, ?)')
        .run(spaceId, ws ? ws.id : 'ws-default', spaceName, args.color || '#06b6d4', 'folder');
      space = { id: spaceId, name: spaceName };
    }

    const listName = args.list_name || 'Project List';
    const listId = `list-${Date.now()}`;
    db.prepare('INSERT INTO lists (id, space_id, name, color, position) VALUES (?, ?, ?, ?, 0)')
      .run(listId, space.id, listName, args.color || '#06b6d4');

    // Create initial tasks if provided
    let taskCount = 0;
    if (Array.isArray(args.tasks) && args.tasks.length > 0) {
      for (const t of args.tasks) {
        await tools.create_task({
          list_id: listId,
          name: t.name,
          description: t.description || '',
          priority: t.priority || 'Normal',
          due_date: t.due_date || null,
          assignee: t.assignee || 'JM',
          subtasks: t.subtasks || []
        }, fileInfo);
        taskCount++;
      }
    }

    return {
      success: true,
      action: 'created_project',
      project: {
        spaceId: space.id,
        spaceName: space.name,
        listId,
        listName,
        taskCount
      },
      message: `สร้างโครงสร้างโปรเจกต์ "${listName}" ใน Space "${space.name}" เรียบร้อยแล้ว (${taskCount} งานเริ่มต้น)`
    };
  },

  /**
   * 6. MOVE TASK
   */
  async move_task(args) {
    const task = findTask(args.task_id || args.name);
    if (!task) throw new Error(`ไม่พบงาน: ${args.task_id || args.name}`);

    const targetList = db.prepare('SELECT * FROM lists WHERE id = ? OR LOWER(name) = LOWER(?)').get(args.target_list_id, args.target_list_id);
    if (!targetList) throw new Error(`ไม่พบ List ปลายทาง: ${args.target_list_id}`);

    db.prepare('UPDATE tasks SET list_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(targetList.id, task.id);

    return {
      success: true,
      action: 'moved_task',
      task: { id: task.id, name: task.name, targetList: targetList.name },
      message: `ย้ายงาน "${task.name}" ไปยัง "${targetList.name}" สำเร็จ`
    };
  },

  /**
   * 7. QUERY TASKS
   */
  async query_tasks(args) {
    let query = 'SELECT t.*, l.name as list_name FROM tasks t LEFT JOIN lists l ON t.list_id = l.id WHERE 1=1';
    const params = [];

    if (args.status) {
      query += ' AND UPPER(t.status) = UPPER(?)';
      params.push(args.status);
    }
    if (args.priority) {
      query += ' AND LOWER(t.priority) = LOWER(?)';
      params.push(args.priority);
    }
    if (args.query) {
      query += ' AND (LOWER(t.name) LIKE LOWER(?) OR LOWER(t.description) LIKE LOWER(?))';
      params.push(`%${args.query}%`, `%${args.query}%`);
    }

    query += ' ORDER BY t.due_date ASC LIMIT 20';
    const tasks = db.prepare(query).all(...params);

    return {
      success: true,
      action: 'queried_tasks',
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        listName: t.list_name
      }))
    };
  },

  /**
   * 8. GET PROJECT OVERVIEW / TASK SUMMARY
   */
  async get_project_overview(args) {
    const listId = args?.list_id;
    let query = `
      SELECT t.id, t.name, t.status, t.priority, t.due_date, t.list_id, l.name as list_name
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
    `;
    const params = [];
    if (listId && listId !== 'all') {
      query += ' WHERE t.list_id = ?';
      params.push(listId);
    }
    query += ' ORDER BY t.due_date ASC, t.created_at DESC';
    const allTasks = db.prepare(query).all(...params);

    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'COMPLETED').length;
    const inProgress = allTasks.filter(t => t.status === 'IN PROGRESS').length;
    const notStarted = allTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'IN PROGRESS').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      success: true,
      action: 'project_overview',
      stats: { total, completed, inProgress, notStarted, percent },
      tasks: allTasks.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        listId: t.list_id,
        listName: t.list_name || 'ทั่วไป'
      }))
    };
  }
};

/**
 * Execute a named tool with arguments
 */
async function executeTool(toolName, args, fileInfo = null) {
  const fn = tools[toolName];
  if (!fn) {
    throw new Error(`Tool "${toolName}" ไม่พร้อมใช้งาน`);
  }
  return await fn(args, fileInfo);
}

module.exports = {
  tools,
  executeTool,
  findTask,
  getDefaultListId
};
