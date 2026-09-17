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
  ExternalLink
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

export default function ListView({
  tasks,
  fields = [],
  onSelectTask,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
  onDeleteTask,
  onCopyTask,
  onOpenPrintSingleTask,
  onQuickAddTask,
  onOpenMoveCopy,
  onOpenAddColumn
}) {
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddStatus, setQuickAddStatus] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, items: [] });

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
          onClick: () => setTaskToDelete(task)
        }
      ]
    });
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto p-4 space-y-6 text-xs select-none">
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
            <div className="bg-[#1e1f21] border border-[#2a2b2d] rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2a2b2d] text-gray-400 text-[11px] bg-[#1a1b1d]">
                    <th className="py-2 px-3 font-medium w-80">Name</th>
                    <th className="py-2 px-2 font-medium w-24">Assignee</th>
                    {fields.map(f => (
                      <th key={f.id} className="py-2 px-2 font-medium min-w-[130px]">
                        {f.name}
                      </th>
                    ))}
                    <th className="py-2 px-2 font-medium w-32">Status</th>
                    <th className="py-2 px-3 font-medium w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26272a]">
                  {groupTasks.map(task => {
                    const hasAttachments = task.attachments && task.attachments.length > 0;
                    return (
                      <tr 
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        onContextMenu={(e) => handleTaskContextMenu(e, task)}
                        className="hover:bg-[#252629] cursor-pointer group transition duration-150"
                        title="คลิกขวาเพื่อเปิดเมนูลัด"
                      >
                        {/* Name Column */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus = task.status === 'COMPLETED' ? 'NOT STARTED' : 'COMPLETED';
                                onUpdateTaskStatus(task.id, nextStatus);
                              }}
                              className="text-gray-500 hover:text-emerald-400 transition"
                            >
                              {task.status === 'COMPLETED' ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : (
                                <Circle size={16} />
                              )}
                            </button>

                            <span className={`font-medium truncate ${
                              task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-100'
                            }`}>
                              {task.name}
                            </span>

                            {hasAttachments && (
                              <span title={`${task.attachments.length} รูปภาพแนบ`}>
                                <ImageIcon size={13} className="text-purple-400 flex-shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Assignee */}
                        <td className="py-2.5 px-2">
                          <div className="w-6 h-6 rounded-full bg-[#3b3d45] border border-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-200 shadow-sm">
                            {task.assignee || 'JM'}
                          </div>
                        </td>

                        {/* Custom Fields */}
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

                        {/* Status Badge */}
                        <td className="py-2.5 px-2">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              const cycle = { 'NOT STARTED': 'IN PROGRESS', 'IN PROGRESS': 'COMPLETED', 'COMPLETED': 'NOT STARTED' };
                              onUpdateTaskStatus(task.id, cycle[task.status] || 'NOT STARTED');
                            }}
                            className="px-2.5 py-1 rounded text-[10px] font-bold tracking-wider inline-block cursor-pointer hover:opacity-80 transition shadow-sm"
                            style={{ backgroundColor: config.color, color: '#fff' }}
                            title="คลิกเพื่อเปลี่ยนสถานะงาน"
                          >
                            {task.status}
                          </span>
                        </td>

                        {/* Actions (Edit / Delete / Move) */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTask(task);
                              }}
                              title="แก้ไขงาน (Edit)"
                              className="p-1 hover:bg-[#383a3e] rounded text-gray-400 hover:text-white transition"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenMoveCopy(task);
                              }}
                              title="ย้ายหรือก๊อบปี้งานข้ามโปรเจกต์ (Move / Copy)"
                              className="p-1 hover:bg-[#383a3e] rounded text-gray-400 hover:text-blue-400 transition"
                            >
                              <ArrowRightLeft size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete(task);
                              }}
                              title="ลบงาน (Delete)"
                              className="p-1 hover:bg-[#383a3e] rounded text-gray-400 hover:text-red-400 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Inline Quick Add Item Row */}
                  <tr>
                    <td colSpan={fields.length + 4} className="py-2 px-3 bg-[#191a1c]/60">
                      {quickAddStatus === status ? (
                        <div className="flex items-center space-x-2">
                          <input 
                            type="text"
                            placeholder="ชื่องานใหม่... (กด Enter เพื่อบันทึก)"
                            autoFocus
                            value={quickAddName}
                            onChange={(e) => setQuickAddName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleQuickAdd(status);
                              if (e.key === 'Escape') setQuickAddStatus(null);
                            }}
                            className="flex-1 px-2.5 py-1 bg-[#222427] border border-[#7b68ee] rounded text-white text-xs outline-none"
                          />
                          <button 
                            onClick={() => handleQuickAdd(status)}
                            className="px-3 py-1 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-medium rounded text-xs"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setQuickAddStatus(null)}
                            className="px-2 py-1 text-gray-400 hover:text-white text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setQuickAddStatus(status);
                            setQuickAddName('');
                          }}
                          className="flex items-center space-x-1.5 text-gray-400 hover:text-white transition font-medium"
                        >
                          <Plus size={14} />
                          <span>+ Add Item</span>
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
