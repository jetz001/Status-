const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { db } = require('./db');
const { indexTask, semanticSearch, reindexAll } = require('./ragService');
const { polishText, generateSubtasks, autofillMetadata, chatAssistant } = require('./aiService');
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

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const lastMsg = messages[messages.length - 1]?.content || '';
    
    // Perform RAG retrieval on the user's message
    const ragResults = semanticSearch(lastMsg, 4);
    const ragContext = ragResults.map(r => `• [${r.status}] ${r.name} (ความสำคัญ: ${r.priority}, กำหนดส่ง: ${r.dueDate || '-'}):\n  ${r.textChunk}`).join('\n\n');

    const reply = await chatAssistant(messages, ragContext);
    res.json({ reply, sources: ragResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/polish', async (req, res) => {
  try {
    const { text } = req.body;
    const polished = await polishText(text);
    res.json({ text: polished });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/generate-subtasks', async (req, res) => {
  try {
    const { title, description } = req.body;
    const subtasks = await generateSubtasks(title, description);
    res.json({ subtasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/autofill', async (req, res) => {
  try {
    const { title } = req.body;
    const data = await autofillMetadata(title);
    res.json(data);
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

// Add Custom Field
app.post('/api/lists/:listId/fields', (req, res) => {
  try {
    const { listId } = req.params;
    const { name, type = 'text', options = [] } = req.body;
    const id = `f-${Date.now()}`;
    const maxPos = db.prepare('SELECT MAX(position) as p FROM custom_fields WHERE list_id = ?').get(listId).p || 0;
    db.prepare('INSERT INTO custom_fields (id, list_id, name, type, options_json, position) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, listId, name, type, JSON.stringify(options), maxPos + 1);
    res.json({ id, list_id: listId, name, type, options_json: JSON.stringify(options) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`ClickUp Local Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
