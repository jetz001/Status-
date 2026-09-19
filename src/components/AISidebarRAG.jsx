import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Plus, 
  RotateCcw, 
  MessageSquare, 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  AlertTriangle, 
  Trash2, 
  FolderPlus, 
  UploadCloud, 
  Check,
  Circle
} from 'lucide-react';

// Helper to format inline markdown like **bold**, *italic*
function formatInlineMarkup(text) {
  if (!text) return '';
  const parts = text.split(/(\*\*[^*]+?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function extractCleanContent(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  str = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  if (!str.startsWith('{') && !str.includes('"reply"')) {
    return str;
  }

  try {
    const parsed = JSON.parse(str);
    if (parsed && parsed.reply) {
      return typeof parsed.reply === 'string' ? parsed.reply : JSON.stringify(parsed.reply);
    }
  } catch (e) {}

  const replyIdx = str.indexOf('"reply"');
  if (replyIdx !== -1) {
    const afterReply = str.substring(replyIdx + 7);
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
  return str;
}

// Rich Visual Formatter for AI Responses
function FormattedAiMessage({ content, onSelectTaskById }) {
  const cleanContent = extractCleanContent(content);
  if (!cleanContent) return null;

  const lines = cleanContent.split('\n');
  const renderedBlocks = [];
  let currentTaskGroup = [];

  const flushTaskGroup = () => {
    if (currentTaskGroup.length > 0) {
      const tasksToRender = [...currentTaskGroup];
      currentTaskGroup = [];
      renderedBlocks.push(
        <div key={`task-group-${renderedBlocks.length}`} className="my-1.5 space-y-1">
          {tasksToRender.map((taskItem, tIdx) => (
            <div 
              key={tIdx}
              onClick={() => {
                if (taskItem.taskId && onSelectTaskById) {
                  onSelectTaskById(taskItem.taskId);
                }
              }}
              className="flex items-center justify-between py-1 px-2 rounded-md bg-[#181a1e] hover:bg-[#202227] border border-[#2b2d33] transition group cursor-pointer text-[11px]"
              title={taskItem.taskId ? 'คลิกเพื่อเปิดดูงาน' : ''}
            >
              <div className="flex items-center space-x-1.5 truncate flex-1">
                {taskItem.status === 'COMPLETED' ? (
                  <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                ) : taskItem.status === 'IN PROGRESS' ? (
                  <Clock size={12} className="text-blue-400 flex-shrink-0" />
                ) : (
                  <Circle size={10} className="text-gray-500 flex-shrink-0" />
                )}
                <span className={`truncate ${
                  taskItem.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-200 group-hover:text-cyan-300'
                }`}>
                  {taskItem.name}
                </span>
              </div>

              <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                {taskItem.status && (
                  <span className={`px-1 py-0.2 rounded text-[8.5px] font-medium ${
                    taskItem.status === 'COMPLETED' 
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                      : taskItem.status === 'IN PROGRESS'
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>
                    {taskItem.status}
                  </span>
                )}
                {taskItem.listName && (
                  <span className="px-1 py-0.2 rounded bg-[#202226] text-gray-400 text-[8.5px] border border-[#303338]">
                    {taskItem.listName}
                  </span>
                )}
                {taskItem.dueDate && (
                  <span className="text-[8.5px] text-gray-400 hidden sm:inline">
                    📅 {taskItem.dueDate}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. STATS BANNER: [STATS: total=4, completed=2, inProgress=1, notStarted=1, percent=50]
    const statsMatch = line.match(/\[STATS:\s*total=(\d+),\s*completed=(\d+),\s*inProgress=(\d+),\s*notStarted=(\d+),\s*percent=(\d+)\]/i);
    if (statsMatch) {
      flushTaskGroup();
      const total = parseInt(statsMatch[1]);
      const completed = parseInt(statsMatch[2]);
      const inProgress = parseInt(statsMatch[3]);
      const notStarted = parseInt(statsMatch[4]);
      const percent = parseInt(statsMatch[5]);

      renderedBlocks.push(
        <div key={`stats-${i}`} className="p-3 bg-[#151619] border border-[#2c2f34] rounded-xl space-y-2.5 my-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <Sparkles size={13} className="text-cyan-400" />
              <span>ภาพรวมความคืบหน้า (KPI Stats)</span>
            </span>
            <span className="text-xs font-bold text-cyan-400">{percent}% สำเร็จ</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#24262a] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500" 
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* 4 Metric Pills */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
            <div className="p-1.5 rounded-lg bg-[#1e2023] border border-[#2d3034]">
              <span className="text-gray-400 block text-[9px]">ทั้งหมด</span>
              <span className="font-bold text-white text-xs">{total}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-emerald-400 block text-[9px]">เสร็จสิ้น</span>
              <span className="font-bold text-emerald-300 text-xs">{completed}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-blue-950/30 border border-blue-500/30">
              <span className="text-blue-400 block text-[9px]">กำลังทำ</span>
              <span className="font-bold text-blue-300 text-xs">{inProgress}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/30">
              <span className="text-rose-400 block text-[9px]">ยังไม่เริ่ม</span>
              <span className="font-bold text-rose-300 text-xs">{notStarted}</span>
            </div>
          </div>
        </div>
      );
      continue;
    }

    // 2. Heading 3: ### Title
    if (line.startsWith('### ')) {
      flushTaskGroup();
      const title = line.replace(/^###\s+/, '');
      renderedBlocks.push(
        <div key={`h3-${i}`} className="pt-2 pb-1 border-b border-[#2d3035] mb-1.5">
          <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
            <span>{title}</span>
          </h4>
        </div>
      );
      continue;
    }

    // 3. Heading 4: #### Title
    if (line.startsWith('#### ')) {
      flushTaskGroup();
      const subtitle = line.replace(/^####\s+/, '');
      renderedBlocks.push(
        <div key={`h4-${i}`} className="pt-1.5 pb-0.5">
          <h5 className="text-[11px] font-semibold text-gray-300">{subtitle}</h5>
        </div>
      );
      continue;
    }

    // 4. Actual Task Item with explicit status and list: e.g. "• แจก % ... (สถานะ: COMPLETED, ลิสต์: QMS26)"
    const taskBulletMatch = line.match(/^[•\-\*]\s*(.+?)\s*\((?:สถานะ|status):\s*([^,]+?)(?:,\s*(?:ลิสต์|list):\s*([^,\)]+?))?(?:,\s*(?:กำหนดส่ง|due):\s*([^\)]+?))?\)$/i);
    if (taskBulletMatch && taskBulletMatch[2]) {
      const rawName = taskBulletMatch[1].replace(/\*\*/g, '').trim();
      const status = taskBulletMatch[2]?.trim().toUpperCase();
      const listName = taskBulletMatch[3]?.trim();
      const dueDate = taskBulletMatch[4]?.trim();

      currentTaskGroup.push({
        name: rawName,
        status: status || null,
        listName: listName || null,
        dueDate: dueDate || null
      });
      continue;
    }

    // 5. Callout Block: starts with "> " or "💡" or "คุณสามารถสั่งให้ผม:"
    if (line.startsWith('> ') || line.startsWith('💡') || line.startsWith('คุณสามารถสั่งให้ผม:')) {
      flushTaskGroup();
      const cleanCallout = line.replace(/^>\s*/, '');
      renderedBlocks.push(
        <div key={`callout-${i}`} className="p-2 rounded-lg bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/30 text-[11px] text-gray-300 space-y-0.5 my-1.5 leading-relaxed">
          {formatInlineMarkup(cleanCallout)}
        </div>
      );
      continue;
    }

    // 6. Indented sub-bullets / explanation lines (e.g. starts with "↳", or contains "เหตุผล:", "คำแนะนำ:", "แนะนำ:", "ตรวจสอบ:")
    const subBulletMatch = line.match(/^(?:[•\-\*]\s*)?(?:↳|->|\s{2,})?\s*(?:↳\s*)?(เหตุผล|คำแนะนำ|แนะนำ|ข้อสังเกต|ตรวจสอบ|หมายเหตุ)\s*[:\-]\s*(.+)/i)
      || line.match(/^(?:[•\-\*]\s*)?(?:↳|->)\s*(.+)/i);
    if (subBulletMatch) {
      flushTaskGroup();
      renderedBlocks.push(
        <div key={`sub-${i}`} className="flex items-start space-x-1.5 my-0.5 pl-4 text-[11px] text-gray-300/90 leading-relaxed">
          <span className="text-cyan-400/70 mt-0.5 flex-shrink-0 text-xs font-mono">↳</span>
          <span className="flex-1">{formatInlineMarkup(line.replace(/^[•\-\*]\s*/, '').replace(/^↳\s*/, ''))}</span>
        </div>
      );
      continue;
    }

    // 7. Numbered List Items: e.g. "1. ...", "1) ...", or "1️⃣ ..."
    const numMatch = line.match(/^(\d+)[\.\)]\s*(.+)/);
    if (numMatch) {
      flushTaskGroup();
      renderedBlocks.push(
        <div key={`num-${i}`} className="flex items-start space-x-1.5 my-0.5 pl-1 text-[11.5px] text-gray-200 leading-relaxed">
          <span className="text-cyan-400 font-semibold flex-shrink-0 text-xs min-w-[14px]">{numMatch[1]}.</span>
          <span className="flex-1">{formatInlineMarkup(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // 8. Regular Bullet Point: starts with "•", "-", "*"
    const bulletMatch = line.match(/^[•\-\*]\s*(.+)/);
    if (bulletMatch) {
      flushTaskGroup();
      renderedBlocks.push(
        <div key={`bullet-${i}`} className="flex items-start space-x-1.5 my-0.5 pl-1 text-[11.5px] text-gray-200 leading-relaxed">
          <span className="text-cyan-400 mt-1 flex-shrink-0 text-[9px]">•</span>
          <span className="flex-1">{formatInlineMarkup(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // 9. Regular Empty line
    if (!line) {
      flushTaskGroup();
      continue;
    }

    // 10. Regular paragraph / text line
    flushTaskGroup();
    renderedBlocks.push(
      <p key={`p-${i}`} className="text-[11.5px] text-gray-200 leading-relaxed my-0.5">
        {formatInlineMarkup(line)}
      </p>
    );
  }

  flushTaskGroup();

  return <div className="space-y-1">{renderedBlocks}</div>;
}

export default function AISidebarRAG({
  isOpen,
  onClose,
  onSelectTaskById,
  activeSessionId,
  onSessionChange,
  onHistoryUpdated,
  onDataChanged,
  activeListId,
  context
}) {
  const DEFAULT_GREETING = {
    role: 'assistant',
    content: 'สวัสดีครับ! ผมคือ AI Project Assistant มีอะไรให้ผมช่วยเหลือไหมครับ? คุณสามารถ:\n• พิมพ์สั่ง เพิ่ม / แก้ไข / ลบงาน\n• แนบไฟล์ PDF หรือ รูปภาพ เพื่อให้ผมช่วยวิเคราะห์และแยกเป็น Tasks/Checklist ให้อัตโนมัติ\n• ขอคำแนะนำ สรุปความคืบหน้า หรือสอบถามข้อมูลโปรเจกต์ได้ตลอดเวลาครับ'
  };

  // Chat State
  const [messages, setMessages] = useState([DEFAULT_GREETING]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  
  // File Attachment State
  const [attachedFile, setAttachedFile] = useState(null); // { file, name, size, type, previewUrl }
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiReplying]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [inputMessage]);

  // Handle Clipboard Paste (Ctrl+V) for cropped images & text
  const handlePaste = (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // 1. Check if clipboard has image (e.g. Snipping Tool / cropped screenshot)
    const items = clipboardData.items;
    let imageItem = null;
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type && item.type.startsWith('image/')) {
          imageItem = item;
          break;
        }
      }
    }

    if (imageItem) {
      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (!blob) return;

      const ext = blob.type.split('/')[1] || 'png';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
      const fileName = `clipboard-${timestamp}.${ext}`;
      const file = new File([blob], fileName, { type: blob.type || 'image/png' });
      const previewUrl = URL.createObjectURL(file);

      setAttachedFile({
        file,
        name: fileName,
        size: (file.size / 1024).toFixed(1) + ' KB',
        isPdf: false,
        isImg: true,
        previewUrl
      });
      return;
    }

    // 2. If it's text and active element is NOT an input/textarea, paste into inputMessage
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    if (!isInputFocused) {
      const text = clipboardData.getData('text');
      if (text) {
        e.preventDefault();
        setInputMessage(prev => prev ? `${prev}\n${text}` : text);
        textareaRef.current?.focus();
      }
    }
  };

  // Global Paste Listener when AI Sidebar is open
  useEffect(() => {
    if (!isOpen) return;

    const onGlobalPaste = (e) => {
      handlePaste(e);
    };

    window.addEventListener('paste', onGlobalPaste);
    return () => window.removeEventListener('paste', onGlobalPaste);
  }, [isOpen]);

  // Load session when activeSessionId changes
  useEffect(() => {
    if (!isOpen) return;

    if (!activeSessionId) {
      setMessages([DEFAULT_GREETING]);
      setSessionTitle('');
      return;
    }

    const loadSession = async () => {
      try {
        const res = await fetch(`/api/ai/history/${activeSessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.messages && data.messages.length > 0) {
            setMessages(data.messages);
            setSessionTitle(data.title || '');
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
      }
    };

    loadSession();
  }, [activeSessionId, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Start a fresh new chat
  const handleStartNewChat = () => {
    if (onSessionChange) onSessionChange(null);
    setMessages([DEFAULT_GREETING]);
    setSessionTitle('');
    setInputMessage('');
    setAttachedFile(null);
  };

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.startsWith('image/');
    
    let previewUrl = null;
    if (isImg) {
      previewUrl = URL.createObjectURL(file);
    }

    setAttachedFile({
      file,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      isPdf,
      isImg,
      previewUrl
    });

    // Reset input value so same file can be selected again if needed
    e.target.value = '';
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImg = file.type.startsWith('image/');
      let previewUrl = isImg ? URL.createObjectURL(file) : null;
      setAttachedFile({
        file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        isPdf,
        isImg,
        previewUrl
      });
    }
  };

  // Send Message with optional file
  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim() && !attachedFile) return;

    const userMsgObj = {
      role: 'user',
      content: query.trim() || (attachedFile ? `วิเคราะห์และแยกงานจากไฟล์: ${attachedFile.name}` : ''),
      attachment: attachedFile ? { name: attachedFile.name, isPdf: attachedFile.isPdf, isImg: attachedFile.isImg } : null
    };

    const newMsgs = [...messages, userMsgObj];
    setMessages(newMsgs);
    setInputMessage('');
    const fileToSend = attachedFile?.file;
    setAttachedFile(null);
    setIsAiReplying(true);

    try {
      const formData = new FormData();
      formData.append('message', userMsgObj.content);
      formData.append('sessionId', activeSessionId || '');
      formData.append('activeListId', activeListId || '');
      formData.append('context', context || '');
      if (fileToSend) {
        formData.append('file', fileToSend);
      }

      const res = await fetch('/api/ai/agent-chat', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      const assistantReply = {
        role: 'assistant',
        content: data.reply || 'ดำเนินการเรียบร้อยครับ',
        skill: data.skill || null,
        actions: data.actions || []
      };

      setMessages(prev => [...prev, assistantReply]);

      if (data.sessionId && !activeSessionId && onSessionChange) {
        onSessionChange(data.sessionId);
      }

      // If data was mutated, trigger live UI refresh across the app!
      if (data.actions && data.actions.length > 0) {
        const hasMutations = data.actions.some(a => a.action || a.success);
        if (hasMutations && onDataChanged) {
          onDataChanged();
        }
      }

      if (onHistoryUpdated) {
        onHistoryUpdated();
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาลองใหม่อีกครั้งครับ'
        }
      ]);
    } finally {
      setIsAiReplying(false);
    }
  };

  // Confirm destructive action (e.g. delete_task)
  const handleConfirmAction = async (msgIdx, actIdx, action) => {
    try {
      const res = await fetch('/api/ai/confirm-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: action.actionType,
          payload: action.payload
        })
      });
      const result = await res.json();

      if (result.success) {
        // Update action state in message to resolved
        setMessages(prev => {
          const cloned = [...prev];
          if (cloned[msgIdx]?.actions?.[actIdx]) {
            cloned[msgIdx].actions[actIdx] = {
              ...result,
              requiresConfirmation: false,
              resolvedMessage: result.message || 'ดำเนินการเรียบร้อยแล้ว'
            };
          }
          return cloned;
        });

        // Notify app of data change
        if (onDataChanged) onDataChanged();
        if (onHistoryUpdated) onHistoryUpdated();
      }
    } catch (err) {
      console.error('Error confirming action:', err);
    }
  };

  // Execute approved plan (create task in selected list)
  const handleExecuteApprovedPlan = async (msgIdx, actIdx, plan, targetListId) => {
    try {
      const isMulti = Array.isArray(plan.tasks) && plan.tasks.length > 1;
      const res = await fetch('/api/ai/confirm-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: isMulti ? 'create_tasks' : 'create_task',
          payload: {
            list_id: targetListId || plan.defaultListId,
            tasks: plan.tasks || [],
            name: plan.name,
            description: plan.description || '',
            priority: plan.priority || 'Normal',
            due_date: plan.due_date || null,
            subtasks: plan.subtasks || [],
            fileInfo: plan.fileInfo || null
          }
        })
      });
      const result = await res.json();

      if (result.success) {
        setMessages(prev => {
          const cloned = [...prev];
          if (cloned[msgIdx]?.actions?.[actIdx]) {
            cloned[msgIdx].actions[actIdx] = {
              ...result,
              action: isMulti ? 'created_tasks' : 'created_task',
              resolvedMessage: result.message || (isMulti ? `สร้างงานทั้งหมด ${plan.tasks.length} รายการสำเร็จแล้ว` : `สร้างงาน "${plan.name}" สำเร็จแล้ว`)
            };
          }
          return cloned;
        });

        if (onDataChanged) onDataChanged();
        if (onHistoryUpdated) onHistoryUpdated();
      }
    } catch (err) {
      console.error('Error executing approved plan:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay: click outside to close */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-40 transition-opacity"
        title="คลิกด้านนอกเพื่อปิด AI Assistant"
      />

      <div 
        id="ai-sidebar-panel"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className="fixed inset-y-0 right-0 w-[470px] max-w-full bg-[#18191b] border-l border-[#333538] shadow-2xl z-50 flex flex-col text-xs select-none relative"
      >
        {/* Drag Overlay visual indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-cyan-950/80 border-2 border-dashed border-cyan-400 z-50 flex flex-col items-center justify-center space-y-3 pointer-events-none backdrop-blur-xs">
            <UploadCloud size={40} className="text-cyan-300 animate-bounce" />
            <p className="text-sm font-bold text-white">วางไฟล์ PDF หรือ รูปภาพที่นี่เพื่อส่งให้ AI วิเคราะห์</p>
          </div>
        )}

        {/* Header */}
        <div className="p-3.5 border-b border-[#2e3034] flex items-center justify-between bg-[#141517]">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles size={15} />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs flex items-center space-x-1.5 truncate max-w-[220px]">
                <span>{sessionTitle || 'AI Agentic Assistant'}</span>
              </h3>
              <span className="text-[10px] text-gray-400">สั่งจัดการงาน • วิเคราะห์เอกสาร • วางแผน</span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button 
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d] transition cursor-pointer"
              title="ปิด (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* AI Chat Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, msgIdx) => (
              <div 
                key={msgIdx} 
                className={`flex space-x-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 flex-shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}
                
                <div className={`p-3 rounded-lg max-w-[88%] space-y-2.5 leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-[#7b68ee] text-white' 
                    : 'bg-[#202225] text-gray-200 border border-[#333538]'
                }`}>
                  {/* Skill Badge if present on assistant response */}
                  {m.skill && (
                    <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                      <Sparkles size={10} />
                      <span>สกิล: {m.skill.label}</span>
                    </div>
                  )}

                  {/* Attached file chip in user message */}
                  {m.attachment && (
                    <div className="flex items-center space-x-2 px-2 py-1 bg-white/10 rounded text-[11px] font-medium">
                      {m.attachment.isPdf ? <FileText size={13} className="text-amber-300" /> : <ImageIcon size={13} className="text-pink-300" />}
                      <span className="truncate">{m.attachment.name}</span>
                    </div>
                  )}

                  {/* Main Message Text */}
                  {m.role === 'assistant' ? (
                    <FormattedAiMessage content={m.content} onSelectTaskById={onSelectTaskById} />
                  ) : (
                    <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed">{m.content}</p>
                  )}

                  {/* Action Cards (Tool Results & Confirmation) */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="pt-2 border-t border-[#333538] space-y-2">
                      {m.actions.map((act, actIdx) => {
                        // 0. Plan Proposal Card (Grill-me & Approval)
                        if (act.action === 'plan_proposal' && act.plan) {
                          return (
                            <div key={actIdx} className="p-3 bg-[#16181b] border border-cyan-500/40 rounded-xl space-y-2.5 shadow-md">
                              <div className="flex items-center justify-between border-b border-[#2d3035] pb-2">
                                <span className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                                  <Sparkles size={14} className="text-cyan-400" />
                                  <span>📋 ร่างแผนงาน (รออนุมัติก่อนสร้าง)</span>
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-semibold">
                                  Grill-me Plan
                                </span>
                              </div>

                              {/* Plan Details (Multi-Task or Single Task) */}
                              {act.plan.tasks && act.plan.tasks.length > 1 ? (
                                <div className="space-y-2 text-[11px]">
                                  <div className="flex items-center justify-between text-gray-400 font-medium pb-1 border-b border-[#2d3035]">
                                    <span className="text-cyan-300 font-semibold">📋 พบรายการงานทั้งหมด {act.plan.tasks.length} งาน:</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-300 font-semibold border border-cyan-500/30">
                                      {act.plan.tasks.length} Tasks Batch
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                    {act.plan.tasks.map((taskItem, tIdx) => (
                                      <div key={tIdx} className="bg-[#1b1e23] p-2 rounded-lg border border-[#2d3038] space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold text-white text-[11px] flex items-center space-x-1.5">
                                            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] flex items-center justify-center font-bold">
                                              {tIdx + 1}
                                            </span>
                                            <span>{taskItem.name}</span>
                                          </span>
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#26282f] text-gray-400 font-medium">
                                            {taskItem.priority || 'Normal'}
                                          </span>
                                        </div>
                                        {taskItem.description && (
                                          <p className="text-[10px] text-gray-400 pl-5 leading-tight">{taskItem.description}</p>
                                        )}
                                        {taskItem.subtasks && taskItem.subtasks.length > 0 && (
                                          <div className="pl-5 pt-0.5 space-y-0.5">
                                            {taskItem.subtasks.map((st, sIdx) => (
                                              <div key={sIdx} className="flex items-center space-x-1 text-gray-400 text-[10px]">
                                                <Circle size={6} className="text-cyan-400/70 flex-shrink-0" />
                                                <span>{typeof st === 'string' ? st : st.title}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5 text-[11px]">
                                  <div>
                                    <span className="text-gray-400 font-medium">ชื่องานที่แนะนำ:</span>{' '}
                                    <span className="text-white font-semibold">{act.plan.name}</span>
                                  </div>
                                  {act.plan.description && (
                                    <div className="text-gray-300 bg-[#1f2126] p-2 rounded border border-[#2f3238] text-[10.5px] leading-relaxed">
                                      {act.plan.description}
                                    </div>
                                  )}
                                  {act.plan.subtasks && act.plan.subtasks.length > 0 && (
                                    <div className="space-y-1 pt-1">
                                      <span className="text-gray-400 font-medium text-[10.5px]">Checklist แนะนำ ({act.plan.subtasks.length} ข้อ):</span>
                                      <div className="space-y-1 pl-1">
                                        {act.plan.subtasks.map((st, sIdx) => (
                                          <div key={sIdx} className="flex items-center space-x-1.5 text-gray-300 text-[10.5px]">
                                            <Circle size={8} className="text-cyan-400/80 flex-shrink-0" />
                                            <span>{typeof st === 'string' ? st : st.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Target Space & List Selector / Quick Selection */}
                              {act.availableLists && act.availableLists.length > 0 && (
                                <div className="pt-2 border-t border-[#2d3035] space-y-1.5">
                                  <span className="text-[10.5px] text-gray-400 block font-medium">
                                    🎯 เลือก Space / List ที่ต้องการนำงานนี้ไปบรรจุ:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {act.availableLists.map((item, lIdx) => (
                                      <button
                                        key={lIdx}
                                        type="button"
                                        onClick={() => handleExecuteApprovedPlan(msgIdx, actIdx, act.plan, item.listId)}
                                        className="px-2.5 py-1 rounded-md bg-[#222428] hover:bg-cyan-600 hover:text-white text-gray-200 border border-[#363a40] hover:border-cyan-400 transition text-[10.5px] flex items-center space-x-1 cursor-pointer"
                                        title={`คลิกเพื่อสร้างงานใน "${item.spaceName} › ${item.listName}"`}
                                      >
                                        <span className="text-cyan-400 text-[9px] font-semibold">{item.spaceName} ›</span>
                                        <span className="font-medium">{item.listName}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Footer */}
                              <div className="flex items-center justify-between pt-2 border-t border-[#2d3035]">
                                <span className="text-[10px] text-gray-500 italic">* สามารถพิมพ์บอก AI เพื่อปรับแก้แผนก่อนได้ครับ</span>
                                <button
                                  type="button"
                                  onClick={() => handleExecuteApprovedPlan(msgIdx, actIdx, act.plan, act.plan.defaultListId || act.availableLists?.[0]?.listId)}
                                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold text-[11px] transition shadow-sm cursor-pointer flex items-center space-x-1"
                                >
                                  <Check size={13} />
                                  <span>
                                    {act.plan.tasks && act.plan.tasks.length > 1
                                      ? `อนุมัติสร้างทั้งหมด (${act.plan.tasks.length} งาน)`
                                      : 'อนุมัติสร้างงานตามแผน'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // 1. Pending Confirmation Card (Destructive Delete Action)
                        if (act.requiresConfirmation) {
                          return (
                            <div key={actIdx} className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-lg space-y-2">
                              <div className="flex items-start space-x-2">
                                <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-amber-200 text-xs">{act.title}</p>
                                  <p className="text-gray-300 text-[11px]">{act.message}</p>
                                </div>
                              </div>
                              <div className="flex justify-end space-x-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAction(msgIdx, actIdx, act)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-medium text-[11px] transition shadow-sm cursor-pointer flex items-center space-x-1"
                                >
                                  <Trash2 size={11} />
                                  <span>ยืนยันการลบ</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // 2. Resolved Delete Card
                        if (act.action === 'deleted_task' || act.resolvedMessage) {
                          return (
                            <div key={actIdx} className="p-2 bg-emerald-950/20 border border-emerald-500/30 rounded text-[11px] text-emerald-300 flex items-center space-x-1.5">
                              <CheckCircle2 size={13} />
                              <span>{act.message || act.resolvedMessage}</span>
                            </div>
                          );
                        }

                        // 3. Created Task Card
                        if (act.action === 'created_task' && act.task) {
                          return (
                            <div 
                              key={actIdx}
                              onClick={() => onSelectTaskById && onSelectTaskById(act.task.id)}
                              className="p-2.5 bg-[#18191b] border border-cyan-500/30 hover:border-cyan-400 rounded-lg cursor-pointer transition space-y-1 group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold text-xs group-hover:text-cyan-200">
                                  <CheckCircle2 size={13} className="text-emerald-400" />
                                  <span className="truncate">{act.task.name}</span>
                                </div>
                                <span className="text-[10px] text-cyan-400 flex items-center space-x-0.5">
                                  <span>เปิดดู</span>
                                  <ExternalLink size={10} />
                                </span>
                              </div>

                              <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                                <span>ลิสต์: {act.task.listName || 'General'}</span>
                                <span>•</span>
                                <span className={act.task.priority === 'Urgent' ? 'text-red-400 font-bold' : ''}>
                                  ความสำคัญ: {act.task.priority}
                                </span>
                                {act.task.dueDate && (
                                  <>
                                    <span>•</span>
                                    <span>ส่ง: {act.task.dueDate}</span>
                                  </>
                                )}
                                {act.task.hasAttachment && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-400">📎 มีไฟล์แนบ</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // 4. Created Project Card
                        if (act.action === 'created_project' && act.project) {
                          return (
                            <div key={actIdx} className="p-2 bg-[#18191b] border border-purple-500/30 rounded-lg space-y-1">
                              <div className="flex items-center space-x-1.5 text-purple-300 font-semibold text-xs">
                                <FolderPlus size={13} className="text-purple-400" />
                                <span>โปรเจกต์: {act.project.listName} (Space: {act.project.spaceName})</span>
                              </div>
                              <p className="text-[10px] text-gray-400">สร้างเรียบร้อยแล้ว พร้อม {act.project.taskCount} งานเริ่มต้น</p>
                            </div>
                          );
                        }

                        // 5. Ignore project_overview since it is already rendered in message
                        if (act.action === 'project_overview') return null;

                        // 6. Updated / General Action Card
                        return (
                          <div key={actIdx} className="p-2 bg-[#18191b] border border-[#333538] rounded text-[11px] text-gray-300 flex items-center space-x-1.5">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>{act.message}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 text-[10px] font-bold shadow-sm">
                    U
                  </div>
                )}
              </div>
            ))}

            {isAiReplying && (
              <div className="flex space-x-2 items-center text-cyan-300 text-xs italic">
                <Sparkles size={13} className="animate-spin text-cyan-400" />
                <span>AI กำลังวิเคราะห์ข้อมูลและเรียกใช้ Tools...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 border-t border-[#2e3034] bg-[#161719] flex space-x-1.5 overflow-x-auto text-[11px]">
            <button 
              type="button"
              onClick={() => handleSendMessage('สรุปภาพรวมและสถานะงานทั้งหมดในระบบ')}
              className="px-2.5 py-1 bg-[#222427] hover:bg-[#2c2e33] text-gray-300 rounded whitespace-nowrap transition cursor-pointer"
            >
              📊 สรุปงานทั้งหมด
            </button>
            <button 
              type="button"
              onClick={() => handleSendMessage('งานไหนใกล้ถึงกำหนดส่ง หรือมีความสำคัญระดับ Urgent?')}
              className="px-2.5 py-1 bg-[#222427] hover:bg-[#2c2e33] text-gray-300 rounded whitespace-nowrap transition cursor-pointer"
            >
              ⏰ งานด่วน Due Soon
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 rounded whitespace-nowrap transition cursor-pointer flex items-center space-x-1"
            >
              <FileText size={11} />
              <span>📄 แนบ PDF/รูปแยกงาน</span>
            </button>
          </div>

          {/* File Attachment Preview Chip (Above input) */}
          {attachedFile && (
            <div className="px-3 py-1.5 bg-[#141517] border-t border-[#2e3034] flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                {attachedFile.previewUrl ? (
                  <img src={attachedFile.previewUrl} alt="Preview" className="w-7 h-7 rounded object-cover border border-[#383a3e]" />
                ) : (
                  <div className="p-1 rounded bg-amber-500/10 text-amber-400">
                    <FileText size={14} />
                  </div>
                )}
                <div className="truncate">
                  <span className="text-xs text-white font-medium block truncate max-w-[280px]">
                    {attachedFile.name}
                  </span>
                  <span className="text-[10px] text-gray-400">{attachedFile.size}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-[#2a2b2d] transition"
                title="ลบไฟล์แนบ"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Chat Input Box */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="p-3 border-t border-[#2e3034] bg-[#18191b] flex items-end space-x-2"
          >
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".pdf,image/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />

            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="แนบไฟล์เอกสาร PDF หรือ รูปภาพ (หรือกด Ctrl+V เพื่อวางรูป)"
              className="p-2 text-gray-400 hover:text-cyan-300 hover:bg-[#25272a] rounded-md transition cursor-pointer flex-shrink-0 mb-0.5"
            >
              <Paperclip size={16} />
            </button>

            <textarea 
              ref={textareaRef}
              rows={1}
              placeholder={attachedFile ? `กดส่งเพื่อวิเคราะห์ไฟล์ "${attachedFile.name}"...` : "พิมพ์คำสั่ง หรือกด Ctrl+V วางรูปภาพ/ข้อความ..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              onPaste={handlePaste}
              className="flex-1 bg-[#141517] px-3.5 py-2 rounded-md border border-[#333538] text-white text-xs outline-none focus:border-cyan-500 transition resize-none max-h-32 min-h-[38px] leading-relaxed custom-scrollbar"
            />

            <button
              type="submit"
              disabled={isAiReplying || (!inputMessage.trim() && !attachedFile)}
              className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-md transition shadow-sm cursor-pointer flex-shrink-0 mb-0.5"
              title="ส่งคำสั่ง (Enter)"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
