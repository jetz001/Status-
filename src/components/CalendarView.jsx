import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Flag, 
  Search, 
  Filter, 
  Layers, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  GripVertical
} from 'lucide-react';
import { isRoutineTask } from '../utils/routineUtils.js';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS_FULL = [
  { short: 'อา.', full: 'อาทิตย์', isWeekend: true },
  { short: 'จ.', full: 'จันทร์', isWeekend: false },
  { short: 'อ.', full: 'อังคาร', isWeekend: false },
  { short: 'พ.', full: 'พุธ', isWeekend: false },
  { short: 'พฤ.', full: 'พฤหัสบดี', isWeekend: false },
  { short: 'ศ.', full: 'ศุกร์', isWeekend: false },
  { short: 'ส.', full: 'เสาร์', isWeekend: true }
];

const STATUS_CONFIG = {
  'NOT STARTED': { label: 'Not Started', color: '#6b7280', bg: '#374151' },
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

export default function CalendarView({
  tasks = [],
  allTasks = [],
  onSelectTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onQuickAddTask,
  onOpenPrintReport,
  activeListName = 'Tasks',
  activeListId = 'all'
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hideCompleted, setHideCompleted] = useState(() => {
    return localStorage.getItem('status_hide_completed') === 'true';
  });
  const [hideRoutine, setHideRoutine] = useState(() => {
    return localStorage.getItem('status_hide_routine') === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [quickAddDate, setQuickAddDate] = useState(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navigation Handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar Grid Calculation (7 columns: Sun - Sat)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // 1. Previous Month Leading Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonthDate = new Date(currentYear, currentMonth - 1, day);
      const iso = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        date: prevMonthDate,
        dayNumber: day,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayIso
      });
    }

    // 2. Current Month Days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNumber: day,
        iso,
        isCurrentMonth: true,
        isToday: iso === todayIso
      });
    }

    // 3. Next Month Trailing Days (to complete grid rows up to 35 or 42)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextMonthDate = new Date(currentYear, currentMonth + 1, day);
      const iso = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        date: nextMonthDate,
        dayNumber: day,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayIso
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayIso]);

  // Tasks Filtered for active list and search
  const displayTasks = useMemo(() => {
    return tasks.filter(task => {
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (hideCompleted && task.status === 'COMPLETED') return false;
      if (hideRoutine && isRoutineTask(task)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (task.name || '').toLowerCase().includes(q);
        const matchAssignee = (task.assignee || '').toLowerCase().includes(q);
        if (!matchName && !matchAssignee) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, hideCompleted, hideRoutine, searchQuery]);

  // Map tasks to their dates
  const { dateTaskMap, unscheduledTasks } = useMemo(() => {
    const map = {};
    const unscheduled = [];

    displayTasks.forEach(task => {
      if (!task.due_date) {
        unscheduled.push(task);
        return;
      }

      // Check if due_date is in valid YYYY-MM-DD format
      const datePart = task.due_date.split('T')[0];
      if (!map[datePart]) {
        map[datePart] = [];
      }
      map[datePart].push(task);
    });

    return { dateTaskMap: map, unscheduledTasks: unscheduled };
  }, [displayTasks]);

  // Monthly summary stats for current month
  const monthlyStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let overdue = 0;

    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    displayTasks.forEach(task => {
      if (task.due_date && task.due_date.startsWith(monthPrefix)) {
        total++;
        if (task.status === 'COMPLETED') {
          completed++;
        } else if (task.due_date < todayIso) {
          overdue++;
        }
      }
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, overdue, percent };
  }, [displayTasks, currentYear, currentMonth, todayIso]);

  // Drag & Drop Handlers
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(task);
  };

  const handleDragOver = (e, iso) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== iso) {
      setDragOverDate(iso);
    }
  };

  const handleDragLeave = (e, iso) => {
    if (dragOverDate === iso) {
      setDragOverDate(null);
    }
  };

  const handleDrop = async (e, targetIso) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTask?.id;
    if (!taskId) return;

    if (onUpdateTask) {
      onUpdateTask(taskId, { due_date: targetIso });
    }
    setDraggedTask(null);
  };

  // Quick Add on Date Cell
  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickAddTitle.trim() || !quickAddDate) return;

    if (onQuickAddTask) {
      onQuickAddTask(quickAddTitle.trim(), 'NOT STARTED', quickAddDate);
    }
    setQuickAddTitle('');
    setQuickAddDate(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#18191b] overflow-hidden select-none text-xs">
      {/* 1. Header Toolbar (Navigation, Month Title, Stats, Print & Filter) */}
      <div className="p-3.5 bg-[#1e1f21] border-b border-[#333538] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Month Navigation & Today */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-[#141517] border border-[#383a3e] rounded-lg overflow-hidden shadow-xs">
            <button
              onClick={handlePrevMonth}
              title="เดือนก่อนหน้า"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#252629] transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-gray-200 hover:text-white hover:bg-[#252629] border-x border-[#383a3e] transition cursor-pointer"
            >
              วันนี้
            </button>
            <button
              onClick={handleNextMonth}
              title="เดือนถัดไป"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#252629] transition cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month & Year Text Display */}
          <div className="flex items-baseline space-x-2">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              {THAI_MONTHS_FULL[currentMonth]} {currentYear + 543}
            </h2>
            <span className="text-xs text-gray-500 font-normal">
              ({currentYear})
            </span>
          </div>
        </div>

        {/* Center: Monthly Summary Stats Badge */}
        <div className="hidden md:flex items-center space-x-3 bg-[#141517] px-3 py-1.5 rounded-lg border border-[#333538] text-[11px]">
          <div className="flex items-center space-x-1.5 text-gray-300">
            <Layers size={13} className="text-purple-400" />
            <span>งานในเดือนนี้: <strong className="text-white">{monthlyStats.total}</strong></span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 size={13} />
            <span>เสร็จ: <strong>{monthlyStats.completed}</strong> ({monthlyStats.percent}%)</span>
          </div>
          {monthlyStats.overdue > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <div className="flex items-center space-x-1.5 text-rose-400">
                <AlertCircle size={13} />
                <span>ค้างส่ง: <strong>{monthlyStats.overdue}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* Right: Search, Filter, Print & Unscheduled Sidebar Toggle */}
        <div className="flex items-center space-x-2">
          {/* Status Filter Dropdown */}
          <div className="relative">
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
          </div>

          {/* Hide Completed Tasks Checkbox */}
          <label className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#141517] hover:bg-[#1c1d20] border border-[#383a3e] hover:border-[#4f5157] rounded-lg text-xs text-gray-300 hover:text-white cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => {
                setHideCompleted(e.target.checked);
                localStorage.setItem('status_hide_completed', e.target.checked.toString());
              }}
              className="w-3.5 h-3.5 rounded text-purple-600 bg-[#24262b] border-[#383a3e] focus:ring-purple-500 cursor-pointer accent-purple-600"
            />
            <span className="font-medium whitespace-nowrap">ซ่อนงานเสร็จแล้ว</span>
          </label>

          {/* Hide Routine Tasks Checkbox */}
          <label className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#141517] hover:bg-[#1c1d20] border border-[#383a3e] hover:border-[#4f5157] rounded-lg text-xs text-amber-300 hover:text-amber-200 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={hideRoutine}
              onChange={(e) => {
                setHideRoutine(e.target.checked);
                localStorage.setItem('status_hide_routine', e.target.checked.toString());
              }}
              className="w-3.5 h-3.5 rounded text-amber-500 bg-[#24262b] border-[#383a3e] focus:ring-amber-500 cursor-pointer accent-amber-500"
            />
            <span className="font-medium whitespace-nowrap">ซ่อนงาน Routine</span>
          </label>
          <button
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition font-medium cursor-pointer ${
              showUnscheduled
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30'
                : 'bg-[#141517] text-gray-400 border-[#383a3e] hover:text-gray-200'
            }`}
            title="เปิด/ปิด แถบงานที่ยังไม่ได้ระบุวันกำหนดส่ง"
          >
            <Clock size={13} />
            <span>งานรอระบุวัน ({unscheduledTasks.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Main Calendar Body & Unscheduled Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden p-3 bg-[#18191b]">
          {/* Day of Week Headers (7 columns: Sun - Sat) */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
            {THAI_DAYS_FULL.map((d, idx) => (
              <div 
                key={idx}
                className={`py-1.5 rounded bg-[#1e1f21] border border-[#2a2b2d] font-bold text-[11px] ${
                  d.isWeekend ? 'text-red-400/90' : 'text-gray-300'
                }`}
              >
                <span>{d.short}</span>
                <span className="hidden md:inline ml-1 font-normal text-[10px] text-gray-500">({d.full})</span>
              </div>
            ))}
          </div>

          {/* Date Cells Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-1.5 overflow-y-auto">
            {calendarCells.map((cell, index) => {
              const dayTasks = dateTaskMap[cell.iso] || [];
              const isDragOver = dragOverDate === cell.iso;
              const isToday = cell.isToday;

              return (
                <div
                  key={cell.iso + index}
                  onDragOver={(e) => handleDragOver(e, cell.iso)}
                  onDragLeave={(e) => handleDragLeave(e, cell.iso)}
                  onDrop={(e) => handleDrop(e, cell.iso)}
                  className={`flex flex-col rounded-lg border p-1.5 transition duration-150 relative group ${
                    isDragOver 
                      ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/50' 
                      : cell.isCurrentMonth
                        ? isToday
                          ? 'bg-[#22242b] border-[#7b68ee] shadow-sm'
                          : 'bg-[#1e1f21] border-[#2d2f34] hover:border-gray-600'
                        : 'bg-[#151618]/70 border-[#242528] opacity-50'
                  }`}
                >
                  {/* Cell Header: Date Number & Quick Add Button */}
                  <div className="flex items-center justify-between pb-1 border-b border-[#2d2f34]/60">
                    <div className="flex items-center space-x-1">
                      <span 
                        className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                          isToday 
                            ? 'bg-[#7b68ee] text-white shadow-xs' 
                            : cell.isCurrentMonth 
                              ? 'text-gray-200' 
                              : 'text-gray-500'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-semibold text-[#7b68ee] hidden sm:inline">วันนี้</span>
                      )}
                    </div>

                    {/* Quick Add Button (+) */}
                    <button
                      onClick={() => {
                        setQuickAddDate(cell.iso);
                        setQuickAddTitle('');
                      }}
                      title={`เพิ่มงานในวันที่ ${cell.dayNumber}`}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#333538] text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Inline Quick Add Input for this cell */}
                  {quickAddDate === cell.iso && (
                    <form onSubmit={handleQuickAddSubmit} className="mt-1 space-y-1 z-10 bg-[#25272c] p-1.5 rounded border border-[#7b68ee] shadow-lg">
                      <input
                        autoFocus
                        type="text"
                        placeholder="ชื่องานใหม่..."
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setQuickAddDate(null);
                        }}
                        className="w-full bg-[#18191b] border border-[#3e4147] rounded px-1.5 py-1 text-white text-[11px] outline-none focus:border-[#7b68ee]"
                      />
                      <div className="flex justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => setQuickAddDate(null)}
                          className="px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-gray-200"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          disabled={!quickAddTitle.trim()}
                          className="px-2 py-0.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white rounded text-[10px] font-semibold"
                        >
                          เพิ่ม
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Tasks List inside Day Cell */}
                  <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-0.5 max-h-[140px]">
                    {dayTasks.map(task => {
                      const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['NOT STARTED'];
                      const priorityColor = PRIORITIES[task.priority]?.color || '#9ca3af';
                      const isCompleted = task.status === 'COMPLETED';

                      return (
                        <div
                          key={task.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => onSelectTask && onSelectTask(task)}
                          title={`${task.name}\nสถานะ: ${task.status}\nกำหนดส่ง: ${task.due_date || 'ไม่มี'}\nผู้รับผิดชอบ: ${task.assignee || 'ยังไม่ระบุ'}`}
                          style={{ borderLeftColor: statusCfg.color }}
                          className={`p-1.5 rounded bg-[#25262a] hover:bg-[#2d2f34] border border-[#35373d] border-l-3 transition shadow-xs cursor-pointer group/task flex items-center space-x-1.5 ${
                            isCompleted ? 'opacity-60' : ''
                          }`}
                        >
                          {/* Complete Checkbox Toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = isCompleted ? 'NOT STARTED' : 'COMPLETED';
                              onUpdateTaskStatus && onUpdateTaskStatus(task.id, next);
                            }}
                            className="text-gray-400 hover:text-emerald-400 transition flex-shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={13} className="text-emerald-400" />
                            ) : (
                              <Circle size={13} />
                            )}
                          </button>

                          {/* Task Name with Ellipsis */}
                          <span className={`flex-1 truncate font-medium text-[11px] ${
                            isCompleted ? 'line-through text-gray-500' : 'text-gray-200 group-hover/task:text-white'
                          }`}>
                            {task.name}
                          </span>

                          {/* Priority Flag */}
                          {task.priority && task.priority !== 'Normal' && (
                            <Flag size={10} style={{ color: priorityColor }} className="flex-shrink-0" />
                          )}

                          {/* Assignee Avatar */}
                          {task.assignee && (
                            <div 
                              title={task.assignee}
                              className="w-4 h-4 rounded-full bg-[#7b68ee]/30 text-purple-200 text-[8px] font-bold flex items-center justify-center flex-shrink-0"
                            >
                              {task.assignee.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Unscheduled Tasks Collapsible Sidebar */}
        {showUnscheduled && (
          <div className="w-72 bg-[#1e1f21] border-l border-[#333538] flex flex-col h-full shadow-lg">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-[#333538] flex items-center justify-between bg-[#1a1b1d]">
              <div className="flex items-center space-x-2 text-gray-200">
                <Clock size={15} className="text-amber-400" />
                <h3 className="font-bold text-xs">งานรอระบุวันกำหนดส่ง</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-500/40 rounded-full">
                {unscheduledTasks.length}
              </span>
            </div>

            {/* Instruction Banner */}
            <div className="p-2.5 bg-[#161719] border-b border-[#2d2f34] text-[11px] text-gray-400 flex items-center space-x-2">
              <GripVertical size={14} className="text-purple-400 flex-shrink-0" />
              <span>ลากงานจากการ์ดด้านล่างไปวางลงในช่องวันที่เพื่อตั้งกำหนดส่ง</span>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {unscheduledTasks.map(task => {
                const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['NOT STARTED'];

                return (
                  <div
                    key={task.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => onSelectTask && onSelectTask(task)}
                    title="ลากไปวางในช่องวันที่บนปฏิทิน หรือคลิกเพื่อแก้ไข"
                    style={{ borderLeftColor: statusCfg.color }}
                    className="p-2 bg-[#25262a] hover:bg-[#2d2f34] border border-[#35373d] border-l-3 rounded-lg cursor-grab active:cursor-grabbing transition shadow-xs space-y-1 group"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="text-gray-400 group-hover:text-purple-400 transition">
                        <GripVertical size={12} />
                      </span>
                      <span className="flex-1 font-medium text-gray-200 text-xs truncate">
                        {task.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                      <span 
                        className="px-1.5 py-0.5 rounded font-semibold text-[9px]"
                        style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
                      >
                        {task.status}
                      </span>

                      {task.assignee && (
                        <span className="text-gray-400 truncate max-w-[90px]">
                          👤 {task.assignee}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {unscheduledTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500 space-y-2">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500/60" />
                  <p className="text-xs">ทุกงานมีกำหนดส่งครบถ้วนแล้ว!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
