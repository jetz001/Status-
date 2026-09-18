import React, { useState, useEffect } from 'react';
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
  Check,
  X
} from 'lucide-react';
import ContextMenu from './ContextMenu.jsx';
import ThaiDatePicker from './ThaiDatePicker.jsx';

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

  // Dynamic team members from database
  const [teamMembers, setTeamMembers] = useState([]);
  const [editingMember, setEditingMember] = useState(null); // { id, name, label }
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberLabel, setNewMemberLabel] = useState('');

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/team-members');
      const data = await res.json();
      if (Array.isArray(data)) setTeamMembers(data);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newMemberName.trim(), 
          label: newMemberLabel.trim() || newMemberName.trim() 
        })
      });
      if (res.ok) {
        setNewMemberName('');
        setNewMemberLabel('');
        fetchTeamMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMember = async (id) => {
    if (!editingMember || !editingMember.name.trim()) return;
    try {
      const res = await fetch(`/api/team-members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingMember.name.trim(),
          label: editingMember.label.trim() || editingMember.name.trim()
        })
      });
      if (res.ok) {
        setEditingMember(null);
        fetchTeamMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMember = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/team-members/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTeamMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Popover state for live inline cell editing
  // format: { taskId, type: 'assignee' | 'dueDate' | 'priority' | 'subtasks' | 'status' }
  const [activePopover, setActivePopover] = useState(null);
  const [customAssigneeInput, setCustomAssigneeInput] = useState('');
  const [customDateInput, setCustomDateInput] = useState('');
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Close popovers on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActivePopover(null);
        setEditingMember(null);
      }
    };
    if (activePopover) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activePopover]);

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

  const formatDueDateDisplay = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dmy = formatDateDMY(dateStr);
    if (dateStr === today) return { label: `วันนี้ (${dmy})`, color: 'text-amber-400 bg-amber-950/40 border-amber-500/50' };
    if (dateStr === tomorrow) return { label: `พรุ่งนี้ (${dmy})`, color: 'text-blue-300 bg-blue-950/40 border-blue-500/40' };
    if (dateStr < today) return { label: `เกินกำหนด (${dmy})`, color: 'text-red-400 bg-red-950/40 border-red-500/50' };
    return { label: dmy, color: 'text-gray-300 bg-[#25272b] border-[#383a40]' };
  };

  const getRecurringLabel = (ruleStr) => {
    if (!ruleStr) return null;
    try {
      const rule = typeof ruleStr === 'string' ? JSON.parse(ruleStr) : ruleStr;
      if (!rule || rule.type === 'none') return null;
      switch (rule.type) {
        case 'daily': return 'ทุกวัน';
        case 'weekly': return 'ทุกสัปดาห์';
        case 'monthly': return 'ทุกเดือน';
        case 'monthly_date': return `ทุกวันที่ ${rule.day || '1'}`;
        case 'half_yearly': return 'ทุก 6 เดือน';
        case 'yearly': return 'ทุกปี';
        default: return null;
      }
    } catch (e) {
      return null;
    }
  };

  const handleTogglePopover = (e, taskId, type) => {
    e.stopPropagation();
    if (activePopover?.taskId === taskId && activePopover?.type === type) {
      setActivePopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensUp = spaceBelow < 320; // open upwards if less than 320px from bottom!
    const opensLeft = rect.left + 290 > window.innerWidth;
    setActivePopover({ taskId, type, opensUp, opensLeft });
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
    <>
      {/* Invisible backdrop overlay to catch any click outside of popovers */}
      {activePopover && (
        <div 
          className="fixed inset-0 z-40 bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover(null);
            setEditingMember(null);
          }}
        />
      )}

      <div 
        className="flex-1 overflow-x-auto overflow-y-auto p-4 space-y-6 text-xs select-none relative"
        onClick={() => {
          if (activePopover) {
            setActivePopover(null);
            setEditingMember(null);
          }
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

                                {task.list_name && (
                                  <span 
                                    style={{ borderColor: task.list_color ? `${task.list_color}40` : '#374151' }}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#22242a] text-gray-400 border flex-shrink-0 flex items-center space-x-1"
                                    title={`List: ${task.list_name}`}
                                  >
                                    <span 
                                      className="w-1.5 h-1.5 rounded-full inline-block" 
                                      style={{ backgroundColor: task.list_color || '#7b68ee' }} 
                                    />
                                    <span>{task.list_name}</span>
                                  </span>
                                )}

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
                            onClick={(e) => handleTogglePopover(e, task.id, 'assignee')}
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
                              className={`absolute ${activePopover?.opensUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${activePopover?.opensLeft ? 'right-0' : 'left-0'} z-50 w-64 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-2.5 space-y-2 text-xs`}
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 border-b border-[#333538] pb-1.5">
                                <span>ผู้รับผิดชอบงาน (Assignee)</span>
                                <span className="text-[10px] text-gray-500 font-normal">แก้ไข/ลบ ได้</span>
                              </div>

                              {/* Member list */}
                              <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                                {teamMembers.map(member => (
                                  <div key={member.id}>
                                    {editingMember?.id === member.id ? (
                                      <div className="p-1.5 bg-[#1a1b1d] rounded border border-purple-500/50 space-y-1.5">
                                        <div className="flex space-x-1">
                                          <input 
                                            type="text"
                                            value={editingMember.name}
                                            onChange={(e) => setEditingMember(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="ย่อ (เช่น JM)"
                                            className="w-1/3 px-1.5 py-1 bg-[#26282c] border border-[#444] rounded text-white text-[11px] outline-none"
                                          />
                                          <input 
                                            type="text"
                                            value={editingMember.label}
                                            onChange={(e) => setEditingMember(prev => ({ ...prev, label: e.target.value }))}
                                            placeholder="ชื่อเต็ม / แผนก"
                                            className="w-2/3 px-1.5 py-1 bg-[#26282c] border border-[#444] rounded text-white text-[11px] outline-none"
                                          />
                                        </div>
                                        <div className="flex justify-end space-x-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setEditingMember(null)}
                                            className="px-2 py-0.5 text-gray-400 hover:text-white text-[10px]"
                                          >
                                            ยกเลิก
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateMember(member.id)}
                                            className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold"
                                          >
                                            บันทึก
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        className={`group w-full px-2 py-1.5 rounded flex items-center justify-between hover:bg-[#2e3035] transition ${
                                          task.assignee === member.name ? 'bg-purple-950/40 text-purple-300 font-bold' : 'text-gray-200'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onUpdateTask && onUpdateTask(task.id, { assignee: member.name });
                                            setActivePopover(null);
                                          }}
                                          className="flex-1 flex items-center space-x-2 text-left overflow-hidden mr-1"
                                        >
                                          <span 
                                            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                                            style={{ backgroundColor: member.color || '#7b68ee' }}
                                          >
                                            {member.name.slice(0, 2).toUpperCase()}
                                          </span>
                                          <span className="truncate text-[11px]" title={member.label}>{member.label}</span>
                                        </button>

                                        <div className="flex items-center space-x-1">
                                          {task.assignee === member.name && <Check size={13} className="text-purple-400 mr-0.5" />}
                                          <button
                                            type="button"
                                            title="แก้ไขชื่อผู้รับผิดชอบนี้"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingMember({ id: member.id, name: member.name, label: member.label });
                                            }}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-blue-400 text-gray-400 transition rounded hover:bg-[#383a3f]"
                                          >
                                            <Edit3 size={11} />
                                          </button>
                                          <button
                                            type="button"
                                            title="ลบผู้รับผิดชอบนี้ออกจากระบบ"
                                            onClick={(e) => handleDeleteMember(member.id, e)}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-400 transition rounded hover:bg-[#383a3f]"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {teamMembers.length === 0 && (
                                  <div className="text-[11px] text-gray-500 py-2 text-center">
                                    ยังไม่มีรายชื่อสมาชิกในทีม
                                  </div>
                                )}
                              </div>

                              {/* Unassign button */}
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateTask && onUpdateTask(task.id, { assignee: '' });
                                  setActivePopover(null);
                                }}
                                className="w-full text-left px-2 py-1 text-gray-400 hover:text-gray-200 hover:bg-[#2a2b2e] rounded flex items-center space-x-1.5 transition text-[11px] border-t border-[#333538] pt-1.5"
                              >
                                <span className="text-[11px]">⚪</span>
                                <span>ไม่ระบุผู้รับผิดชอบ (Unassign)</span>
                              </button>

                              {/* Add new member form */}
                              <div className="pt-2 border-t border-[#333538] space-y-1.5">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  + เพิ่มสมาชิกใหม่
                                </div>
                                <div className="flex space-x-1">
                                  <input 
                                    type="text"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    placeholder="ชื่อย่อ (JM)"
                                    className="w-1/3 px-1.5 py-1 bg-[#18191b] border border-[#383a3e] rounded text-white text-[11px] outline-none"
                                  />
                                  <input 
                                    type="text"
                                    value={newMemberLabel}
                                    onChange={(e) => setNewMemberLabel(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleAddMember();
                                    }}
                                    placeholder="ชื่อเต็ม (เช่น สมชาย หรือ John)"
                                    className="w-2/3 px-1.5 py-1 bg-[#18191b] border border-[#383a3e] rounded text-white text-[11px] outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleAddMember}
                                  disabled={!newMemberName.trim()}
                                  className="w-full py-1 bg-[#7b68ee] hover:bg-[#6852e6] disabled:opacity-50 text-white rounded text-[11px] font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                                >
                                  <Plus size={12} />
                                  <span>เพิ่มสมาชิกใหม่</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 3. Interactive Due Date Column */}
                        <td className="py-2.5 px-2 relative">
                          <div className="flex items-center space-x-1">
                            <div 
                              onClick={(e) => handleTogglePopover(e, task.id, 'dueDate')}
                              className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded border cursor-pointer transition shadow-sm ${
                                dueInfo ? dueInfo.color : 'text-gray-400 bg-[#24262b] border-dashed border-[#383a3f] hover:border-gray-400'
                              }`}
                              title="คลิกเพื่อตั้งกำหนดส่งงานและรอบทำซ้ำ"
                            >
                              <Calendar size={12} />
                              <span className="text-[11px] font-medium">
                                {dueInfo ? dueInfo.label : '+ กำหนดส่ง'}
                              </span>
                            </div>

                            {/* Recurring Badge */}
                            {getRecurringLabel(task.recurring_rule) && (
                              <span 
                                onClick={(e) => handleTogglePopover(e, task.id, 'dueDate')}
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-950/60 text-purple-300 border border-purple-500/40 cursor-pointer hover:bg-purple-900/60 transition"
                                title={`รอบทำซ้ำ: ${getRecurringLabel(task.recurring_rule)}`}
                              >
                                <span>🔁</span>
                                <span>{getRecurringLabel(task.recurring_rule)}</span>
                              </span>
                            )}
                          </div>

                          {/* Due Date Popover with Thai Calendar, Day-Month-Year format & Anti-Clipping */}
                          {activePopover?.taskId === task.id && activePopover?.type === 'dueDate' && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute ${activePopover?.opensUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${activePopover?.opensLeft ? 'right-0' : 'left-0'} z-50`}
                            >
                              <ThaiDatePicker
                                value={task.due_date}
                                onChange={(newDate) => {
                                  onUpdateTask && onUpdateTask(task.id, { due_date: newDate });
                                  setActivePopover(null);
                                }}
                                onClose={() => setActivePopover(null)}
                                showRecurring={true}
                                recurringRule={task.recurring_rule}
                                onUpdateRecurring={(newRule) => {
                                  onUpdateTask && onUpdateTask(task.id, { 
                                    recurring_rule: newRule ? JSON.stringify(newRule) : null 
                                  });
                                }}
                              />
                            </div>
                          )}
                        </td>

                        {/* 4. Interactive Priority Column */}
                        <td className="py-2.5 px-2 relative">
                          <div 
                            onClick={(e) => handleTogglePopover(e, task.id, 'priority')}
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
                              className={`absolute ${activePopover?.opensUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${activePopover?.opensLeft ? 'right-0' : 'left-0'} z-50 w-48 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-1.5 space-y-1 text-xs`}
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
                            onClick={(e) => handleTogglePopover(e, task.id, 'subtasks')}
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
                              className={`absolute ${activePopover?.opensUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${activePopover?.opensLeft ? 'right-0' : 'left-0'} z-50 w-72 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-3 space-y-2 text-xs`}
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
                            onClick={(e) => handleTogglePopover(e, task.id, 'status')}
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
                              className={`absolute ${activePopover?.opensUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${activePopover?.opensLeft ? 'right-0' : 'left-0'} z-50 w-48 bg-[#222427] border border-[#383a3e] rounded-lg shadow-2xl p-1.5 space-y-1 text-xs`}
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
    </>
  );
}
