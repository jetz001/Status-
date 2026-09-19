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
  AlertCircle,
  Check
} from 'lucide-react';
import ThaiDatePicker, { formatToDMY, formatToDMYNumeric } from './ThaiDatePicker.jsx';

export default function TaskDrawer({
  task,
  fields = [],
  onClose,
  onUpdateTask,
  onDeleteTask,
  onOpenMoveCopy,
  onOpenPrintSingleTask,
  onOpenLightbox,
  listName = '',
  spaceName = ''
}) {
  const [name, setName] = useState(task.name || '');
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status || 'NOT STARTED');
  const [priority, setPriority] = useState(task.priority || 'Normal');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [recurringRule, setRecurringRule] = useState(() => {
    try {
      return task.recurring_rule ? (typeof task.recurring_rule === 'string' ? JSON.parse(task.recurring_rule) : task.recurring_rule) : null;
    } catch(e) { return null; }
  });
  const [assignee, setAssignee] = useState(task.assignee || '');
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [fieldValues, setFieldValues] = useState(task.fieldValues || {});
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const currentTaskIdRef = useRef(task?.id);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/team-members')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeamMembers(data);
      })
      .catch(console.error);
  }, []);

  // Listen for Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Helper to sanitize dirty JSON that might have been saved in the DB previously
  const sanitizeText = (txt) => {
    if (!txt) return '';
    let s = String(txt).trim();
    if (s.startsWith('{') || s.startsWith('[') || s.includes('"task_description"') || s.includes('"scope_of_work"')) {
      try {
        const jsonStart = s.indexOf('{');
        const jsonEnd = s.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const obj = JSON.parse(s.substring(jsonStart, jsonEnd + 1));
          const textFromObj = (val) => {
            if (!val) return '';
            if (typeof val === 'string') return val.trim();
            if (Array.isArray(val)) return val.map(textFromObj).filter(Boolean).join('\n');
            if (typeof val === 'object') {
              if (val.thai) return textFromObj(val.thai);
              if (val.description) return textFromObj(val.description);
              if (val.task_description) return textFromObj(val.task_description);
              if (val.scope_of_work) return textFromObj(val.scope_of_work);
              if (val.title) return textFromObj(val.title);
              if (val.name) return textFromObj(val.name);
              if (val.text) return textFromObj(val.text);
              return Object.values(val).map(textFromObj).filter(Boolean).join('\n');
            }
            return String(val);
          };
          const res = textFromObj(obj);
          if (res) return res.replace(/^["'“”‘’]|["'“”‘’]$/g, '').trim();
        }
      } catch (e) {
        const m = s.match(/"(?:thai|description|text|title|name|task_description|scope_of_work)"\s*:\s*(?:\[\s*\{\s*"description"\s*:\s*)?"([^"\\]*(?:\\.[^"\\]*)*)/i);
        if (m && m[1]) return m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
      }
    }
    return s.replace(/^["'“”‘’]|["'“”‘’]$/g, '').trim();
  };

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const thaiMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const mNum = parseInt(m, 10);
      const dNum = parseInt(d, 10);
      return `${dNum} ${thaiMonths[mNum] || m} ${y}`;
    }
    return dateStr;
  };

  useEffect(() => {
    if (task && task.id !== currentTaskIdRef.current) {
      currentTaskIdRef.current = task.id;
      setName(sanitizeText(task.name || ''));
      setDescription(sanitizeText(task.description || ''));
      setStatus(task.status || 'NOT STARTED');
      setPriority(task.priority || 'Normal');
      setDueDate(task.due_date || '');
      try {
        setRecurringRule(task.recurring_rule ? (typeof task.recurring_rule === 'string' ? JSON.parse(task.recurring_rule) : task.recurring_rule) : null);
      } catch(e) {
        setRecurringRule(null);
      }
      setAssignee(task.assignee || '');
      setSubtasks(task.subtasks || []);
      setFieldValues(task.fieldValues || {});
      setAttachments(task.attachments || []);
    }
  }, [task?.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          name,
          description,
          status,
          priority,
          due_date: dueDate || null,
          assignee,
          fieldValues,
          recurring_rule: recurringRule ? JSON.stringify(recurringRule) : null,
          attachments
        });
      }
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setIsSaving(false);
        if (onClose) onClose();
      }, 500);
    } catch (err) {
      console.error('Save failed:', err);
      setIsSaving(false);
    }
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

  // Upload attachment file (used by file input & clipboard paste)
  const uploadAttachmentFile = async (file) => {
    if (!file || !task?.id) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.id) {
        setAttachments(prev => {
          const next = [data, ...prev];
          if (onUpdateTask) {
            onUpdateTask(task.id, { attachments: next });
          }
          return next;
        });
      }
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  // Upload file handler from file picker
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAttachmentFile(file);
    e.target.value = '';
  };

  // Handle Clipboard Paste (Ctrl+V) for Task Images
  useEffect(() => {
    const handleTaskPaste = async (e) => {
      // If AI sidebar is open on top, let AI sidebar handle it
      if (document.getElementById('ai-sidebar-panel')) return;

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type && item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
            const file = new File([blob], `task-screenshot-${timestamp}.png`, { type: blob.type || 'image/png' });
            await uploadAttachmentFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleTaskPaste);
    return () => window.removeEventListener('paste', handleTaskPaste);
  }, [task?.id]);

  const handleDeleteAttachment = async (attId) => {
    try {
      await fetch(`/api/attachments/${attId}`, { method: 'DELETE' });
      setAttachments(prev => {
        const next = prev.filter(a => a.id !== attId);
        if (onUpdateTask) {
          onUpdateTask(task.id, { attachments: next });
        }
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to build contextual string for AI
  const getContextString = () => {
    const parts = [];
    if (spaceName) parts.push(`Space: ${spaceName}`);
    if (listName) parts.push(`List: ${listName}`);
    if (name) parts.push(`Task: ${name}`);
    return parts.join(', ');
  };

  // Single Unified AI Action: "ปุ่มเดียวพอ"
  const handleAiCompleteAll = async () => {
    if (!task?.id) return;
    setIsAiLoading(true);
    setAiNotice('');
    try {
      const res = await fetch('/api/ai/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          title: name,
          description: description,
          context: getContextString()
        })
      });
      const data = await res.json();
      if (data.success && data.task) {
        const cleanTitle = sanitizeText(data.task.name || '');
        const cleanDesc = sanitizeText(data.task.description || '');
        setName(cleanTitle);
        setDescription(cleanDesc);
        setPriority(data.task.priority || 'Normal');
        if (data.task.due_date) {
          setDueDate(data.task.due_date);
        }
        if (data.subtasks && data.subtasks.length > 0) {
          setSubtasks(data.subtasks);
        }
        if (data.severity) {
          const sevField = fields.find(f => f.name.includes('Severity'));
          if (sevField) {
            setFieldValues(prev => ({ ...prev, [sevField.id]: data.severity }));
          }
        }
        onUpdateTask(task.id, {
          name: cleanTitle,
          description: cleanDesc,
          priority: data.task.priority,
          due_date: data.task.due_date
        });
        setAiNotice('✨ AI จัดการข้อมูลครบถ้วนแล้ว: ปรับปรุงชื่อ, คำอธิบาย, ลำดับความสำคัญ และขั้นตอนย่อยเรียบร้อย!');
        setTimeout(() => setAiNotice(''), 5000);
      } else {
        throw new Error(data.error || 'Failed');
      }
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
    <>
      {/* Backdrop overlay: click outside to close drawer */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-40 transition-opacity"
        title="คลิกด้านนอกเพื่อปิดหน้าต่างงาน"
      />
      <div className="fixed inset-y-0 right-0 w-[580px] max-w-full bg-[#1e1f21] border-l border-[#333538] shadow-2xl z-50 flex flex-col text-xs select-none">
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

      {/* Unified Single AI Action Banner: "ปุ่มเดียวพอ" */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-purple-950/50 via-[#231e38] to-[#18191b] border-b border-purple-500/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={15} className="text-purple-300 animate-pulse" />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-white">AI One-Click Assistant</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold uppercase">ปุ่มเดียวจบ</span>
            </div>
            <span className="text-[10px] text-gray-400 truncate block">ปรับปรุงชื่อ เติมคำอธิบาย จัดการความสำคัญ และแตกขั้นตอนย่อย</span>
          </div>
        </div>
        <button
          type="button"
          disabled={isAiLoading}
          onClick={handleAiCompleteAll}
          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#7b68ee] to-indigo-600 hover:from-[#6b58de] hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-950/50 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 flex-shrink-0"
        >
          <Sparkles size={13} className={isAiLoading ? 'animate-spin' : ''} />
          <span>✨ AI จัดการให้ครบ</span>
        </button>
      </div>

      {/* Main Body Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Title input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">ชื่องาน (Title)</label>
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
            <div className="flex space-x-1.5">
              <select 
                value={teamMembers.some(m => m.name === assignee) ? assignee : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setAssignee(e.target.value);
                  }
                }}
                className="w-1/2 bg-[#141517] p-2 rounded border border-[#333538] text-white outline-none text-xs"
              >
                <option value="">-- เลือกทีม --</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.name}>{m.label || m.name}</option>
                ))}
              </select>
              <input 
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="ระบุชื่อย่อ..."
                className="w-1/2 bg-[#141517] p-2 rounded border border-[#333538] text-white outline-none text-xs"
              />
            </div>
          </div>

          <div className="space-y-1 relative">
            <label className="text-[11px] font-semibold text-gray-400 flex items-center space-x-1">
              <Calendar size={12} />
              <span>วันกำหนดส่ง (วัน / เดือน / ปี)</span>
            </label>
            <button 
              type="button"
              onClick={() => setShowDatePicker(prev => !prev)}
              className="w-full flex items-center justify-between bg-[#141517] p-2 rounded border border-[#333538] text-white text-xs hover:border-[#7b68ee] transition cursor-pointer"
            >
              <span className={dueDate ? 'text-white font-medium' : 'text-gray-400'}>
                {dueDate ? `${formatToDMY(dueDate)} (${formatToDMYNumeric(dueDate)})` : '+ กำหนดส่ง (วัน/เดือน/ปี)'}
              </span>
              <Calendar size={13} className="text-purple-400" />
            </button>

            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1 z-50">
                <ThaiDatePicker
                  value={dueDate}
                  onChange={(newDate) => {
                    setDueDate(newDate || '');
                    setShowDatePicker(false);
                  }}
                  onClose={() => setShowDatePicker(false)}
                />
              </div>
            )}
          </div>

          {/* Recurring Rule (รอบทำซ้ำ) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-400 flex items-center space-x-1">
              <span>🔁</span>
              <span>รอบทำซ้ำ (Recurring Tasks)</span>
            </label>
            <select
              value={recurringRule?.type || 'none'}
              onChange={(e) => {
                const type = e.target.value;
                if (type === 'none') {
                  setRecurringRule(null);
                } else {
                  const day = dueDate ? parseInt(dueDate.split('-')[2], 10) : (recurringRule?.day || 1);
                  setRecurringRule({ type, day });
                }
              }}
              className="w-full bg-[#141517] p-2 rounded border border-[#333538] text-white outline-none text-xs"
            >
              <option value="none">ไม่ทำซ้ำ (รอบเดียวจบ)</option>
              <option value="daily">ทุกวัน (Daily)</option>
              <option value="weekly">ทุกสัปดาห์ (Weekly)</option>
              <option value="monthly">ทุกเดือน (Monthly)</option>
              <option value="monthly_date">ทุกวันที่... ของเดือน (Monthly on Day X)</option>
              <option value="half_yearly">ทุกครึ่งปี (ทุก 6 เดือน)</option>
              <option value="yearly">ทุกปี (Yearly)</option>
            </select>
            {recurringRule?.type === 'monthly_date' && (
              <div className="flex items-center space-x-2 pt-1 text-[11px] text-gray-300">
                <span>ทุกวันที่:</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={recurringRule.day || 1}
                  onChange={(e) => {
                    const val = Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1));
                    setRecurringRule(prev => ({ ...prev, day: val }));
                  }}
                  className="w-16 p-1 bg-[#141517] border border-[#333538] rounded text-white text-center outline-none"
                />
                <span className="text-gray-400">ของทุกเดือน</span>
              </div>
            )}
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
            disabled={isSaving}
            className={`px-5 py-1.5 font-semibold rounded text-xs transition shadow-sm flex items-center space-x-1.5 ${
              isSaved 
                ? 'bg-emerald-600 text-white' 
                : 'bg-[#7b68ee] hover:bg-[#6a55e0] text-white disabled:opacity-50'
            }`}
          >
            {isSaved ? (
              <>
                <Check size={14} className="text-white" />
                <span>บันทึกเรียบร้อย!</span>
              </>
            ) : isSaving ? (
              <span>กำลังบันทึก...</span>
            ) : (
              <span>บันทึกการแก้ไข (Save)</span>
            )}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#222427] border border-red-500/40 rounded-lg p-5 w-96 shadow-2xl space-y-4"
          >
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
    </>
  );
}
