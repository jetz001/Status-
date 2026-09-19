import React, { useState, useMemo } from 'react';
import { 
  Grid2X2, 
  Flame, 
  CalendarClock, 
  Users, 
  Trash2, 
  Search, 
  Filter, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Flag,
  Clock,
  AlertCircle,
  GripVertical
} from 'lucide-react';
import { isRoutineTask } from '../utils/routineUtils.js';

const QUADRANTS = {
  q1: {
    id: 'q1',
    code: 'Q1',
    title: 'ทำทันที (Do First)',
    subtitle: 'ด่วน & สำคัญ (Urgent & Important)',
    description: 'งานวิกฤต หรือกำหนดส่งกระชั้นชิด ต้องลงมือทำทันที',
    color: '#ef4444',
    accentBorder: 'border-rose-500',
    bgLight: 'bg-rose-950/15 hover:bg-rose-950/20',
    headerBg: 'bg-gradient-to-r from-rose-900/40 to-rose-800/20 text-rose-300 border-b border-rose-500/30',
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
    icon: Flame,
    defaultPriority: 'Urgent'
  },
  q2: {
    id: 'q2',
    code: 'Q2',
    title: 'วางแผน (Schedule)',
    subtitle: 'ไม่ด่วน แต่สำคัญ (Not Urgent & Important)',
    description: 'งานเชิงกลยุทธ์ วางระบบ ป้องกันปัญหา กำหนดวันส่งชัดเจน',
    color: '#3b82f6',
    accentBorder: 'border-blue-500',
    bgLight: 'bg-blue-950/15 hover:bg-blue-950/20',
    headerBg: 'bg-gradient-to-r from-blue-900/40 to-blue-800/20 text-blue-300 border-b border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    icon: CalendarClock,
    defaultPriority: 'High'
  },
  q3: {
    id: 'q3',
    code: 'Q3',
    title: 'มอบหมาย (Delegate)',
    subtitle: 'ด่วน แต่ไม่สำคัญ (Urgent & Not Important)',
    description: 'งานแทรก งานเร่งด่วนทั่วไปที่สามารถกระจายให้ทีมช่วยทำได้',
    color: '#eab308',
    accentBorder: 'border-amber-500',
    bgLight: 'bg-amber-950/15 hover:bg-amber-950/20',
    headerBg: 'bg-gradient-to-r from-amber-900/40 to-amber-800/20 text-amber-300 border-b border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    icon: Users,
    defaultPriority: 'Normal'
  },
  q4: {
    id: 'q4',
    code: 'Q4',
    title: 'ลดละ/พักไว้ (Eliminate)',
    subtitle: 'ไม่ด่วน & ไม่สำคัญ (Not Urgent & Not Important)',
    description: 'งานจิปาถะ งานที่สร้างผลลัพธ์ต่ำ พักไว้หรือคัดทิ้ง',
    color: '#6b7280',
    accentBorder: 'border-gray-500',
    bgLight: 'bg-gray-900/25 hover:bg-gray-900/35',
    headerBg: 'bg-gradient-to-r from-gray-800/40 to-gray-700/20 text-gray-300 border-b border-gray-600/30',
    badge: 'bg-gray-500/20 text-gray-300 border border-gray-500/40',
    icon: Trash2,
    defaultPriority: 'Low'
  }
};

const STATUS_CONFIG = {
  'NOT STARTED': { label: 'Not Started', color: '#9ca3af', bg: '#374151' },
  'IN PROGRESS': { label: 'In Progress', color: '#3b82f6', bg: '#1e3a8a' },
  'IN REVIEW': { label: 'In Review', color: '#eab308', bg: '#713f12' },
  'BLOCKED': { label: 'Blocked', color: '#ef4444', bg: '#7f1d1d' },
  'COMPLETED': { label: 'Completed', color: '#10b981', bg: '#064e3b' }
};

const PRIORITIES = {
  'Urgent': { color: '#ef4444' },
  'High': { color: '#f97316' },
  'Normal': { color: '#3b82f6' },
  'Low': { color: '#9ca3af' }
};

/**
 * Categorize a task into an Eisenhower quadrant
 */
