import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Trash2, 
  Copy, 
  ArrowRightLeft, 
  Printer, 
  Sparkles, 
  Calendar, 
  Flag, 
  User, 
  CheckSquare, 
  Plus, 
  Upload, 
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

export default function TaskDrawer({
  task,
  fields = [],
  onClose,
  onUpdateTask,
  onDeleteTask,
  onOpenMoveCopy,
  onOpenPrintSingleTask,
  onOpenLightbox
}) {
  const [name, setName] = useState(task.name || '');
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status || 'NOT STARTED');
  const [priority, setPriority] = useState(task.priority || 'Normal');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [assignee, setAssignee] = useState(task.assignee || 'JM');
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [fieldValues, setFieldValues] = useState(task.fieldValues || {});
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setName(task.name || '');
    setDescription(task.description || '');
    setStatus(task.status || 'NOT STARTED');
    setPriority(task.priority || 'Normal');
    setDueDate(task.due_date || '');
    setAssignee(task.assignee || 'JM');
    setSubtasks(task.subtasks || []);
    setFieldValues(task.fieldValues || {});
    setAttachments(task.attachments || []);
  }, [task]);

  // Listen for Ctrl+V (Paste image from clipboard)
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target.result;
            try {
              const res = await fetch(`/api/tasks/${task.id}/attachments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataUrl, name: `pasted-image-${Date.now()}.png` })
              });
              const data = await res.json();
              if (data.id) {
                setAttachments(prev => [data, ...prev]);
              }
            } catch (err) {
              console.error('Failed to upload pasted image:', err);
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [task.id]);

  const handleSave = () => {
    onUpdateTask(task.id, {
      name,
      description,
      status,
      priority,
      due_date: dueDate || null,
      assignee,
      fieldValues
    });
  };

  // Subtask actions
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle.trim() })
      });
      const data = await res.json();
      setSubtasks(prev => [...prev, data]);
      setNewSubtaskTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (subId, currentCompleted) => {
    try {
      await fetch(`/api/subtasks/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted })
      });
      setSubtasks(prev => prev.map(s => s.id === subId ? { ...s, completed: !currentCompleted ? 1 : 0 } : s));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (subId) => {
    try {
      await fetch(`/api/subtasks/${subId}`, { method: 'DELETE' });
      setSubtasks(prev => prev.filter(s => s.id !== subId));
    } catch (err) {
      console.error(err);
    }
  };

  // Upload file handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.id) {
        setAttachments(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const handleDeleteAttachment = async (attId) => {
    try {
      await fetch(`/api/attachments/${attId}`, { method: 'DELETE' });
      setAttachments(prev => prev.filter(a => a.id !== attId));
    } catch (err) {
      console.error(err);
    }
  };

  // AI Assistance triggers
  const handleAiPolishTitle = async () => {
    if (!name) return;
    setIsAiLoading(true);
    setAiNotice('');
    try {
      const res = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: name })
      });
      const data = await res.json();
      if (data.text) {
        setName(data.text);
        onUpdateTask(task.id, { name: data.text });
        setAiNotice('✨ ปรับปรุงชื่องานด้วย AI สำเร็จแล้ว!');
        setTimeout(() => setAiNotice(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setAiNotice('⚠️ ไม่สามารถเรียกใช้งาน AI ได้');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiGenerateSubtasks = async () => {
    setIsAiLoading(true);
    setAiNotice('');
    try {
      const res = await fetch('/api/ai/generate-subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, description })
      });
      const data = await res.json();
      if (data.subtasks && data.subtasks.length > 0) {
        for (const st of data.subtasks) {
          const subRes = await fetch(`/api/tasks/${task.id}/subtasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: st })
          });
          const created = await subRes.json();
          setSubtasks(prev => [...prev, created]);
        }
        setAiNotice(`✨ AI แตกซับทาสก์สำเร็จ เพิ่ม ${data.subtasks.length} รายการ!`);
        setTimeout(() => setAiNotice(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setAiNotice('⚠️ ไม่สามารถเรียกใช้งาน AI ได้');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiAutofill = async () => {
    setIsAiLoading(true);
    setAiNotice('');
    try {
      const res = await fetch('/api/ai/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, description })
      });
      const data = await res.json();
      const updates = {};

      if (data.priority) {
        setPriority(data.priority);
        updates.priority = data.priority;
      }
      if (data.description) {
        setDescription(data.description);
        updates.description = data.description;
      }
      if (data.suggestedDays && !dueDate) {
        const d = new Date(Date.now() + 86400000 * data.suggestedDays);
        const dateStr = d.toISOString().split('T')[0];
        setDueDate(dateStr);
        updates.due_date = dateStr;
      }
      if (data.severity) {
        const sevField = fields.find(f => f.name.includes('Severity'));
        if (sevField) {
          setFieldValues(prev => ({ ...prev, [sevField.id]: data.severity }));
        }
      }

      onUpdateTask(task.id, updates);
      setAiNotice('✨ AI Auto-Fill เติมรายละเอียดและปรับแต่งข้อมูลให้แล้ว!');
      setTimeout(() => setAiNotice(''), 4000);
    } catch (err) {
      console.error(err);
      setAiNotice('⚠️ ไม่สามารถเรียกใช้งาน AI ได้');
    } finally {
      setIsAiLoading(false);
    }
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className="fixed inset-y-0 right-0 w-[580px] max-w-full bg-[#1e1f21] border-l border-[#333538] shadow-2xl z-40 flex flex-col text-xs select-none">
      {/* Header Bar */}
      <div className="p-3 border-b border-[#333538] flex items-center justify-between bg-[#18191b]">
        <div className="flex items-center space-x-2">
          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1 rounded font-bold text-[11px] outline-none cursor-pointer bg-[#222427] text-white border border-[#383a3e]"
          >
            <option value="NOT STARTED">NOT STARTED</option>
            <option value="IN PROGRESS">IN PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-2 py-1 bg-[#222427] text-gray-200 border border-[#383a3e] rounded text-xs outline-none"
          >
            <option value="Urgent">🚩 Urgent</option>
            <option value="High">🚩 High</option>
            <option value="Normal">🚩 Normal</option>
            <option value="Low">🚩 Low</option>
          </select>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onOpenPrintSingleTask(task)}
            title="พิมพ์ใบทาสก์ออกเป็น PDF"
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d] transition"
          >
            <Printer size={15} />
          </button>
          <button 
            onClick={() => onOpenMoveCopy(task)}
            title="ย้ายหรือก๊อบปี้งานข้ามโปรเจกต์"
            className="p-1.5 text-gray-400 hover:text-blue-400 rounded hover:bg-[#2a2b2d] transition"
          >
            <ArrowRightLeft size={15} />
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            title="ลบงาน"
            className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-[#2a2b2d] transition"
          >
            <Trash2 size={15} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d] transition"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* AI Processing Banner */}
      {isAiLoading && (
        <div className="px-4 py-2 bg-purple-950/50 border-b border-purple-500/40 text-purple-200 text-xs flex items-center space-x-2 animate-pulse">
          <Sparkles size={14} className="text-purple-400 animate-spin flex-shrink-0" />
          <span>AI กำลังประมวลผลและวิเคราะห์ข้อมูล กรุณารอสักครู่...</span>
        </div>
      )}

      {/* AI Success / Alert Banner */}
      {aiNotice && !isAiLoading && (
        <div className="px-4 py-2 bg-emerald-950/60 border-b border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 truncate">
            <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
            <span className="font-medium truncate">{aiNotice}</span>
          </div>
          <button 
            onClick={() => setAiNotice('')} 
            className="text-emerald-400 hover:text-white text-[11px] px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Body Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Title input with AI Polish */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">ชื่องาน (Title)</label>
            <button
              type="button"
              disabled={isAiLoading}
              onClick={handleAiPolishTitle}
              className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 font-medium transition"
            >
              <Sparkles size={13} className={isAiLoading ? 'animate-spin' : ''} />
              <span>✨ AI Polish</span>
            </button>
          </div>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-base font-bold bg-[#141517] p-2.5 rounded border border-[#333538] focus:border-[#7b68ee] text-white outline-none"
          />
        </div>

        {/* Metadata row (Assignee & Due Date) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-400 flex items-center space-x-1">
              <User size={12} />
              <span>ผู้รับผิดชอบ (Assignee)</span>
            </label>
            <input 
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full bg-[#141517] p-2 rounded border border-[#333538] text-white outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-400 flex items-center space-x-1">
              <Calendar size={12} />
              <span>วันกำหนดส่ง (Due Date)</span>
            </label>
            <input 
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#141517] p-2 rounded border border-[#333538] text-white outline-none"
            />
          </div>
        </div>

        {/* Dynamic Custom Fields */}
        {fields.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[#2e3034]">
            <h4 className="font-semibold text-gray-300 text-xs">Custom Fields</h4>
            <div className="grid grid-cols-2 gap-3">
              {fields.map(f => {
                let options = [];
                try { options = JSON.parse(f.options_json || '[]'); } catch (e) {}
                const val = fieldValues[f.id] || '';

                return (
                  <div key={f.id} className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-medium">{f.name}</label>
                    {f.type === 'select' && options.length > 0 ? (
                      <select
                        value={val}
                        onChange={(e) => setFieldValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                        className="w-full bg-[#141517] p-2 rounded border border-[#333538] text-white outline-none"
                      >
                        <option value="">-- เลือก --</option>
                        {options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type={f.type === 'date' ? 'date' : 'text'}
                        value={val}
                        onChange={(e) => setFieldValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                        className="w-full bg-[#141517] p-2 rounded border border-[#333538] text-white outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5 pt-2 border-t border-[#2e3034]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">คำอธิบายและบันทึกงาน (Description)</label>
            <button 
              type="button"
              disabled={isAiLoading}
              onClick={handleAiAutofill}
              className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 font-medium transition"
            >
              <Sparkles size={12} />
              <span>✨ AI Smart Auto-Fill</span>
            </button>
          </div>
          <textarea 
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="เพิ่มรายละเอียดงาน, หมายเหตุ, หรือขั้นตอนการดำเนินงาน..."
            className="w-full bg-[#141517] p-3 rounded border border-[#333538] focus:border-[#7b68ee] text-white outline-none leading-relaxed"
          />
        </div>

        {/* Subtasks Section with Checklist */}
        <div className="space-y-3 pt-2 border-t border-[#2e3034]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckSquare size={14} className="text-purple-400" />
              <span className="font-semibold text-gray-300">ขั้นตอนย่อย (Subtasks)</span>
              <span className="text-gray-400 text-[11px]">({completedCount}/{subtasks.length})</span>
            </div>

            <button 
              type="button"
              disabled={isAiLoading}
              onClick={handleAiGenerateSubtasks}
              className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 font-medium transition"
            >
              <Sparkles size={12} className={isAiLoading ? 'animate-spin' : ''} />
              <span>✨ AI แตกซับทาสก์</span>
            </button>
          </div>

          {/* Progress bar */}
          {subtasks.length > 0 && (
            <div className="w-full bg-[#2a2b2d] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#26b26d] h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Subtasks List */}
          <div className="space-y-1.5">
            {subtasks.map(sub => (
              <div 
                key={sub.id}
                className="flex items-center justify-between p-2 bg-[#18191b] border border-[#2c2e33] rounded hover:bg-[#202124] transition group"
              >
                <div 
                  onClick={() => handleToggleSubtask(sub.id, !!sub.completed)}
                  className="flex items-center space-x-2 flex-1 cursor-pointer"
                >
                  {sub.completed ? (
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  ) : (
                    <Circle size={15} className="text-gray-500" />
                  )}
                  <span className={`${sub.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                    {sub.title}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteSubtask(sub.id)}
                  className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* Add Subtask Input */}
            <form onSubmit={handleAddSubtask} className="flex items-center space-x-2 pt-1">
              <input 
                type="text"
                placeholder="เพิ่มขั้นตอนใหม่... (กด Enter)"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 bg-[#141517] px-3 py-1.5 rounded border border-[#333538] text-white text-xs outline-none"
              />
              <button 
                type="submit"
                className="px-3 py-1.5 bg-[#2a2b2d] hover:bg-[#383a3e] text-gray-200 rounded font-medium text-xs flex items-center space-x-1"
              >
                <Plus size={13} />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>

        {/* Image Attachments Section */}
        <div className="space-y-3 pt-2 border-t border-[#2e3034]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ImageIcon size={14} className="text-purple-400" />
              <span className="font-semibold text-gray-300">รูปภาพแนบ (Images)</span>
              <span className="text-gray-500 text-[11px]">(สามารถกด Ctrl+V เพื่อวางรูปได้)</span>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#2a2b2d] hover:bg-[#383a3e] text-gray-200 rounded text-xs font-medium"
            >
              <Upload size={12} />
              <span>เลือกไฟล์</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Thumbnails Grid */}
          {attachments.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {attachments.map(att => (
                <div 
                  key={att.id}
                  className="relative group bg-[#18191b] border border-[#333538] rounded overflow-hidden aspect-video cursor-pointer"
                >
                  <img 
                    src={att.url} 
                    alt={att.original_name} 
                    onClick={() => onOpenLightbox(att.url)}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200" 
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAttachment(att.id);
                    }}
                    title="ลบรูปภาพ"
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-[#333538] rounded-lg p-6 text-center text-gray-500 space-y-1">
              <p>ยังไม่มีรูปภาพแนบ</p>
              <p className="text-[11px] text-gray-400">กดปุ่มเลือกไฟล์ หรือกด <kbd className="px-1 py-0.5 bg-[#2a2b2d] rounded text-white">Ctrl+V</kbd> เพื่อวางรูปภาพจาก Clipboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Save Button Bar */}
      <div className="p-3 border-t border-[#333538] bg-[#18191b] flex items-center justify-between">
        <span className="text-[11px] text-gray-500">ID: {task.id}</span>
        <div className="flex items-center space-x-2">
          <button 
            onClick={onClose}
            className="px-3 py-1.5 rounded text-gray-400 hover:text-white text-xs font-medium"
          >
            ปิด
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-semibold rounded text-xs transition shadow-sm"
          >
            บันทึกการแก้ไข (Save)
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#222427] border border-red-500/40 rounded-lg p-5 w-96 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 text-red-400">
              <AlertCircle size={20} />
              <h3 className="font-semibold text-white text-sm">ยืนยันการลบงานนี้</h3>
            </div>
            <p className="text-xs text-gray-300">
              คุณต้องการลบงาน <strong className="text-white">"{name}"</strong> ใช่หรือไม่?
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded text-gray-300 hover:bg-[#333538] text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => {
                  onDeleteTask(task.id);
                  onClose();
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs"
              >
                ลบงานทันที
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
