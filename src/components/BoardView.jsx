import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  CheckSquare, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  ArrowRightLeft,
  Image as ImageIcon,
  Circle,
  Flag,
  Printer,
  ExternalLink,
  Copy
} from 'lucide-react';
import ContextMenu from './ContextMenu.jsx';

const STATUS_COLUMNS = [
  { id: 'NOT STARTED', name: 'NOT STARTED', color: '#e2483d' },
  { id: 'IN PROGRESS', name: 'IN PROGRESS', color: '#1e88e5' },
  { id: 'COMPLETED', name: 'COMPLETED', color: '#26b26d' }
];

export default function BoardView({
  tasks = [],
  onSelectTask,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
  onDeleteTask,
  onCopyTask,
  onOpenPrintSingleTask,
  onQuickAddTask,
  onOpenMoveCopy
}) {
  const [newCardTitle, setNewCardTitle] = useState('');
  const [addingToStatus, setAddingToStatus] = useState(null);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, items: [] });
  const [dragOverCol, setDragOverCol] = useState(null);
  const dragOccurredRef = useRef(false);

  // Close card 3-dots menu on window click
  useEffect(() => {
    if (!activeMenuTaskId) return;
    const handleWindowClick = () => setActiveMenuTaskId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [activeMenuTaskId]);

  const handleAddCard = (status) => {
    if (!newCardTitle.trim()) return;
    onQuickAddTask({ name: newCardTitle.trim(), status });
    setNewCardTitle('');
    setAddingToStatus(null);
  };

  // Drag and drop handlers with visual feedback and click conflict prevention
  const handleDragStart = (e, taskId) => {
    dragOccurredRef.current = true;
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragOverCol(null);
    setTimeout(() => {
      dragOccurredRef.current = false;
    }, 80);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onUpdateTaskStatus(taskId, targetStatus);
    }
    setTimeout(() => {
      dragOccurredRef.current = false;
    }, 80);
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

    const prioritySubmenu = [
      {
        label: 'Urgent (ด่วนมาก)',
        colorDot: '#ef4444',
        checked: task.priority === 'Urgent',
        onClick: () => onUpdateTaskPriority && onUpdateTaskPriority(task.id, 'Urgent')
      },
      {
        label: 'High (สูง)',
        colorDot: '#f59e0b',
        checked: task.priority === 'High',
        onClick: () => onUpdateTaskPriority && onUpdateTaskPriority(task.id, 'High')
      },
      {
        label: 'Normal (ปกติ)',
        colorDot: '#3b82f6',
        checked: task.priority === 'Normal' || !task.priority,
        onClick: () => onUpdateTaskPriority && onUpdateTaskPriority(task.id, 'Normal')
      },
      {
        label: 'Low (ต่ำ)',
        colorDot: '#94a3b8',
        checked: task.priority === 'Low',
        onClick: () => onUpdateTaskPriority && onUpdateTaskPriority(task.id, 'Low')
      }
    ];

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
          onClick: () => onDeleteTask && onDeleteTask(task.id)
        }
      ]
    });
  };

  const normalizeStatus = (status) => {
    const s = (status || '').toUpperCase().trim();
    if (s === 'DONE' || s === 'FINISHED' || s === 'SUCCESS' || s === 'COMPLETED') return 'COMPLETED';
    if (s === 'IN PROGRESS' || s === 'PROGRESS' || s === 'DOING' || s === 'WORKING') return 'IN PROGRESS';
    if (s === 'NOT STARTED' || s === 'TODO' || s === 'TO DO' || s === 'OPEN') return 'NOT STARTED';
    return s || 'NOT STARTED';
  };

  const isOverdue = (dateStr, status) => {
    if (!dateStr || normalizeStatus(status) === 'COMPLETED') return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  const isDueToday = (dateStr, status) => {
    if (!dateStr || normalizeStatus(status) === 'COMPLETED') return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const standardIds = new Set(STATUS_COLUMNS.map(c => c.id));
  const extraStatuses = [...new Set(
    tasks
      .map(t => normalizeStatus(t.status))
      .filter(s => !standardIds.has(s))
  )];

  const displayColumns = [
    ...STATUS_COLUMNS,
    ...extraStatuses.map(s => ({
      id: s,
      name: s,
      color: '#a855f7'
    }))
  ];

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex space-x-4 select-none">
      {displayColumns.map(col => {
        const colTasks = tasks.filter(t => normalizeStatus(t.status) === col.id);

        return (
          <div 
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`w-80 bg-[#18191b] border rounded-lg flex flex-col flex-shrink-0 max-h-full transition-all duration-150 ${
              dragOverCol === col.id
                ? 'border-[#7b68ee] bg-[#1d1e22] ring-2 ring-[#7b68ee]/30 shadow-lg'
                : 'border-[#2a2b2d]'
            }`}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-[#2a2b2d] flex items-center justify-between bg-[#191a1d] rounded-t-lg">
              <div className="flex items-center space-x-2">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: col.color }} 
                />
                <span className="font-bold text-xs text-white uppercase tracking-wider">
                  {col.name}
                </span>
                <span className="text-gray-400 text-xs font-semibold px-1.5 py-0.2 bg-[#222427] rounded">
                  {colTasks.length}
                </span>
              </div>
              <button 
                onClick={() => {
                  setAddingToStatus(col.id);
                  setNewCardTitle('');
                }}
                className="p-1 hover:bg-[#2a2b2d] text-gray-400 hover:text-white rounded transition cursor-pointer"
                title={`เพิ่มงานใน ${col.name}`}
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {colTasks.map(task => {
                const completedSubs = (task.subtasks || []).filter(s => s.completed).length;
                const totalSubs = (task.subtasks || []).length;
                
                // Safe check for image attachment (ignore pdf, docs, etc.)
                const imgAttachment = (task.attachments || []).find(att => {
                  if (att.mime_type && att.mime_type.startsWith('image/')) return true;
                  const target = (att.url || att.filename || att.original_name || '').toLowerCase();
                  return target.endsWith('.png') || target.endsWith('.jpg') || target.endsWith('.jpeg') || target.endsWith('.webp') || target.endsWith('.gif') || target.endsWith('.svg');
                });
                const firstImg = imgAttachment ? imgAttachment.url : null;

                const overdue = isOverdue(task.due_date, task.status);
                const dueToday = isDueToday(task.due_date, task.status);

                return (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (dragOccurredRef.current) return;
                      onSelectTask(task);
                    }}
                    onContextMenu={(e) => handleTaskContextMenu(e, task)}
                    className="bg-[#222427] hover:bg-[#282a2e] border border-[#333538] hover:border-[#4a4d52] rounded-md p-3 cursor-grab active:cursor-grabbing transition shadow-sm group relative space-y-2"
                    title="คลิกเพื่อดูรายละเอียด / คลิกขวาเพื่อเปิดเมนูลัด"
                  >
                    {/* Optional Image Thumbnail */}
                    {firstImg && (
                      <div className="w-full h-24 bg-[#18191b] rounded overflow-hidden border border-[#333538]">
                        <img 
                          src={firstImg} 
                          alt="Task attachment" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Card Title & 3-dots Menu */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        {task.list_name && (
                          <div className="mb-1">
                            <span 
                              style={{ borderColor: task.list_color ? `${task.list_color}40` : '#374151' }}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-[#1e2024] text-gray-400 border inline-flex items-center space-x-1"
                            >
                              <span 
                                className="w-1.5 h-1.5 rounded-full inline-block" 
                                style={{ backgroundColor: task.list_color || '#7b68ee' }} 
                              />
                              <span className="truncate max-w-[110px]">{task.list_name}</span>
                            </span>
                          </div>
                        )}
                        <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2 break-words">
                          {task.name}
                        </h4>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id);
                          }}
                          className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#333538] opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {/* Card Dropdown Menu */}
                        {activeMenuTaskId === task.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-6 w-36 bg-[#1e1f21] border border-[#383a3e] rounded shadow-xl py-1 z-30 text-xs"
                          >
                            <button
                              onClick={() => {
                                onSelectTask(task);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-[#2a2b2d] flex items-center space-x-2 cursor-pointer"
                            >
                              <Edit3 size={12} />
                              <span>Edit Task</span>
                            </button>
                            <button
                              onClick={() => {
                                onOpenMoveCopy && onOpenMoveCopy(task);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-[#2a2b2d] flex items-center space-x-2 cursor-pointer"
                            >
                              <ArrowRightLeft size={12} />
                              <span>Move / Copy</span>
                            </button>
                            <button
                              onClick={() => {
                                onDeleteTask && onDeleteTask(task.id);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-[#2a2b2d] flex items-center space-x-2 cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Metadata (Priority, Subtasks count, Due Date, Assignee) */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#2e3034] text-[11px] text-gray-400">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        {/* Priority Badge */}
                        {task.priority && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            task.priority === 'Urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            task.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-gray-700/40 text-gray-300'
                          }`}>
                            {task.priority}
                          </span>
                        )}

                        {/* Subtasks Counter */}
                        {totalSubs > 0 && (
                          <div className="flex items-center space-x-1 text-gray-400">
                            <CheckSquare size={11} />
                            <span>{completedSubs}/{totalSubs}</span>
                          </div>
                        )}

                        {/* Due Date */}
                        {task.due_date && (
                          <div className={`flex items-center space-x-1 ${
                            overdue 
                              ? 'text-rose-400 font-semibold' 
                              : dueToday 
                              ? 'text-amber-400 font-medium' 
                              : 'text-gray-400'
                          }`} title={overdue ? 'งานนี้เลยกำหนดส่งแล้ว' : dueToday ? 'กำหนดส่งวันนี้' : `กำหนดส่ง ${task.due_date}`}>
                            {overdue ? <AlertCircle size={11} className="text-rose-400" /> : <Calendar size={11} />}
                            <span>{task.due_date.slice(5)}</span>
                          </div>
                        )}
                      </div>

                      {/* Assignee Avatar */}
                      <div 
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition flex-shrink-0 ${
                          task.assignee 
                            ? 'bg-[#3b3d45] border-gray-500 text-gray-200' 
                            : 'bg-[#1e2024] border-dashed border-gray-600 text-gray-400'
                        }`}
                        title={task.assignee ? `ผู้รับผิดชอบ: ${task.assignee}` : 'ยังไม่ได้ระบุผู้รับผิดชอบ'}
                      >
                        {task.assignee ? task.assignee.slice(0, 2).toUpperCase() : '?'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty Column Placeholder */}
              {colTasks.length === 0 && addingToStatus !== col.id && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-[#282a2e] rounded-lg text-center my-2 select-none">
                  <span className="text-[11px] text-gray-500">ไม่มีงานในสถานะนี้</span>
                  <span className="text-[10px] text-gray-600 mt-1">ลากการ์ดมาวาง หรือกด + เพิ่มงาน</span>
                </div>
              )}

              {/* Add Card Form inside column */}
              {addingToStatus === col.id ? (
                <div className="p-2.5 bg-[#222427] border border-[#7b68ee] rounded-md space-y-2 shadow-md">
                  <textarea
                    placeholder="ชื่องานใหม่... (Enter เพื่อเพิ่ม, Esc เพื่อยกเลิก)"
                    autoFocus
                    rows={2}
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCard(col.id);
                      } else if (e.key === 'Escape') {
                        setAddingToStatus(null);
                      }
                    }}
                    className="w-full bg-[#18191b] p-2 text-xs text-white rounded border border-[#383a3e] focus:border-[#7b68ee] outline-none resize-none"
                  />
                  <div className="flex justify-end space-x-2 text-xs">
                    <button 
                      type="button"
                      onClick={() => setAddingToStatus(null)}
                      className="px-2.5 py-1 text-gray-400 hover:text-white rounded hover:bg-[#2d2f33] transition cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleAddCard(col.id)}
                      disabled={!newCardTitle.trim()}
                      className="px-3 py-1 bg-[#7b68ee] hover:bg-[#6a55e0] disabled:opacity-50 text-white font-medium rounded transition shadow cursor-pointer"
                    >
                      เพิ่มการ์ด
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingToStatus(col.id);
                    setNewCardTitle('');
                  }}
                  className="w-full py-2 border border-dashed border-[#333538] hover:border-[#7b68ee]/60 hover:text-white rounded text-gray-400 flex items-center justify-center space-x-1.5 transition text-xs cursor-pointer group"
                >
                  <Plus size={13} className="group-hover:text-[#7b68ee]" />
                  <span>+ เพิ่มงานใหม่</span>
                </button>
              )}
            </div>
          </div>
        );
      })}

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
