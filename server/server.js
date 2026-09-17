const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { db } = require('./db');
const { indexTask, semanticSearch, reindexAll } = require('./ragService');
const { callLLM, polishText, generateSubtasks, autofillMetadata, chatAssistant } = require('./aiService');
const { setWindowsWallpaper, saveWallpaperDataUrl, STOCK_WALLPAPERS } = require('./wallpaperService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload folders exist
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const ATTACHMENTS_DIR = path.join(UPLOADS_DIR, 'attachments');
if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

// Serve uploaded static files
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ATTACHMENTS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ==========================================
// 1. SPACES & LISTS
// ==========================================

app.get('/api/spaces', (req, res) => {
  try {
    const spaces = db.prepare('SELECT * FROM spaces ORDER BY position ASC, created_at ASC').all();
    const lists = db.prepare('SELECT * FROM lists ORDER BY position ASC, created_at ASC').all();

    // Attach lists and task counts to spaces
    const result = spaces.map(space => {
      const spaceLists = lists.filter(l => l.space_id === space.id).map(l => {
        const count = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE list_id = ?').get(l.id).c;
        return { ...l, taskCount: count };
      });
      return { ...space, lists: spaceLists };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/spaces', (req, res) => {
  try {
    const { name, color = '#7b68ee', icon = 'folder' } = req.body;
    const id = `space-${Date.now()}`;
    const ws = db.prepare('SELECT id FROM workspaces LIMIT 1').get();
    db.prepare('INSERT INTO spaces (id, workspace_id, name, color, icon) VALUES (?, ?, ?, ?, ?)')
      .run(id, ws ? ws.id : 'ws-default', name, color, icon);
    res.json({ id, name, color, icon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/spaces/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    db.prepare(`
      UPDATE spaces 
      SET name = COALESCE(?, name),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon)
      WHERE id = ?
    `).run(name || null, color || null, icon || null, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/spaces/:id', (req, res) => {
  try {
    const { id } = req.params;
    const lists = db.prepare('SELECT id FROM lists WHERE space_id = ?').all(id);
    for (const l of lists) {
      const tasks = db.prepare('SELECT id FROM tasks WHERE list_id = ?').all(l.id);
      for (const t of tasks) {
        db.prepare('DELETE FROM task_embeddings WHERE task_id = ?').run(t.id);
        db.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
      }
      db.prepare('DELETE FROM lists WHERE id = ?').run(l.id);
    }
    db.prepare('DELETE FROM spaces WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lists', (req, res) => {
  try {
    const { space_id, name, color = '#7b68ee' } = req.body;
    const id = `list-${Date.now()}`;
    db.prepare('INSERT INTO lists (id, space_id, name, color) VALUES (?, ?, ?, ?)')
      .run(id, space_id, name, color);
    res.json({ id, space_id, name, color });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lists/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    db.prepare(`
      UPDATE lists 
      SET name = COALESCE(?, name),
          color = COALESCE(?, color)
      WHERE id = ?
    `).run(name || null, color || null, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lists/:id', (req, res) => {
  try {
    const { id } = req.params;
    const tasks = db.prepare('SELECT id FROM tasks WHERE list_id = ?').all(id);
    for (const t of tasks) {
      db.prepare('DELETE FROM task_embeddings WHERE task_id = ?').run(t.id);
      db.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
    }
    db.prepare('DELETE FROM custom_fields WHERE list_id = ?').run(id);
    db.prepare('DELETE FROM lists WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lists/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    const origList = db.prepare('SELECT * FROM lists WHERE id = ?').get(id);
    if (!origList) return res.status(404).json({ error: 'List not found' });

    const newListId = `list-${Date.now()}`;
    db.prepare('INSERT INTO lists (id, space_id, name, color, position) VALUES (?, ?, ?, ?, ?)')
      .run(newListId, origList.space_id, `${origList.name} (Copy)`, origList.color, (origList.position || 0) + 1);

    // Copy tasks
    const tasks = db.prepare('SELECT * FROM tasks WHERE list_id = ?').all(id);
    for (const t of tasks) {
      const newTaskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      db.prepare(`
        INSERT INTO tasks (id, list_id, name, description, status, priority, due_date, start_date, assignee, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newTaskId, newListId, t.name, t.description, t.status, t.priority, t.due_date, t.start_date, t.assignee, t.position);

      // Copy subtasks
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(t.id);
      for (const s of subtasks) {
        db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, ?, ?)')
          .run(`sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, newTaskId, s.title, s.completed, s.position);
      }

      indexTask(newTaskId);
    }

    res.json({ success: true, id: newListId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. TASKS & CUSTOM FIELDS
// ==========================================

app.get('/api/tasks', (req, res) => {
  try {
    const { listId } = req.query;
    let query = 'SELECT * FROM tasks';
    const params = [];
    if (listId) {
      query += ' WHERE list_id = ?';
      params.push(listId);
    }
    query += ' ORDER BY position ASC, created_at DESC';
    const tasks = db.prepare(query).all(...params);

    // Fetch custom fields for this list
    let fields = [];
    if (listId) {
      fields = db.prepare('SELECT * FROM custom_fields WHERE list_id = ? ORDER BY position ASC').all(listId);
    }

    // Enrich tasks with subtasks, field values, and attachments
    const enrichedTasks = tasks.map(t => {
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(t.id);
      const fieldValues = db.prepare('SELECT * FROM task_field_values WHERE task_id = ?').all(t.id);
      const attachments = db.prepare('SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at DESC').all(t.id);
      
      const valuesMap = {};
      fieldValues.forEach(fv => { valuesMap[fv.field_id] = fv.value; });

      return {
        ...t,
        subtasks,
        fieldValues: valuesMap,
        attachments
      };
    });

    res.json({ tasks: enrichedTasks, fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/all', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, l.name as list_name, l.color as list_color, s.name as space_name, s.color as space_color
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      LEFT JOIN spaces s ON l.space_id = s.id
      ORDER BY t.due_date ASC, t.created_at DESC
    `).all();

    const enrichedTasks = tasks.map(t => {
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(t.id);
      return {
        ...t,
        subtasks
      };
    });

    res.json(enrichedTasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const {
      list_id,
      name,
      description = '',
      status = 'NOT STARTED',
      priority = 'Normal',
      due_date = null,
      start_date = null,
      assignee = 'JM',
      fieldValues = {},
      subtasks = []
    } = req.body;

    const id = `task-${Date.now()}`;
    const maxPos = db.prepare('SELECT MAX(position) as p FROM tasks WHERE list_id = ?').get(list_id).p || 0;

    db.prepare(`
      INSERT INTO tasks (id, list_id, name, description, status, priority, due_date, start_date, assignee, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, list_id, name, description, status, priority, due_date, start_date, assignee, maxPos + 1);

    // Insert field values
    const insertVal = db.prepare('INSERT INTO task_field_values (id, task_id, field_id, value) VALUES (?, ?, ?, ?)');
    for (const [fieldId, val] of Object.entries(fieldValues)) {
      insertVal.run(`tfv-${Date.now()}-${fieldId}`, id, fieldId, String(val));
    }

    // Insert subtasks
    const insertSub = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, ?, ?)');
    subtasks.forEach((st, idx) => {
      insertSub.run(`sub-${Date.now()}-${idx}`, id, typeof st === 'string' ? st : st.title, 0, idx);
    });

    // Auto-index into RAG Vector DB
    indexTask(id);

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      priority,
      due_date,
      start_date,
      assignee,
      fieldValues
    } = req.body;

    const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!currentTask) return res.status(404).json({ error: 'Task not found' });

    db.prepare(`
      UPDATE tasks 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          due_date = ?,
          start_date = ?,
          assignee = COALESCE(?, assignee),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name : null,
      description !== undefined ? description : null,
      status !== undefined ? status : null,
      priority !== undefined ? priority : null,
      due_date !== undefined ? due_date : currentTask.due_date,
      start_date !== undefined ? start_date : currentTask.start_date,
      assignee !== undefined ? assignee : null,
      id
    );

    // Update field values if provided
    if (fieldValues) {
      for (const [fieldId, val] of Object.entries(fieldValues)) {
        db.prepare('DELETE FROM task_field_values WHERE task_id = ? AND field_id = ?').run(id, fieldId);
        db.prepare('INSERT INTO task_field_values (id, task_id, field_id, value) VALUES (?, ?, ?, ?)')
          .run(`tfv-${Date.now()}-${fieldId}`, id, fieldId, String(val));
      }
    }

    // Auto-index into RAG Vector DB
    indexTask(id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    db.prepare('DELETE FROM task_embeddings WHERE task_id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move Task across lists/spaces
app.post('/api/tasks/:id/move', (req, res) => {
  try {
    const { id } = req.params;
    const { target_list_id } = req.body;
    db.prepare('UPDATE tasks SET list_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(target_list_id, id);
    indexTask(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate/Copy Task
app.post('/api/tasks/:id/copy', (req, res) => {
  try {
    const { id } = req.params;
    const { target_list_id, copy_subtasks = true, copy_attachments = true } = req.body;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newId = `task-${Date.now()}`;
    db.prepare(`
      INSERT INTO tasks (id, list_id, name, description, status, priority, due_date, start_date, assignee, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      target_list_id || task.list_id,
      `${task.name} (Copy)`,
      task.description,
      task.status,
      task.priority,
      task.due_date,
      task.start_date,
      task.assignee,
      task.position + 1
    );

    // Copy custom field values
    const fieldVals = db.prepare('SELECT * FROM task_field_values WHERE task_id = ?').all(id);
    const insertVal = db.prepare('INSERT INTO task_field_values (id, task_id, field_id, value) VALUES (?, ?, ?, ?)');
    for (const fv of fieldVals) {
      insertVal.run(`tfv-${Date.now()}-${fv.field_id}`, newId, fv.field_id, fv.value);
    }

    // Copy subtasks
    if (copy_subtasks) {
      const subs = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(id);
      const insertSub = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, ?, ?)');
      subs.forEach((s, idx) => {
        insertSub.run(`sub-${Date.now()}-${idx}`, newId, s.title, s.completed, s.position);
      });
    }

    // Copy attachments
    if (copy_attachments) {
      const atts = db.prepare('SELECT * FROM attachments WHERE task_id = ?').all(id);
      const insertAtt = db.prepare('INSERT INTO attachments (id, task_id, filename, original_name, mime_type, size, url) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const a of atts) {
        insertAtt.run(`att-${Date.now()}`, newId, a.filename, a.original_name, a.mime_type, a.size, a.url);
      }
    }

    indexTask(newId);
    res.json({ success: true, newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. SUBTASKS
// ==========================================

app.post('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const subId = `sub-${Date.now()}`;
    const maxPos = db.prepare('SELECT MAX(position) as p FROM subtasks WHERE task_id = ?').get(id).p || 0;
    db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, 0, ?)')
      .run(subId, id, title, maxPos + 1);
    indexTask(id);
    res.json({ id: subId, title, completed: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subtasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    const sub = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    if (!sub) return res.status(404).json({ error: 'Subtask not found' });

    db.prepare(`
      UPDATE subtasks 
      SET title = COALESCE(?, title),
          completed = COALESCE(?, completed)
      WHERE id = ?
    `).run(
      title !== undefined ? title : null,
      completed !== undefined ? (completed ? 1 : 0) : null,
      id
    );

    indexTask(sub.task_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subtasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const sub = db.prepare('SELECT task_id FROM subtasks WHERE id = ?').get(id);
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    if (sub) indexTask(sub.task_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. ATTACHMENTS (IMAGES)
// ==========================================

// Upload image file
app.post('/api/tasks/:id/attachments', upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    let filename, originalName, mimeType, size, fileUrl;

    if (req.file) {
      filename = req.file.filename;
      originalName = req.file.originalname;
      mimeType = req.file.mimetype;
      size = req.file.size;
      fileUrl = `/uploads/attachments/${filename}`;
    } else if (req.body.dataUrl) {
      // Base64 Paste from Clipboard
      const dataUrl = req.body.dataUrl;
      originalName = req.body.name || 'clipboard-image.png';
      mimeType = 'image/png';
      filename = `paste-${Date.now()}.png`;
      const filePath = path.join(ATTACHMENTS_DIR, filename);
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      size = fs.statSync(filePath).size;
      fileUrl = `/uploads/attachments/${filename}`;
    } else {
      return res.status(400).json({ error: 'No image provided' });
    }

    const attId = `att-${Date.now()}`;
    db.prepare(`
      INSERT INTO attachments (id, task_id, filename, original_name, mime_type, size, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(attId, id, filename, originalName, mimeType, size, fileUrl);

    res.json({ id: attId, filename, originalName, mimeType, size, url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/attachments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const att = db.prepare('SELECT filename FROM attachments WHERE id = ?').get(id);
    if (att) {
      const filePath = path.join(ATTACHMENTS_DIR, att.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. RAG & AI ASSISTANT
// ==========================================

app.get('/api/rag/search', (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q) return res.json([]);
    const results = semanticSearch(q, parseInt(limit));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. WINDOWS WALLPAPER
// ==========================================

app.get('/api/wallpaper/stocks', (req, res) => {
  res.json(STOCK_WALLPAPERS);
});

// Set wallpaper on Windows
app.post('/api/wallpaper/set', async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl) return res.status(400).json({ error: 'dataUrl is required' });

    const savedPath = saveWallpaperDataUrl(dataUrl);
    await setWindowsWallpaper(savedPath);

    res.json({ success: true, message: 'Windows desktop wallpaper updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload custom wallpaper background
app.post('/api/wallpaper/upload-custom', upload.single('wallpaper'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No wallpaper uploaded' });
    const url = `/uploads/attachments/${req.file.filename}`;
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. NOTIFICATIONS
// ==========================================

app.get('/api/notifications', (req, res) => {
  try {
    const tasks = db.prepare('SELECT id, name, due_date, status, priority FROM tasks WHERE status != "COMPLETED" AND due_date IS NOT NULL').all();
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const notifications = [];

    for (const t of tasks) {
      if (t.due_date < todayStr) {
        notifications.push({
          id: `notif-overdue-${t.id}`,
          taskId: t.id,
          title: '⚠️ งานเกินกำหนดส่ง (Overdue)',
          message: `งาน "${t.name}" ครบกำหนดส่งเมื่อ ${t.due_date}`,
          type: 'overdue',
          date: t.due_date
        });
      } else if (t.due_date === todayStr || t.due_date === tomorrow) {
        notifications.push({
          id: `notif-soon-${t.id}`,
          taskId: t.id,
          title: '⏰ งานใกล้ถึงกำหนดส่ง (Due Soon)',
          message: `งาน "${t.name}" มีกำหนดส่ง ${t.due_date === todayStr ? 'วันนี้!' : 'พรุ่งนี้'}`,
          type: 'due_soon',
          date: t.due_date
        });
      }
    }

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. SETTINGS
// ==========================================

app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM app_settings').all();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const updates = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    for (const [key, val] of Object.entries(updates)) {
      upsert.run(key, String(val));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8.5. AI & RAG ENDPOINTS
// ==========================================

// Semantic Vector RAG Search
app.get('/api/rag/search', (req, res) => {
  try {
    const { q, limit = 6 } = req.query;
    if (!q || !q.trim()) return res.json([]);
    const results = semanticSearch(q.trim(), parseInt(limit, 10) || 6);
    res.json(results);
  } catch (err) {
    console.error('Error in /api/rag/search:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Conversational Assistant with RAG context
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const ragResults = semanticSearch(lastUserMsg, 5);
    const ragContext = ragResults.map(r => `- [${r.status}] ${r.name} (Priority: ${r.priority || 'Normal'}, List: ${r.listName}): ${r.textChunk || ''}`).join('\n');
    
    const reply = await chatAssistant(messages, ragContext);
    res.json({
      reply: reply || 'ขออภัยครับ ไม่สามารถประมวลผลข้อความได้ในขณะนี้',
      sources: ragResults
    });
  } catch (err) {
    console.error('Error in /api/ai/chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Polish Title or Text
app.post('/api/ai/polish', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.json({ text: '' });
    const polished = await polishText(text.trim());
    res.json({ text: polished || text.trim() });
  } catch (err) {
    console.error('Error in /api/ai/polish:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Generate Subtasks Checklist
app.post('/api/ai/generate-subtasks', async (req, res) => {
  try {
    const { title, description = '' } = req.body;
    if (!title || !title.trim()) return res.json({ subtasks: [] });
    const subtasks = await generateSubtasks(title.trim(), description.trim());
    res.json({ subtasks: subtasks || [] });
  } catch (err) {
    console.error('Error in /api/ai/generate-subtasks:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Smart Auto-Fill (Priority, Severity, Suggested Days, and Auto Description)
app.post('/api/ai/autofill', async (req, res) => {
  try {
    const { title, description = '' } = req.body;
    if (!title || !title.trim()) {
      return res.json({ priority: 'Normal', severity: 'Low', suggestedDays: 7, description: '' });
    }
    const metadata = await autofillMetadata(title.trim());

    // Generate or enhance task description
    let enhancedDescription = '';
    const descPrompt = `วิเคราะห์ชื่องาน: "${title.trim()}" ${description ? 'รายละเอียดเดิม: ' + description.trim() : ''}
กรุณาเขียนคำอธิบายงานและแนวทางการปฏิบัติงาน (Scope of Work & Key Deliverables) สำหรับชิ้นงานนี้
สรุปเป็น 2-4 บรรทัด หรือรายการข้อที่กระชับ ชัดเจน เป็นภาษาไทยสำหรับฝ่ายบริหารและทีมงาน
ตอบเฉพาะเนื้อหาคำอธิบายเท่านั้น ไม่ต้องมีคำเกริ่น`;
    
    const descResult = await callLLM(descPrompt, 'คุณคือผู้จัดการโครงการมืออาชีพ');
    if (descResult && descResult.trim()) {
      enhancedDescription = descResult.trim();
    } else {
      enhancedDescription = `รายละเอียดการดำเนินงานสำหรับ: ${title.trim()}
- ตรวจสอบความถูกต้องและรวบรวมข้อมูลที่เกี่ยวข้อง
- ดำเนินการตามขั้นตอนและมาตรฐานของโครงการ
- ประเมินผลลัพธ์และสรุปรายงานเสนอฝ่ายบริหาร`;
    }

    res.json({
      priority: metadata.priority || 'Normal',
      severity: metadata.severity || 'Minor',
      suggestedDays: metadata.suggestedDays || 7,
      description: enhancedDescription
    });
  } catch (err) {
    console.error('Error in /api/ai/autofill:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. BACKUP, EXPORT & IMPORT
// ==========================================

const {
  createFullBackup,
  listBackups,
  restoreBackupData,
  exportListToCSV,
  importTasksFromCSV,
  BACKUP_DIR
} = require('./backupService');

app.get('/api/backup/list', (req, res) => {
  try {
    const list = listBackups();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/create', (req, res) => {
  try {
    const { note = 'manual' } = req.body;
    const backup = createFullBackup(note);
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/restore', (req, res) => {
  try {
    const { backupData, filename, mode = 'replace' } = req.body;
    let dataToRestore = backupData;

    if (!dataToRestore && filename) {
      const filePath = path.join(BACKUP_DIR, path.basename(filename));
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Backup file not found.' });
      }
      dataToRestore = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    const result = restoreBackupData(dataToRestore, mode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup/download/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }
    res.download(filePath, filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/csv', (req, res) => {
  try {
    const { listId = 'list-iqa26' } = req.query;
    const csvData = exportListToCSV(listId);
    const list = db.prepare('SELECT name FROM lists WHERE id = ?').get(listId);
    const safeName = (list ? list.name : 'tasks').replace(/[^\wก-๙]/g, '_');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}-tasks.csv"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/backup', (req, res) => {
  try {
    const backup = createFullBackup('export-download');
    res.download(backup.filePath, backup.filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import/csv', (req, res) => {
  try {
    const { listId, csvText } = req.body;
    if (!listId || !csvText) {
      return res.status(400).json({ error: 'listId and csvText are required.' });
    }
    const result = importTasksFromCSV(listId, csvText);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve production frontend if built
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`ClickUp Local Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
