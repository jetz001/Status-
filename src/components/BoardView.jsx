import React, { useState } from 'react';
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
  tasks,
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

  const handleAddCard = (status) => {
    if (!newCardTitle.trim()) return;
    onQuickAddTask({ name: newCardTitle.trim(), status });
    setNewCardTitle('');
    setAddingToStatus(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onUpdateTaskStatus(taskId, targetStatus);
    }
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

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex space-x-4 select-none">
      {STATUS_COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);

        return (
          <div 
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="w-80 bg-[#18191b] border border-[#2a2b2d] rounded-lg flex flex-col flex-shrink-0 max-h-full"
          >
            {/* Column Header */}
            <div className="p-3 border-b border-[#2a2b2d] flex items-center justify-between">
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
                onClick={() => setAddingToStatus(col.id)}
                className="p-1 hover:bg-[#2a2b2d] text-gray-400 hover:text-white rounded transition"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {colTasks.map(task => {
                const completedSubs = (task.subtasks || []).filter(s => s.completed).length;
                const totalSubs = (task.subtasks || []).length;
                const firstImg = task.attachments && task.attachments.length > 0 ? task.attachments[0].url : null;

                return (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onSelectTask(task)}
                    onContextMenu={(e) => handleTaskContextMenu(e, task)}
                    className="bg-[#222427] hover:bg-[#282a2e] border border-[#333538] hover:border-[#4a4d52] rounded-md p-3 cursor-grab active:cursor-grabbing transition shadow-sm group relative space-y-2"
                    title="คลิกขวาเพื่อเปิดเมนูลัด"
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
                      <div className="flex-1">
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
                        <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2">
                          {task.name}
                        </h4>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id);
                          }}
                          className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#333538] opacity-0 group-hover:opacity-100 transition"
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
                              className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-[#2a2b2d] flex items-center space-x-2"
                            >
                              <Edit3 size={12} />
                              <span>Edit Task</span>
                            </button>
                            <button
                              onClick={() => {
                                onOpenMoveCopy(task);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-[#2a2b2d] flex items-center space-x-2"
                            >
                              <ArrowRightLeft size={12} />
                              <span>Move / Copy</span>
                            </button>
                            <button
                              onClick={() => {
                                onDeleteTask(task.id);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-[#2a2b2d] flex items-center space-x-2"
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
                      <div className="flex items-center space-x-2">
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
                            <CheckSquare size={12} />
                            <span>{completedSubs}/{totalSubs}</span>
                          </div>
                        )}

                        {/* Due Date */}
                        {task.due_date && (
                          <div className="flex items-center space-x-1 text-gray-400">
                            <Calendar size={12} />
                            <span>{task.due_date.slice(5)}</span>
                          </div>
                        )}
                      </div>

                      {/* Assignee Avatar */}
                      <div className="w-5 h-5 rounded-full bg-[#3b3d45] border border-gray-600 flex items-center justify-center text-[9px] font-bold text-gray-200">
                        {task.assignee || 'JM'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Card Form inside column */}
              {addingToStatus === col.id ? (
                <div className="p-2 bg-[#222427] border border-[#7b68ee] rounded space-y-2">
                  <textarea
                    placeholder="ชื่องานใหม่..."
                    autoFocus
                    rows={2}
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    className="w-full bg-[#18191b] p-2 text-xs text-white rounded border border-[#333538] outline-none resize-none"
                  />
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => setAddingToStatus(null)}
                      className="px-2 py-1 text-gray-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleAddCard(col.id)}
                      className="px-3 py-1 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-medium rounded text-xs"
                    >
                      Add Card
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingToStatus(col.id);
                    setNewCardTitle('');
                  }}
                  className="w-full py-2 border border-dashed border-[#333538] hover:border-[#4f5259] rounded text-gray-400 hover:text-white flex items-center justify-center space-x-1.5 transition text-xs"
                >
                  <Plus size={13} />
                  <span>+ Add Card</span>
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
