import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  Copy, 
  ArrowRightLeft, 
  Image as ImageIcon,
  Calendar,
  AlertCircle,
  Flag,
  Printer,
  ExternalLink,
  CheckSquare,
  ListTodo,
  User,
  Check
} from 'lucide-react';
import ContextMenu from './ContextMenu.jsx';

const STATUS_CONFIG = {
  'COMPLETED': {
    name: 'COMPLETED',
    color: '#26b26d',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/50',
    badgeColor: 'bg-emerald-500 text-white'
  },
  'IN PROGRESS': {
    name: 'IN PROGRESS',
    color: '#1e88e5',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-blue-500/50',
    badgeColor: 'bg-blue-600 text-white'
  },
  'NOT STARTED': {
    name: 'NOT STARTED',
    color: '#e2483d',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-500/50',
    badgeColor: 'bg-red-600 text-white'
  }
};

const PRIORITIES = [
  { id: 'Urgent', label: 'Urgent (ด่วนมาก)', color: '#ef4444', iconColor: 'text-red-500' },
  { id: 'High', label: 'High (สำคัญสูง)', color: '#f59e0b', iconColor: 'text-amber-500' },
  { id: 'Normal', label: 'Normal (ปกติ)', color: '#3b82f6', iconColor: 'text-blue-500' },
  { id: 'Low', label: 'Low (ต่ำ)', color: '#94a3b8', iconColor: 'text-gray-400' }
];

const ASSIGNEE_PRESETS = [
  { name: 'JM', label: 'JM (Jet Mut)' },
  { name: 'QA', label: 'QA Lead' },
  { name: 'AUDIT', label: 'Auditor' },
  { name: 'ADMIN', label: 'Admin' },
  { name: 'DEV', label: 'Dev Team' }
];

