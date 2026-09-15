const { db } = require('./db');

/**
 * Fast Lightweight Local Vectorizer (TF-IDF with subword / character n-grams)
 * Handles both Thai and English text with zero external dependencies.
 * Produces normalized vectors for Cosine Similarity calculation.
 */
class LocalVectorizer {
  tokenize(text) {
    if (!text) return [];
    const clean = text.toLowerCase().replace(/[\n\r\t]/g, ' ');
    // Extract alphanumeric words and 3-char n-grams for continuous Thai text
    const words = clean.split(/[\s\-_,.:;!?/()\[\]{}"]+/).filter(w => w.length > 0);
    const tokens = [...words];
    
    // Character 3-grams for non-spaced languages like Thai
    for (let i = 0; i < clean.length - 2; i++) {
      const gram = clean.slice(i, i + 3).trim();
      if (gram.length === 3 && !gram.includes(' ')) {
        tokens.push(`g:${gram}`);
      }
    }
    return tokens;
  }

  // Hash tokens into a fixed 256-dimensional float vector
  vectorize(text, dimensions = 256) {
    const tokens = this.tokenize(text);
    const vector = new Array(dimensions).fill(0);
    if (tokens.length === 0) return vector;

    for (const token of tokens) {
      // Simple stable hash function
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % dimensions;
      vector[index] += 1;
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        vector[i] /= norm;
      }
    }
    return vector;
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}

const vectorizer = new LocalVectorizer();

/**
 * Reindexes a single task into the SQLite vector store
 */
function indexTask(taskId) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    db.prepare('DELETE FROM task_embeddings WHERE task_id = ?').run(taskId);
    return;
  }

  // Get subtasks
  const subtasks = db.prepare('SELECT title, completed FROM subtasks WHERE task_id = ?').all(taskId);
  const subtasksText = subtasks.map(s => `[${s.completed ? 'x' : ' '}] ${s.title}`).join(', ');

  // Get custom field values
  const fields = db.prepare(`
    SELECT cf.name, tfv.value 
    FROM task_field_values tfv 
    JOIN custom_fields cf ON tfv.field_id = cf.id 
    WHERE tfv.task_id = ?
  `).all(taskId);
  const fieldsText = fields.map(f => `${f.name}: ${f.value}`).join(' | ');

  // Combined text chunk for embedding
  const chunkText = `ชื่องาน: ${task.name}\nคำอธิบาย: ${task.description || '-'}\nสถานะ: ${task.status}\nความสำคัญ: ${task.priority}\nผู้รับผิดชอบ: ${task.assignee || '-'}\nกำหนดส่ง: ${task.due_date || '-'}\nซับทาสก์: ${subtasksText || '-'}\nข้อมูลเพิ่มเติม: ${fieldsText || '-'}`;

  const vector = vectorizer.vectorize(chunkText);
  const vectorJson = JSON.stringify(vector);

  // Upsert into task_embeddings
  db.prepare('DELETE FROM task_embeddings WHERE task_id = ?').run(taskId);
  db.prepare(`
    INSERT INTO task_embeddings (id, task_id, text_chunk, vector_json, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(`emb-${taskId}`, taskId, chunkText, vectorJson);
}

/**
 * Indexes all tasks in the database
 */
function reindexAll() {
  const tasks = db.prepare('SELECT id FROM tasks').all();
  for (const t of tasks) {
    indexTask(t.id);
  }
  console.log(`Reindexed ${tasks.length} tasks into local vector database.`);
}

/**
 * Performs Semantic Vector Search across tasks
 */
function semanticSearch(query, limit = 5) {
  const queryVector = vectorizer.vectorize(query);
  const embeddings = db.prepare(`
    SELECT te.id, te.task_id, te.text_chunk, te.vector_json,
           t.name, t.status, t.priority, t.due_date, t.assignee, l.name as list_name
    FROM task_embeddings te
    JOIN tasks t ON te.task_id = t.id
    JOIN lists l ON t.list_id = l.id
  `).all();

  const results = [];

  for (const item of embeddings) {
    try {
      const itemVector = JSON.parse(item.vector_json);
      const similarity = vectorizer.cosineSimilarity(queryVector, itemVector);
      results.push({
        taskId: item.task_id,
        name: item.name,
        status: item.status,
        priority: item.priority,
        dueDate: item.due_date,
        assignee: item.assignee,
        listName: item.list_name,
        textChunk: item.text_chunk,
        score: Math.round(similarity * 1000) / 1000
      });
    } catch (e) {
      // ignore parse errors
    }
  }

  // Sort by similarity score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// Initial index run
reindexAll();

module.exports = {
  vectorizer,
  indexTask,
  reindexAll,
  semanticSearch
};
