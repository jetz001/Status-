const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { db } = require('./db');

const ATTACHMENTS_DIR = path.join(__dirname, '..', 'uploads', 'attachments');
if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

/**
 * Extracts plain text from a PDF Buffer or file path.
 */
async function extractPdfText(bufferOrPath) {
  try {
    const buffer = Buffer.isBuffer(bufferOrPath) ? bufferOrPath : fs.readFileSync(bufferOrPath);
    const data = await pdf(buffer);
    return {
      text: data.text ? data.text.trim() : '',
      numPages: data.numpages || 1,
      info: data.info || {}
    };
  } catch (err) {
    console.error('Error extracting PDF text:', err);
    return { text: '', numPages: 0, error: err.message };
  }
}

/**
 * Saves a file buffer to uploads/attachments/
 */
function saveFileBuffer(buffer, originalName, mimeType) {
  const ext = path.extname(originalName) || (mimeType === 'application/pdf' ? '.pdf' : '.png');
  const filename = `file-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  const fullPath = path.join(ATTACHMENTS_DIR, filename);
  fs.writeFileSync(fullPath, buffer);
  const size = buffer.length;
  const url = `/uploads/attachments/${filename}`;

  return {
    filename,
    originalName,
    mimeType: mimeType || 'application/octet-stream',
    size,
    url,
    fullPath
  };
}

/**
 * Attach a saved file to a task in SQLite attachments table
 */
function attachFileToTask(taskId, fileInfo) {
  if (!taskId || !fileInfo) return null;
  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    db.prepare(`
      INSERT INTO attachments (id, task_id, filename, original_name, mime_type, size, url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, taskId, fileInfo.filename, fileInfo.originalName, fileInfo.mimeType, fileInfo.size, fileInfo.url);
    return id;
  } catch (err) {
    console.error('Error attaching file to task:', err);
    return null;
  }
}

/**
 * Prepares an attachment for AI understanding
 */
async function processFileForAI(file) {
  // file: { buffer, originalName, mimeType, fullPath }
  const isPdf = file.mimeType === 'application/pdf' || file.originalName?.toLowerCase().endsWith('.pdf');
  const isImage = file.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.originalName || '');

  if (isPdf) {
    const pdfData = await extractPdfText(file.fullPath || file.buffer);
    return {
      type: 'pdf',
      originalName: file.originalName,
      text: pdfData.text,
      numPages: pdfData.numPages,
      fileInfo: file
    };
  }

  if (isImage) {
    let base64Data = '';
    if (file.buffer) {
      base64Data = file.buffer.toString('base64');
    } else if (file.fullPath && fs.existsSync(file.fullPath)) {
      base64Data = fs.readFileSync(file.fullPath).toString('base64');
    }
    return {
      type: 'image',
      originalName: file.originalName,
      mimeType: file.mimeType,
      base64: base64Data,
      fileInfo: file
    };
  }

  return {
    type: 'other',
    originalName: file.originalName,
    fileInfo: file
  };
}

module.exports = {
  ATTACHMENTS_DIR,
  extractPdfText,
  saveFileBuffer,
  attachFileToTask,
  processFileForAI
};