export function getTaskQuadrant(task) {
  if (task.eisenhower_quadrant && ['q1', 'q2', 'q3', 'q4'].includes(task.eisenhower_quadrant)) {
    return task.eisenhower_quadrant;
  }

  const priorityUpper = (task.priority || 'NORMAL').toUpperCase();
  const isPriorityImportant = priorityUpper === 'URGENT' || priorityUpper === 'HIGH';

  const todayIso = new Date().toISOString().split('T')[0];
  const next3Days = new Date();
  next3Days.setDate(next3Days.getDate() + 3);
  const next3DaysIso = next3Days.toISOString().split('T')[0];

  const isDueSoon = task.due_date && (task.due_date <= next3DaysIso);
  const isUrgentPriority = priorityUpper === 'URGENT';

  const isUrgent = isUrgentPriority || isDueSoon;
  const isImportant = isPriorityImportant;

  if (isUrgent && isImportant) return 'q1';
  if (!isUrgent && isImportant) return 'q2';
  if (isUrgent && !isImportant) return 'q3';
  return 'q4';
}

export default function MatrixView({
  tasks = [],
  allTasks = [],
  onSelectTask,
  onUpdateTask,
  activeListName = 'Tasks',
  activeListId = 'all'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hideRoutine, setHideRoutine] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState(null);

  const todayIso = new Date().toISOString().split('T')[0];

  // Filter tasks by list, hideCompleted, hideRoutine, status, search
  const displayTasks = useMemo(() => {
    let list = tasks.length > 0 ? tasks : allTasks;
    if (hideCompleted) {
      list = list.filter(t => t.status !== 'COMPLETED');
    }
    if (hideRoutine) {
      list = list.filter(t => !isRoutineTask(t));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'ALL') {
      list = list.filter(t => t.status === statusFilter);
    }
    return list;
  }, [tasks, allTasks, hideCompleted, hideRoutine, searchQuery, statusFilter]);

  // Group tasks by Quadrants
  const quadrantTasks = useMemo(() => {
    const map = { q1: [], q2: [], q3: [], q4: [] };
    displayTasks.forEach(task => {
      const q = getTaskQuadrant(task);
      if (map[q]) {
        map[q].push(task);
      } else {
        map.q4.push(task);
      }
    });
    return map;
  }, [displayTasks]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = displayTasks.length;
    const q1Count = quadrantTasks.q1.length;
    const q2Count = quadrantTasks.q2.length;
    const q3Count = quadrantTasks.q3.length;
    const q4Count = quadrantTasks.q4.length;
    return {
      total,
      q1Count,
      q2Count,
      q3Count,
      q4Count,
      q1Pct: total > 0 ? Math.round((q1Count / total) * 100) : 0,
      q2Pct: total > 0 ? Math.round((q2Count / total) * 100) : 0,
      q3Pct: total > 0 ? Math.round((q3Count / total) * 100) : 0,
      q4Pct: total > 0 ? Math.round((q4Count / total) * 100) : 0
    };
  }, [displayTasks, quadrantTasks]);

  // Drag & Drop
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(task);
  };

  const handleDragOver = (e, quadId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverQuadrant !== quadId) {
      setDragOverQuadrant(quadId);
    }
  };

  const handleDragLeave = (e, quadId) => {
    if (dragOverQuadrant === quadId) {
      setDragOverQuadrant(null);
    }
  };

  const handleDrop = (e, targetQuadId) => {
    e.preventDefault();
    setDragOverQuadrant(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTask?.id;
    if (!taskId) return;

    const updates = { eisenhower_quadrant: targetQuadId };
    if (targetQuadId === 'q1') {
      updates.priority = 'Urgent';
    } else if (targetQuadId === 'q2') {
      updates.priority = 'High';
    } else if (targetQuadId === 'q3') {
      updates.priority = 'Normal';
    } else if (targetQuadId === 'q4') {
      updates.priority = 'Low';
    }

    if (onUpdateTask) {
      onUpdateTask(taskId, updates);
    }
    setDraggedTask(null);
  };


  return (
    <div className="flex-1 flex flex-col h-full bg-[#141517] overflow-hidden select-none text-xs">
      {/* 1. Top Header Toolbar */}
      <div className="p-3.5 bg-[#1e1f21] border-b border-[#333538] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Title & Concept */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-xs">
            <Grid2X2 size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Eisenhower Matrix
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                Urgent vs Important
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              จัดลำดับความสำคัญของงาน 4 มิติ: ด่วน & สำคัญ เพื่อประสิทธิภาพสูงสุด
            </p>
          </div>
        </div>

        {/* Center: KPI Stats Banner */}
        <div className="hidden lg:flex items-center space-x-3 bg-[#141517] px-3.5 py-1.5 rounded-lg border border-[#333538] text-[11px]">
          <div className="flex items-center space-x-1.5 text-rose-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Q1 ทำทันที: <strong>{stats.q1Count}</strong> ({stats.q1Pct}%)</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-1.5 text-blue-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Q2 วางแผน: <strong>{stats.q2Count}</strong> ({stats.q2Pct}%)</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-1.5 text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Q3 มอบหมาย: <strong>{stats.q3Count}</strong> ({stats.q3Pct}%)</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-1.5 text-gray-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span>Q4 พักไว้: <strong>{stats.q4Count}</strong> ({stats.q4Pct}%)</span>
          </div>
        </div>

        {/* Right: Search, Filter, Hide Completed */}
        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input 
              type="text" 
              placeholder="ค้นหางานใน Matrix..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 bg-[#141517] border border-[#383a3e] rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-[#7b68ee] w-36 sm:w-44 transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#141517] border border-[#383a3e] rounded-lg text-xs text-gray-300 outline-none focus:border-[#7b68ee] cursor-pointer"
          >
            <option value="ALL">ทุกสถานะ (All Status)</option>
            <option value="NOT STARTED">Not Started</option>
            <option value="IN PROGRESS">In Progress</option>
            <option value="IN REVIEW">In Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Hide Completed Tasks Checkbox */}
          <label className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#141517] hover:bg-[#1c1d20] border border-[#383a3e] hover:border-[#4f5157] rounded-lg text-xs text-gray-300 hover:text-white cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-purple-600 bg-[#24262b] border-[#383a3e] focus:ring-purple-500 cursor-pointer accent-purple-600"
            />
            <span className="font-medium whitespace-nowrap">ซ่อนงานเสร็จแล้ว</span>
          </label>

          {/* Hide Routine Tasks Checkbox */}
          <label className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#141517] hover:bg-[#1c1d20] border border-[#383a3e] hover:border-[#4f5157] rounded-lg text-xs text-amber-300 hover:text-amber-200 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={hideRoutine}
              onChange={(e) => setHideRoutine(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-amber-500 bg-[#24262b] border-[#383a3e] focus:ring-amber-500 cursor-pointer accent-amber-500"
            />
            <span className="font-medium whitespace-nowrap">ซ่อนงาน Routine</span>
          </label>
        </div>
      </div>

      {/* 2. Main Matrix View Body: 2x2 Grid with Visual Crossed Axes */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden relative">
        {/* Top & Bottom Horizontal Axis Guides */}
        <div className="flex items-center justify-between px-4 pb-1.5 text-[11px] font-bold tracking-wide">
          <div className="flex items-center space-x-1 text-blue-400">
            <ArrowLeft size={13} />
            <span>◄ ไม่เร่งด่วน (Not Urgent)</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 bg-[#1e1f21] px-3 py-0.5 rounded-full border border-[#333538] text-[10px]">
            <span>แกนนอน: ความเร่งด่วน (Urgency)</span>
          </div>
          <div className="flex items-center space-x-1 text-rose-400">
            <span>เร่งด่วน (Urgent) ►</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* 2x2 Grid Container with Crossed Axes */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 relative overflow-hidden">
          {/* Central Vertical Axis Line */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-purple-500/60 via-purple-400/80 to-purple-500/60 pointer-events-none z-10 hidden md:block" />
          
          {/* Central Horizontal Axis Line */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-purple-500/60 via-purple-400/80 to-purple-500/60 pointer-events-none z-10 hidden md:block" />

          {/* Central Intersection Badge */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1e1f21] border-2 border-purple-500 text-purple-300 px-2 py-0.5 rounded-full text-[9px] font-black shadow-lg pointer-events-none z-20 hidden md:flex items-center space-x-1">
            <Grid2X2 size={10} />
            <span>MATRIX</span>
          </div>

          {/* Render the 4 Quadrants: Q2 (Top-Left), Q1 (Top-Right), Q4 (Bottom-Left), Q3 (Bottom-Right) */}
          {['q2', 'q1', 'q4', 'q3'].map((quadId) => {
            const quad = QUADRANTS[quadId];
            const tasksList = quadrantTasks[quadId] || [];
            const isDragOver = dragOverQuadrant === quadId;
            const IconComp = quad.icon;

            return (
              <div
                key={quadId}
                onDragOver={(e) => handleDragOver(e, quadId)}
                onDragLeave={(e) => handleDragLeave(e, quadId)}
                onDrop={(e) => handleDrop(e, quadId)}
                className={`flex flex-col rounded-xl border transition duration-200 overflow-hidden ${
                  isDragOver 
                    ? `border-2 ${quad.accentBorder} bg-purple-950/25 ring-2 ring-purple-500/30` 
                    : `border-[#333538] ${quad.bgLight}`
                }`}
              >
                {/* Quadrant Header */}
                <div className={`p-2.5 flex items-center justify-between ${quad.headerBg} select-none`}>
                  <div className="flex items-center space-x-2">
                    <div className="p-1 rounded-md bg-black/30">
                      <IconComp size={15} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm">{quad.code}: {quad.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${quad.badge}`}>
                          {tasksList.length}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-80">{quad.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Task Cards List (Scrollable) */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                  {tasksList.length === 0 ? (
                    <div className="h-full min-h-[90px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#333538]/60 rounded-lg">
                      <p className="text-gray-500 font-medium text-[11px]">{quad.description}</p>
                      <p className="text-[10px] text-gray-600 mt-1">ลากงานมาวางในช่องนี้เพื่อจัดหมวดหมู่</p>
                    </div>
                  ) : (
                    tasksList.map((task) => {
                      const isCompleted = task.status === 'COMPLETED';
                      const pConfig = PRIORITIES[task.priority] || PRIORITIES['Normal'];
                      const sConf = STATUS_CONFIG[task.status] || STATUS_CONFIG['NOT STARTED'];

                      let dueBadge = null;
                      if (task.due_date) {
                        const isOverdue = task.due_date < todayIso && !isCompleted;
                        const isToday = task.due_date === todayIso && !isCompleted;
                        dueBadge = (
                          <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            isOverdue ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                            isToday ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                            'bg-[#282a2d] text-gray-300'
                          }`}>
                            <Clock size={10} />
                            <span>{task.due_date.slice(5)}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => onSelectTask && onSelectTask(task)}
                          className={`p-2.5 rounded-lg border transition duration-150 cursor-grab active:cursor-grabbing shadow-xs group ${
                            isCompleted 
                              ? 'bg-[#18191b]/80 border-[#2a2b2d] opacity-60' 
                              : 'bg-[#1e2023] border-[#333538] hover:border-[#45474c] hover:bg-[#232529]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-semibold leading-snug truncate ${
                                isCompleted ? 'line-through text-gray-500' : 'text-gray-100 group-hover:text-white'
                              }`} title={task.name}>
                                {task.name}
                              </h4>

                              {task.description && (
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Drag Indicator */}
                            <GripVertical size={13} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-0.5" />
                          </div>

                          {/* Footer Tags: Status, Priority, Due Date, Assignee */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2a2b2d] text-[10px]">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              {/* Status Pill */}
                              <span 
                                style={{ backgroundColor: sConf.bg, color: sConf.color }}
                                className="px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]"
                              >
                                {task.status || 'NOT STARTED'}
                              </span>

                              {/* Priority Flag */}
                              <div className="flex items-center space-x-0.5 text-gray-400" title={`ความสำคัญ: ${task.priority}`}>
                                <Flag size={10} style={{ color: pConfig.color }} />
                                <span>{task.priority || 'Normal'}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              {dueBadge}
                              {task.assignee && (
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[9px] shadow-xs" title={task.assignee}>
                                  {task.assignee.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Horizontal Axis Guides */}
        <div className="flex items-center justify-between px-4 pt-1.5 text-[11px] font-bold tracking-wide">
          <div className="flex items-center space-x-1 text-gray-400">
            <ArrowLeft size={13} />
            <span>◄ ไม่ด่วน (Not Urgent)</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 bg-[#1e1f21] px-3 py-0.5 rounded-full border border-[#333538] text-[10px]">
            <span>แกนตั้ง: ความสำคัญ (Importance) ▲ สำคัญมาก / ▼ สำคัญน้อย</span>
          </div>
          <div className="flex items-center space-x-1 text-amber-400">
            <span>ด่วน (Urgent) ►</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>
    </div>
  );
}
