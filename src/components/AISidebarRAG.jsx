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
  Check
} from 'lucide-react';

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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiReplying]);

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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
              type="button"
              onClick={handleStartNewChat}
              title="เริ่มแชทใหม่ (+ New Chat)"
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#242629] hover:bg-[#2d3034] text-cyan-300 text-[11px] font-medium transition cursor-pointer border border-[#383a3e]"
            >
              <Plus size={12} />
              <span>แชทใหม่</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d] transition cursor-pointer ml-1"
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
                  <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed">{m.content}</p>

                  {/* Action Cards (Tool Results & Confirmation) */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="pt-2 border-t border-[#333538] space-y-2">
                      {m.actions.map((act, actIdx) => {
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
                                <span>ลิสต์: {act.task.listName || 'IQA26'}</span>
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

                        // 5. Updated / General Action Card
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
            className="p-3 border-t border-[#2e3034] bg-[#18191b] flex items-center space-x-2"
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
              title="แนบไฟล์เอกสาร PDF หรือ รูปภาพ"
              className="p-2 text-gray-400 hover:text-cyan-300 hover:bg-[#25272a] rounded-md transition cursor-pointer flex-shrink-0"
            >
              <Paperclip size={16} />
            </button>

            <input 
              type="text"
              placeholder={attachedFile ? `กดส่งเพื่อวิเคราะห์ไฟล์ "${attachedFile.name}"...` : "พิมพ์คำสั่ง เช่น 'สร้างงาน A', 'ลบงาน B' หรือแนบ PDF..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-[#141517] px-3.5 py-2 rounded-md border border-[#333538] text-white text-xs outline-none focus:border-cyan-500 transition"
            />

            <button
              type="submit"
              disabled={isAiReplying || (!inputMessage.trim() && !attachedFile)}
              className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-md transition shadow-sm cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
