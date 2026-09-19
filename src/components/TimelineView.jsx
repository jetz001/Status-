import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Flag,
  Layers,
  Check
} from 'lucide-react';
import { isRoutineTask } from '../utils/routineUtils.js';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const STATUS_CONFIG = {
  'COMPLETED': { label: 'Completed', color: '#10b981', bg: '#064e3b' },
  'IN PROGRESS': { label: 'In Progress', color: '#3b82f6', bg: '#1e3a8a' },
  'IN REVIEW': { label: 'In Review', color: '#eab308', bg: '#713f12' },
  'BLOCKED': { label: 'Blocked', color: '#ef4444', bg: '#7f1d1d' },
  'NOT STARTED': { label: 'Not Started', color: '#9ca3af', bg: '#374151' }
};

export default function TimelineView({ tasks = [], onSelectTask, activeListName = 'Tasks' }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hideRoutine, setHideRoutine] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  const todayIso = today.toISOString().split('T')[0];
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthStartIso = `${monthPrefix}-01`;
  const monthEndIso = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleTodayMonth = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Generate days array for the selected month
  const monthDays = useMemo(() => {
    const list = [];
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateObj = new Date(currentYear, currentMonth, dayNum);
      const iso = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = dateObj.getDay();
      list.push({
        dayNumber: dayNum,
        iso,
        dayOfWeek: THAI_DAYS_SHORT[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: iso === todayIso
      });
    }
    return list;
  }, [currentYear, currentMonth, daysInMonth, monthPrefix, todayIso]);

  // Filter tasks
  const { monthTasks, unscheduledTasks, stats } = useMemo(() => {
    let filtered = tasks;

    // 1. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.toLowerCase().includes(q))
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // 3. Hide Completed
    if (hideCompleted) {
      filtered = filtered.filter(t => t.status !== 'COMPLETED');
    }

    // 4. Hide Routine
    if (hideRoutine) {
      filtered = filtered.filter(t => !isRoutineTask(t));
    }

    const inMonth = [];
    const unscheduled = [];
    let completedCount = 0;
    let overdueCount = 0;

    filtered.forEach(t => {
      const start = t.start_date;
      const due = t.due_date;

      if (!start && !due) {
        unscheduled.push(t);
        return;
      }

      // Check if task falls within or overlaps this month
      const taskStart = start || due;
      const taskDue = due || start;

      // Overlaps if: taskStart <= monthEnd && taskDue >= monthStart
      if (taskStart <= monthEndIso && taskDue >= monthStartIso) {
        inMonth.push(t);
        if (t.status === 'COMPLETED') {
          completedCount++;
        } else if (t.due_date && t.due_date < todayIso) {
          overdueCount++;
        }
      }
    });

    return {
      monthTasks: inMonth,
      unscheduledTasks: unscheduled,
      stats: {
        total: inMonth.length,
        completed: completedCount,
        overdue: overdueCount,
        percent: inMonth.length > 0 ? Math.round((completedCount / inMonth.length) * 100) : 0
      }
    };
  }, [tasks, searchQuery, statusFilter, hideCompleted, hideRoutine, monthStartIso, monthEndIso, todayIso]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141517] overflow-hidden select-none text-xs">
      {/* 1. Top Controls Bar */}
      <div className="p-3.5 bg-[#1e1f21] border-b border-[#333538] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Month Navigator & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-[#141517] p-1 rounded-lg border border-[#383a3e]">
            <button 
              onClick={handlePrevMonth}
              title="เดือนก่อนหน้า"
              className="p-1.5 hover:bg-[#25272a] rounded text-gray-300 hover:text-white transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleTodayMonth}
              className="px-2.5 py-1 text-xs font-bold text-gray-200 hover:text-white hover:bg-[#25272a] rounded transition cursor-pointer"
            >
              วันนี้
            </button>
            <button 
              onClick={handleNextMonth}
              title="เดือนถัดไป"
              className="p-1.5 hover:bg-[#25272a] rounded text-gray-300 hover:text-white transition cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {THAI_MONTHS[currentMonth]} {currentYear + 543}
              </h2>
              <span className="text-xs text-gray-500 font-normal">
                ({currentYear})
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              แผนผังกำหนดการทำงาน Gantt Timeline รายเดือน ({daysInMonth} วัน)
            </p>
          </div>
        </div>

        {/* Center: KPI Stats Banner */}
        <div className="hidden lg:flex items-center space-x-3 bg-[#141517] px-3.5 py-1.5 rounded-lg border border-[#333538] text-[11px]">
          <div className="flex items-center space-x-1.5 text-gray-300">
            <Layers size={13} className="text-purple-400" />
            <span>งานในเดือนนี้: <strong className="text-white">{stats.total}</strong></span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 size={13} />
            <span>เสร็จ: <strong>{stats.completed}</strong> ({stats.percent}%)</span>
          </div>
          {stats.overdue > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <div className="flex items-center space-x-1.5 text-rose-400">
                <AlertCircle size={13} />
                <span>เลยกำหนด: <strong>{stats.overdue}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* Right: Search, Filters, Hide Checkboxes */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input 
              type="text" 
              placeholder="ค้นหาใน Timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 bg-[#141517] border border-[#383a3e] rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-[#7b68ee] w-32 sm:w-40 transition"
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

          {/* Hide Completed Checkbox */}
          <label className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#141517] hover:bg-[#1c1d20] border border-[#383a3e] hover:border-[#4f5157] rounded-lg text-xs text-gray-300 hover:text-white cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-purple-600 bg-[#24262b] border-[#383a3e] focus:ring-purple-500 cursor-pointer accent-purple-600"
            />
            <span className="font-medium whitespace-nowrap">ซ่อนงานเสร็จแล้ว</span>
          </label>

          {/* Hide Routine Checkbox */}
          <label className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#141517] hover:bg-[#1c1d20] border border-[#383a3e] hover:border-[#4f5157] rounded-lg text-xs text-amber-300 hover:text-amber-200 cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={hideRoutine}
              onChange={(e) => setHideRoutine(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-amber-500 bg-[#24262b] border-[#383a3e] focus:ring-amber-500 cursor-pointer accent-amber-500"
            />
            <span className="font-medium whitespace-nowrap">ซ่อนงาน Routine</span>
          </label>

          {/* Toggle Unscheduled Tasks */}
          {unscheduledTasks.length > 0 && (
            <button
              onClick={() => setShowUnscheduled(!showUnscheduled)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                showUnscheduled 
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' 
                  : 'bg-[#141517] text-gray-400 border-[#383a3e] hover:text-gray-200'
              }`}
            >
              <Clock size={13} />
              <span>รอระบุวัน ({unscheduledTasks.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Timeline Grid Container */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Main Gantt Grid Table */}
        <div className="flex-1 flex flex-col border border-[#333538] rounded-xl bg-[#18191b] overflow-hidden shadow-xs">
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <div style={{ minWidth: `${Math.max(980, daysInMonth * 34)}px` }}>
              {/* Header Days Row */}
              <div className="flex border-b border-[#333538] sticky top-0 bg-[#1e1f21] z-20 shadow-xs">
                {/* Left Task Column Header */}
                <div className="w-64 sm:w-72 p-2.5 font-bold text-gray-300 border-r border-[#333538] bg-[#1e1f21] flex-shrink-0 flex items-center justify-between">
                  <span>งาน / ภาระงาน (Task)</span>
                  <span className="text-[10px] text-gray-500 font-normal">{monthTasks.length} งาน</span>
                </div>

                {/* Days of Month Header Columns */}
                <div className="flex-1 flex">
                  {monthDays.map(day => (
                    <div 
                      key={day.iso}
                      className={`flex-1 min-w-[32px] text-center py-1.5 border-r border-[#2d2f34] flex flex-col items-center justify-center ${
                        day.isToday 
                          ? 'bg-purple-950/50 text-purple-300 font-extrabold border-t-2 border-t-purple-500' 
                          : day.isWeekend 
                          ? 'bg-[#151618]/60 text-gray-500' 
                          : 'text-gray-400'
                      }`}
                    >
                      <span className="text-[9px] font-medium">{day.dayOfWeek}</span>
                      <span className={`text-xs mt-0.5 ${day.isToday ? 'px-1 rounded bg-purple-600 text-white font-black' : ''}`}>
                        {day.dayNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Rows */}
              {monthTasks.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <CalendarIcon size={36} className="text-gray-600 mb-2 opacity-60" />
                  <p className="text-gray-400 font-medium text-sm">ไม่มีงานที่มีกำหนดการในเดือน{THAI_MONTHS[currentMonth]} {currentYear + 543}</p>
                  <p className="text-gray-500 text-xs mt-1">สามารถกดเลื่อนเดือน หรือคลิกดูงานรอระบุวันส่งได้จากแถบด้านบน</p>
                </div>
              ) : (
                <div className="divide-y divide-[#26282c]">
                  {monthTasks.map(task => {
                    const isCompleted = task.status === 'COMPLETED';
                    const sConf = STATUS_CONFIG[task.status] || STATUS_CONFIG['NOT STARTED'];

                    // Calculate Start Day and Due Day relative to this month (1..daysInMonth)
                    let startDayNum = 1;
                    let dueDayNum = daysInMonth;

                    const hasStart = Boolean(task.start_date);
                    const hasDue = Boolean(task.due_date);

                    if (hasStart && hasDue) {
                      const startIso = task.start_date;
                      const dueIso = task.due_date;

                      if (startIso < monthStartIso) {
                        startDayNum = 1;
                      } else {
                        startDayNum = parseInt(startIso.split('-')[2], 10);
                      }

                      if (dueIso > monthEndIso) {
                        dueDayNum = daysInMonth;
                      } else {
                        dueDayNum = parseInt(dueIso.split('-')[2], 10);
                      }
                    } else if (hasDue) {
                      const dueIso = task.due_date;
                      if (dueIso < monthStartIso) {
                        dueDayNum = 1;
                        startDayNum = 1;
                      } else if (dueIso > monthEndIso) {
                        dueDayNum = daysInMonth;
                        startDayNum = daysInMonth;
                      } else {
                        const dayVal = parseInt(dueIso.split('-')[2], 10);
                        dueDayNum = dayVal;
                        startDayNum = dayVal; // 1-day point
                      }
                    } else if (hasStart) {
                      const startIso = task.start_date;
                      if (startIso < monthStartIso) {
                        startDayNum = 1;
                        dueDayNum = 1;
                      } else if (startIso > monthEndIso) {
                        startDayNum = daysInMonth;
                        dueDayNum = daysInMonth;
                      } else {
                        const dayVal = parseInt(startIso.split('-')[2], 10);
                        startDayNum = dayVal;
                        dueDayNum = dayVal;
                      }
                    }

                    // Clamp
                    startDayNum = Math.max(1, Math.min(daysInMonth, startDayNum));
                    dueDayNum = Math.max(startDayNum, Math.min(daysInMonth, dueDayNum));

                    const colIndex = startDayNum - 1;
                    const spanDays = dueDayNum - startDayNum + 1;
                    const leftPct = (colIndex / daysInMonth) * 100;
                    const widthPct = Math.max((spanDays / daysInMonth) * 100, (1 / daysInMonth) * 100);

                    return (
                      <div 
                        key={task.id}
                        onClick={() => onSelectTask && onSelectTask(task)}
                        className="flex items-center hover:bg-[#202226] cursor-pointer group transition h-10 select-none"
                      >
                        {/* Task Title Cell on Left */}
                        <div className="w-64 sm:w-72 px-3 truncate text-gray-200 font-medium border-r border-[#2d2f34] flex items-center justify-between space-x-2 flex-shrink-0">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <span 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: sConf.color }}
                            />
                            <span className={`truncate text-xs ${isCompleted ? 'line-through text-gray-500' : 'text-gray-200 group-hover:text-white font-semibold'}`}>
                              {task.name}
                            </span>
                          </div>
                          {task.due_date && (
                            <span className="text-[10px] font-mono text-gray-500 flex-shrink-0">
                              {task.due_date.slice(5)}
                            </span>
                          )}
                        </div>

                        {/* Gantt Bar Area on Right */}
                        <div className="flex-1 flex relative h-full items-center px-0 overflow-hidden">
                          {/* Day Grid Column Background Lines */}
                          {monthDays.map(day => (
                            <div 
                              key={day.iso}
                              className={`flex-1 min-w-[32px] h-full border-r border-[#24262a] ${
                                day.isToday 
                                  ? 'bg-purple-500/10' 
                                  : day.isWeekend 
                                  ? 'bg-[#151618]/30' 
                                  : ''
                              }`}
                            />
                          ))}

                          {/* Authentic Gantt Bar */}
                          <div 
                            className={`absolute top-1.5 bottom-1.5 rounded px-2 text-[11px] font-semibold text-white shadow truncate flex items-center justify-between transition hover:brightness-110 z-10 ${
                              isCompleted 
                                ? 'bg-emerald-600/90 border border-emerald-400/40' 
                                : task.status === 'IN PROGRESS' 
                                ? 'bg-blue-600/90 border border-blue-400/40' 
                                : 'bg-rose-600/90 border border-rose-400/40'
                            }`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`
                            }}
                            title={`${task.name} (กำหนดส่ง: ${task.due_date || 'ไม่ระบุ'})`}
                          >
                            <span className="truncate mr-1 text-[10px]">{task.name}</span>
                            <span className="text-[9px] font-mono opacity-80 flex-shrink-0 hidden sm:inline">
                              {isCompleted ? '✓' : (task.due_date ? task.due_date.slice(5) : '')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unscheduled Tasks Sidebar (Collapsible) */}
        {showUnscheduled && unscheduledTasks.length > 0 && (
          <div className="w-64 sm:w-72 border border-[#333538] rounded-xl bg-[#18191b] p-3 flex flex-col shadow-lg animate-in slide-in-from-right duration-150 flex-shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-[#333538]">
              <div className="flex items-center space-x-1.5 text-purple-400 font-bold">
                <Clock size={14} />
                <span>รอระบุวันกำหนดส่ง ({unscheduledTasks.length})</span>
              </div>
              <button 
                onClick={() => setShowUnscheduled(false)}
                className="text-gray-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mt-2">
              {unscheduledTasks.map(t => (
                <div 
                  key={t.id}
                  onClick={() => onSelectTask && onSelectTask(t)}
                  className="p-2 bg-[#1e2023] hover:bg-[#25272b] border border-[#333538] rounded-lg cursor-pointer transition group"
                >
                  <h4 className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                    {t.name}
                  </h4>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                    <span className="px-1.5 py-0.2 rounded bg-gray-800 text-gray-400">
                      {t.status}
                    </span>
                    {t.assignee && <span>{t.assignee}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