export default function ListView({
  tasks,
  fields = [],
  onSelectTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
  onDeleteTask,
  onCopyTask,
  onOpenPrintSingleTask,
  onQuickAddTask,
  onOpenMoveCopy,
  onOpenAddColumn,
  onToggleSubtask,
  onAddSubtask
}) {
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddStatus, setQuickAddStatus] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, items: [] });

  // Popover state for live inline cell editing
  // format: { taskId, type: 'assignee' | 'dueDate' | 'priority' | 'subtasks' | 'status' }
  const [activePopover, setActivePopover] = useState(null);
  const [customAssigneeInput, setCustomAssigneeInput] = useState('');
  const [customDateInput, setCustomDateInput] = useState('');
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Inline rename state
  const [inlineEditingTaskId, setInlineEditingTaskId] = useState(null);
  const [inlineEditingName, setInlineEditingName] = useState('');

  // Group tasks by status
  const statuses = ['COMPLETED', 'IN PROGRESS', 'NOT STARTED'];
  const groupedTasks = {
    'COMPLETED': tasks.filter(t => t.status === 'COMPLETED'),
    'IN PROGRESS': tasks.filter(t => t.status === 'IN PROGRESS'),
    'NOT STARTED': tasks.filter(t => t.status === 'NOT STARTED' || !statuses.includes(t.status))
  };

  const handleQuickAdd = (status) => {
    if (!quickAddName.trim()) return;
    onQuickAddTask({ name: quickAddName.trim(), status });
    setQuickAddName('');
    setQuickAddStatus(null);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      onDeleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  const startInlineEdit = (e, task) => {
    e.stopPropagation();
    setInlineEditingTaskId(task.id);
    setInlineEditingName(task.name);
  };

  const saveInlineEdit = (task) => {
    if (inlineEditingName.trim() && inlineEditingName.trim() !== task.name) {
      if (onUpdateTask) {
        onUpdateTask(task.id, { name: inlineEditingName.trim() });
      }
    }
    setInlineEditingTaskId(null);
  };

  const formatDueDateDisplay = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === today) return { label: 'วันนี้', color: 'text-amber-400 bg-amber-950/40 border-amber-500/50' };
    if (dateStr === tomorrow) return { label: 'พรุ่งนี้', color: 'text-blue-300 bg-blue-950/40 border-blue-500/40' };
    if (dateStr < today) return { label: `เกินกำหนด (${dateStr.slice(5)})`, color: 'text-red-400 bg-red-950/40 border-red-500/50' };
    return { label: dateStr.slice(5), color: 'text-gray-300 bg-[#25272b] border-[#383a40]' };
  };

  const handleTaskContextMenu = (e, task) => {
    e.preventDefault();
    e.stopPropagation();

    const statusSubmenu = [
      {
        label: 'COMPLETED (เสร็จสิ้น)',
        colorDot: '#26b26d',
        checked: task.status === 'COMPLETED',
        onClick: () => onUpdateTaskStatus(task.id, 'COMPLETED')
      },
      {
        label: 'IN PROGRESS (กำลังทำ)',
        colorDot: '#1e88e5',
        checked: task.status === 'IN PROGRESS',
        onClick: () => onUpdateTaskStatus(task.id, 'IN PROGRESS')
      },
      {
        label: 'NOT STARTED (ยังไม่เริ่ม)',
        colorDot: '#e2483d',
        checked: task.status === 'NOT STARTED',
        onClick: () => onUpdateTaskStatus(task.id, 'NOT STARTED')
      }
    ];

    const prioritySubmenu = PRIORITIES.map(p => ({
      label: p.label,
      colorDot: p.color,
      checked: task.priority === p.id || (!task.priority && p.id === 'Normal'),
      onClick: () => onUpdateTaskPriority && onUpdateTaskPriority(task.id, p.id)
    }));

    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      items: [
        {
          label: 'เปิดดู / แก้ไขงาน',
          icon: ExternalLink,
          onClick: () => onSelectTask(task)
        },
        {
          label: 'เปลี่ยนสถานะ (Status)',
          icon: Circle,
          submenu: statusSubmenu
        },
        {
          label: 'ปรับความสำคัญ (Priority)',
          icon: Flag,
          submenu: prioritySubmenu
        },
        { type: 'separator' },
        {
          label: 'ย้ายงานไปที่... (Move)',
          icon: ArrowRightLeft,
          onClick: () => onOpenMoveCopy && onOpenMoveCopy(task)
        },
        {
          label: 'ทำสำเนางาน (Duplicate)',
          icon: Copy,
          onClick: () => onCopyTask && onCopyTask(task.id, task.list_id)
        },
        {
          label: 'พิมพ์ / ส่งออก PDF',
          icon: Printer,
          onClick: () => onOpenPrintSingleTask && onOpenPrintSingleTask(task)
        },
        { type: 'separator' },
        {
          label: 'ลบงานนี้ (Delete)',
          icon: Trash2,
          danger: true,
          onClick: () => setTaskToDelete(task)
        }
      ]
    });
  };

  return (
    <div 
      className="flex-1 overflow-x-auto overflow-y-auto p-4 space-y-6 text-xs select-none relative"
      onClick={() => {
        if (activePopover) setActivePopover(null);
      }}
    >
      {statuses.map(status => {
        const config = STATUS_CONFIG[status];
        const groupTasks = groupedTasks[status] || [];

        return (
          <div key={status} className="space-y-1">
            {/* Status Group Header */}
            <div className="flex items-center space-x-2 py-1.5 px-2 bg-[#222427]/80 rounded border-b border-[#333538]">
              <span 
                className="px-2 py-0.5 rounded font-bold text-[11px] tracking-wide"
                style={{ backgroundColor: config.color, color: '#fff' }}
              >
                {status}
              </span>
              <span className="text-gray-400 font-medium text-xs">
                {groupTasks.length}
              </span>
            </div>

            {/* Table */}
            <div className="bg-[#1e1f21] border border-[#2a2b2d] rounded-md overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2a2b2d] text-gray-400 text-[11px] bg-[#1a1b1d]">
                    <th className="py-2 px-3 font-medium min-w-[280px]">Name (ชื่องาน)</th>
                    <th className="py-2 px-2 font-medium w-28">Assignee (ผู้รับผิดชอบ)</th>
                    <th className="py-2 px-2 font-medium w-32">Due Date (กำหนดส่ง)</th>
                    <th className="py-2 px-2 font-medium w-28">Priority (ความสำคัญ)</th>
                    <th className="py-2 px-2 font-medium w-28">Subtasks (งานย่อย)</th>
                    <th className="py-2 px-2 font-medium w-32">Status (สถานะ)</th>
                    {fields.map(f => (
                      <th key={f.id} className="py-2 px-2 font-medium min-w-[120px]">
                        {f.name}
                      </th>
                    ))}
                    <th className="py-2 px-3 font-medium w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26272a]">
                  {groupTasks.map(task => {
                    const hasAttachments = task.attachments && task.attachments.length > 0;
                    const completedSubs = (task.subtasks || []).filter(s => s.completed).length;
                    const totalSubs = (task.subtasks || []).length;
                    const priorityObj = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[2];
                    const dueInfo = formatDueDateDisplay(task.due_date);

                    return (
                      <tr 
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        onContextMenu={(e) => handleTaskContextMenu(e, task)}
                        className="hover:bg-[#252629] cursor-pointer group transition duration-150 relative"
                        title="คลิกขวาเพื่อเปิดเมนูลัด"
                      >
                        {/* 1. Name Column with inline rename & status toggle */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus = task.status === 'COMPLETED' ? 'NOT STARTED' : 'COMPLETED';
                                onUpdateTaskStatus(task.id, nextStatus);
                              }}
                              className="text-gray-500 hover:text-emerald-400 transition"
                              title="คลิกเพื่อเปลี่ยนสถานะเสร็จสิ้น"
                            >
                              {task.status === 'COMPLETED' ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : (
                                <Circle size={16} />
                              )}
                            </button>

                            {inlineEditingTaskId === task.id ? (
                              <input 
                                autoFocus
                                type="text"
                                value={inlineEditingName}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setInlineEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEdit(task);
                                  if (e.key === 'Escape') setInlineEditingTaskId(null);
                                }}
                                onBlur={() => saveInlineEdit(task)}
                                className="bg-[#18191b] border border-[#7b68ee] px-1.5 py-0.5 rounded text-white text-xs outline-none w-full"
                              />
                            ) : (
                              <div 
                                className="flex items-center space-x-1.5 truncate group/name flex-1"
                                onDoubleClick={(e) => startInlineEdit(e, task)}
                              >
                                <span className={`font-medium truncate ${
                                  task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-100'
                                }`}>
                                  {task.name}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => startInlineEdit(e, task)}
                                  className="opacity-0 group-hover/name:opacity-100 text-gray-500 hover:text-gray-300 p-0.5 rounded"
                                  title="ดับเบิ้ลคลิกหรือกดเพื่อเปลี่ยนชื่อทันที"
                                >
                                  <Edit3 size={11} />
                                </button>
                              </div>
                            )}

                            {hasAttachments && (
                              <span title={`${task.attachments.length} รูปภาพแนบ`}>
                                <ImageIcon size={13} className="text-purple-400 flex-shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Interactive Assignee Column */}
                        <td className="py-2.5 px-2 relative">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePopover(activePopover?.taskId === task.id && activePopover?.type === 'assignee' ? null : { taskId: task.id, type: 'assignee' });
                            }}
                            className="inline-flex items-center space-x-1.5 px-2 py-1 rounded bg-[#24262b] hover:bg-[#2c2f35] border border-[#383a3f] cursor-pointer transition shadow-sm"
                            title="คลิกเพื่อเลือกผู้รับผิดชอบงาน"
                          >
                            <div className="w-5 h-5 rounded-full bg-[#7b68ee]/30 border border-[#7b68ee]/60 flex items-center justify-center text-[9px] font-bold text-purple-200">
                              {task.assignee ? task.assignee.slice(0, 2).toUpperCase() : '?'}
                            </div>
                            <span className="text-[11px] text-gray-300 font-medium">
                              {task.assignee || 'ยังไม่ระบุ'}
                            </span>
                          </div>

                          {/* Assignee Popover */}
                          {activePopover?.taskId === task.id && activePopover?.type === 'assignee' && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 mt-1 z-50 w-52 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-2 space-y-2 text-xs"
                            >
                              <div className="text-[11px] font-bold text-gray-400 px-1 border-b border-[#333538] pb-1">
                                เลือกผู้รับผิดชอบ (Assignee)
                              </div>

                              <div className="space-y-1">
                                {ASSIGNEE_PRESETS.map(member => (
                                  <button
                                    key={member.name}
                                    type="button"
                                    onClick={() => {
                                      onUpdateTask && onUpdateTask(task.id, { assignee: member.name });
                                      setActivePopover(null);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-[#2e3035] transition ${
                                      task.assignee === member.name ? 'bg-purple-950/40 text-purple-300 font-bold' : 'text-gray-200'
                                    }`}
                                  >
                                    <span className="flex items-center space-x-2">
                                      <span className="w-5 h-5 rounded-full bg-[#3b3d45] flex items-center justify-center text-[9px] font-bold">
                                        {member.name}
                                      </span>
                                      <span>{member.label}</span>
                                    </span>
                                    {task.assignee === member.name && <Check size={13} className="text-purple-400" />}
                                  </button>
                                ))}
                              </div>

                              {/* Custom input */}
                              <div className="pt-1 border-t border-[#333538] flex space-x-1">
                                <input 
                                  type="text"
                                  value={customAssigneeInput}
                                  onChange={(e) => setCustomAssigneeInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customAssigneeInput.trim()) {
                                      onUpdateTask && onUpdateTask(task.id, { assignee: customAssigneeInput.trim() });
                                      setCustomAssigneeInput('');
                                      setActivePopover(null);
                                    }
                                  }}
                                  placeholder="ระบุชื่อย่อใหม่..."
                                  className="w-full px-2 py-1 bg-[#18191b] border border-[#383a3e] rounded text-white text-[11px] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (customAssigneeInput.trim()) {
                                      onUpdateTask && onUpdateTask(task.id, { assignee: customAssigneeInput.trim() });
                                      setCustomAssigneeInput('');
                                      setActivePopover(null);
                                    }
                                  }}
                                  className="px-2 py-1 bg-[#7b68ee] text-white rounded text-[10px] font-bold"
                                >
                                  ตั้ง
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 3. Interactive Due Date Column */}
                        <td className="py-2.5 px-2 relative">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePopover(activePopover?.taskId === task.id && activePopover?.type === 'dueDate' ? null : { taskId: task.id, type: 'dueDate' });
                            }}
                            className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded border cursor-pointer transition shadow-sm ${
                              dueInfo ? dueInfo.color : 'text-gray-400 bg-[#24262b] border-dashed border-[#383a3f] hover:border-gray-400'
                            }`}
                            title="คลิกเพื่อตั้งกำหนดส่งงาน"
                          >
                            <Calendar size={12} />
                            <span className="text-[11px] font-medium">
                              {dueInfo ? dueInfo.label : '+ กำหนดส่ง'}
                            </span>
                          </div>

                          {/* Due Date Popover */}
                          {activePopover?.taskId === task.id && activePopover?.type === 'dueDate' && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 mt-1 z-50 w-60 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-2.5 space-y-2 text-xs"
                            >
                              <div className="text-[11px] font-bold text-gray-400 border-b border-[#333538] pb-1">
                                กำหนดส่ง (Due Date)
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    onUpdateTask && onUpdateTask(task.id, { due_date: todayStr });
                                    setActivePopover(null);
                                  }}
                                  className="px-2 py-1 bg-[#18191b] hover:bg-[#2d2f34] text-amber-300 rounded text-center font-medium"
                                >
                                  วันนี้
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const tom = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                    onUpdateTask && onUpdateTask(task.id, { due_date: tom });
                                    setActivePopover(null);
                                  }}
                                  className="px-2 py-1 bg-[#18191b] hover:bg-[#2d2f34] text-blue-300 rounded text-center font-medium"
                                >
                                  พรุ่งนี้
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextWeek = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
                                    onUpdateTask && onUpdateTask(task.id, { due_date: nextWeek });
                                    setActivePopover(null);
                                  }}
                                  className="px-2 py-1 bg-[#18191b] hover:bg-[#2d2f34] text-purple-300 rounded text-center font-medium"
                                >
                                  +7 วัน (สัปดาห์หน้า)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateTask && onUpdateTask(task.id, { due_date: null });
                                    setActivePopover(null);
                                  }}
                                  className="px-2 py-1 bg-[#18191b] hover:bg-red-950/30 text-red-400 rounded text-center font-medium"
                                >
                                  ล้างวันที่
                                </button>
                              </div>

                              {/* Custom date picker */}
                              <div className="pt-1.5 border-t border-[#333538] flex space-x-1">
                                <input 
                                  type="date"
                                  value={customDateInput || task.due_date || ''}
                                  onChange={(e) => setCustomDateInput(e.target.value)}
                                  className="w-full px-2 py-1 bg-[#18191b] border border-[#383a3e] rounded text-white text-[11px] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (customDateInput) {
                                      onUpdateTask && onUpdateTask(task.id, { due_date: customDateInput });
                                      setCustomDateInput('');
                                      setActivePopover(null);
                                    }
                                  }}
                                  className="px-2 py-1 bg-[#7b68ee] text-white rounded text-[10px] font-bold"
                                >
                                  บันทึก
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 4. Interactive Priority Column */}
                        <td className="py-2.5 px-2 relative">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePopover(activePopover?.taskId === task.id && activePopover?.type === 'priority' ? null : { taskId: task.id, type: 'priority' });
                            }}
                            className="inline-flex items-center space-x-1.5 px-2 py-1 rounded bg-[#24262b] hover:bg-[#2c2f35] border border-[#383a3f] cursor-pointer transition shadow-sm"
                            title="คลิกเพื่อเปลี่ยนระดับความสำคัญ"
                          >
                            <Flag size={12} style={{ color: priorityObj.color }} />
                            <span className="text-[11px] font-medium" style={{ color: priorityObj.color }}>
                              {priorityObj.id}
                            </span>
                          </div>

                          {/* Priority Popover */}
                          {activePopover?.taskId === task.id && activePopover?.type === 'priority' && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 mt-1 z-50 w-48 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-1.5 space-y-1 text-xs"
                            >
                              <div className="text-[11px] font-bold text-gray-400 px-2 py-0.5 border-b border-[#333538]">
                                ระดับความสำคัญ (Priority)
                              </div>
                              {PRIORITIES.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    onUpdateTaskPriority && onUpdateTaskPriority(task.id, p.id);
                                    setActivePopover(null);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-[#2e3035] transition ${
                                    task.priority === p.id ? 'bg-purple-950/40 font-bold' : ''
                                  }`}
                                >
                                  <span className="flex items-center space-x-2">
                                    <Flag size={12} style={{ color: p.color }} />
                                    <span style={{ color: p.color }}>{p.label}</span>
                                  </span>
                                  {task.priority === p.id && <Check size={13} className="text-purple-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 5. Interactive Subtasks Column */}
                        <td className="py-2.5 px-2 relative">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePopover(activePopover?.taskId === task.id && activePopover?.type === 'subtasks' ? null : { taskId: task.id, type: 'subtasks' });
                            }}
                            className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded border cursor-pointer transition shadow-sm ${
                              totalSubs > 0 
                                ? (completedSubs === totalSubs ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' : 'bg-blue-950/40 text-blue-300 border-blue-500/40')
                                : 'bg-[#24262b] text-gray-400 border-[#383a3f] hover:border-gray-400'
                            }`}
                            title="คลิกเพื่อดูและจัดการงานย่อย (Checklist)"
                          >
                            <CheckSquare size={12} />
                            <span className="text-[11px] font-medium">
                              {totalSubs > 0 ? `${completedSubs}/${totalSubs}` : '0 งานย่อย'}
                            </span>
                          </div>

                          {/* Subtasks Checklist Popover */}
                          {activePopover?.taskId === task.id && activePopover?.type === 'subtasks' && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 mt-1 z-50 w-72 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-3 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between border-b border-[#333538] pb-1.5">
                                <span className="font-bold text-gray-200 text-xs flex items-center space-x-1.5">
                                  <ListTodo size={13} className="text-purple-400" />
                                  <span>เช็คลิสต์งานย่อย ({completedSubs}/{totalSubs})</span>
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0}%
                                </span>
                              </div>

                              {/* Subtasks List */}
                              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                {(task.subtasks || []).length === 0 ? (
                                  <div className="text-center py-2 text-gray-500 text-[11px]">
                                    ยังไม่มีงานย่อยในทาสก์นี้
                                  </div>
                                ) : (
                                  task.subtasks.map(sub => (
                                    <div 
                                      key={sub.id} 
                                      className="flex items-center space-x-2 py-1 px-1.5 rounded hover:bg-[#2a2c31] transition group/sub"
                                    >
                                      <input 
                                        type="checkbox"
                                        checked={Boolean(sub.completed)}
                                        onChange={() => onToggleSubtask && onToggleSubtask(sub.id, !sub.completed)}
                                        className="rounded accent-emerald-500 cursor-pointer"
                                      />
                                      <span className={`text-[11px] flex-1 truncate ${
                                        sub.completed ? 'line-through text-gray-500' : 'text-gray-200'
                                      }`}>
                                        {sub.title}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Quick Add Subtask Input */}
                              <div className="pt-2 border-t border-[#333538] flex space-x-1.5">
                                <input 
                                  type="text"
                                  value={newSubtaskInput}
                                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newSubtaskInput.trim()) {
                                      onAddSubtask && onAddSubtask(task.id, newSubtaskInput.trim());
                                      setNewSubtaskInput('');
                                    }
                                  }}
                                  placeholder="+ เพิ่มงานย่อย..."
                                  className="w-full px-2 py-1 bg-[#18191b] border border-[#383a3e] rounded text-white text-[11px] outline-none focus:border-purple-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (newSubtaskInput.trim()) {
                                      onAddSubtask && onAddSubtask(task.id, newSubtaskInput.trim());
                                      setNewSubtaskInput('');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-[#7b68ee] hover:bg-[#6a55e0] text-white rounded text-[11px] font-medium"
                                >
                                  เพิ่ม
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 6. Interactive Status Badge Column */}
                        <td className="py-2.5 px-2 relative">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePopover(activePopover?.taskId === task.id && activePopover?.type === 'status' ? null : { taskId: task.id, type: 'status' });
                            }}
                            className="px-2.5 py-1 rounded text-[10px] font-bold tracking-wider inline-block cursor-pointer hover:opacity-90 transition shadow-sm"
                            style={{ backgroundColor: config.color, color: '#fff' }}
                            title="คลิกเพื่อเปลี่ยนสถานะงาน"
                          >
                            {task.status}
                          </div>

                          {/* Status Popover */}
                          {activePopover?.taskId === task.id && activePopover?.type === 'status' && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 mt-1 z-50 w-48 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-1.5 space-y-1 text-xs"
                            >
                              <div className="text-[11px] font-bold text-gray-400 px-2 py-0.5 border-b border-[#333538]">
                                เปลี่ยนสถานะงาน
                              </div>
                              {statuses.map(st => {
                                const stCfg = STATUS_CONFIG[st];
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => {
                                      onUpdateTaskStatus && onUpdateTaskStatus(task.id, st);
                                      setActivePopover(null);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-[#2e3035] transition ${
                                      task.status === st ? 'bg-purple-950/40 font-bold' : ''
                                    }`}
                                  >
                                    <span className="flex items-center space-x-2">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stCfg.color }} />
                                      <span style={{ color: stCfg.color }}>{st}</span>
                                    </span>
                                    {task.status === st && <Check size={13} className="text-purple-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Custom Fields (if configured) */}
                        {fields.map(f => {
                          const val = task.fieldValues ? task.fieldValues[f.id] : '';
                          return (
                            <td key={f.id} className="py-2.5 px-2 text-gray-300 truncate max-w-[150px]">
                              {f.type === 'select' && val ? (
                                <span className="px-2 py-0.5 bg-[#2a2b2d] border border-[#383a3e] rounded text-[10px] font-medium text-amber-300">
                                  {val}
                                </span>
                              ) : (
                                <span>{val || '-'}</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTask(task);
                              }}
                              title="เปิดดูรายละเอียด (Edit Drawer)"
                              className="p-1 hover:bg-[#383a3e] rounded text-gray-400 hover:text-white transition cursor-pointer"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenMoveCopy && onOpenMoveCopy(task);
                              }}
                              title="ย้ายงานไปที่... (Move)"
                              className="p-1 hover:bg-[#383a3e] rounded text-gray-400 hover:text-blue-400 transition cursor-pointer"
                            >
                              <ArrowRightLeft size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyTask && onCopyTask(task.id, task.list_id);
                              }}
                              title="ทำสำเนางาน (Duplicate)"
                              className="p-1 hover:bg-[#383a3e] rounded text-gray-400 hover:text-purple-400 transition cursor-pointer"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete(task);
                              }}
                              title="ลบงาน (Delete)"
                              className="p-1 hover:bg-[#383a3e] rounded text-gray-400 hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Quick Add Row */}
                  <tr className="border-t border-[#26272a] bg-[#1a1b1d]/50">
                    <td colSpan={7 + fields.length} className="py-2 px-3">
                      {quickAddStatus === status ? (
                        <div className="flex items-center space-x-2">
                          <input 
                            autoFocus
                            type="text"
                            value={quickAddName}
                            onChange={(e) => setQuickAddName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleQuickAdd(status);
                              if (e.key === 'Escape') setQuickAddStatus(null);
                            }}
                            placeholder="พิมพ์ชื่องาน แล้วกด Enter..."
                            className="flex-1 bg-[#222427] border border-[#7b68ee] px-2 py-1 rounded text-white text-xs outline-none"
                          />
                          <button 
                            onClick={() => handleQuickAdd(status)}
                            className="px-3 py-1 bg-[#7b68ee] hover:bg-[#6a55e0] text-white rounded font-medium text-xs transition"
                          >
                            บันทึก
                          </button>
                          <button 
                            onClick={() => setQuickAddStatus(null)}
                            className="px-2 py-1 text-gray-400 hover:text-white text-xs"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setQuickAddStatus(status)}
                          className="flex items-center space-x-1.5 text-gray-400 hover:text-gray-200 transition py-0.5"
                        >
                          <Plus size={13} />
                          <span>+ เพิ่มงานใน {status}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#222427] border border-red-500/40 rounded-lg p-5 w-96 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 text-red-400">
              <AlertCircle size={20} />
              <h3 className="font-semibold text-white text-sm">ยืนยันการลบงาน</h3>
            </div>
            <p className="text-xs text-gray-300">
              คุณต้องการลบงาน <strong className="text-white">"{taskToDelete.name}"</strong> ใช่หรือไม่? ข้อมูลซับทาสก์และรูปภาพจะถูกลบออกจากฐานข้อมูล
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 rounded text-gray-300 hover:bg-[#333538] text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition"
              >
                ลบงานทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu Component */}
      <ContextMenu 
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenu.items}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
