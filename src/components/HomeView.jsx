import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Sparkles, 
  Plus, 
  Image as ImageIcon, 
  Download, 
  ArrowRight, 
  CheckSquare, 
  Folder, 
  ChevronRight, 
  TrendingUp, 
  Sun, 
  Moon, 
  Sunrise, 
  Zap, 
  Layers,
  Send,
  Trash2,
  FileText,
  Flag,
  Printer,
  ExternalLink,
  Copy,
  Edit2,
  Check,
  X
} from 'lucide-react';
import ContextMenu from './ContextMenu.jsx';
import logoImg from '../assets/logo.png';
import { isFutureRoutineTask } from '../utils/routineUtils.js';

export default function HomeView({
  allTasks = [],
  spaces = [],
  workspaceName = 'My Workspace',
  userName = 'User',
  onUpdateWorkspaceInfo,
  onSelectTask,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
  onDeleteTask,
  onCopyTask,
  onOpenMoveCopy,
  onOpenPrintSingleTask,
  onQuickAddTask,
  onSelectList,
  onOpenAISidebar,
  onOpenWallpaperModal,
  onOpenBackupModal
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  useEffect(() => {
    setTempName(userName);
  }, [userName]);

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      try {
        localStorage.setItem('status_user_name', trimmed);
      } catch (e) {}
      if (onUpdateWorkspaceInfo) {
        onUpdateWorkspaceInfo({ userName: trimmed });
      }
    }
    setIsEditingName(false);
  };

  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, items: [] });
  // 1. Greeting calculation
  const [greeting, setGreeting] = useState({ text: 'สวัสดี', icon: 'sun' });
  const [todayFormatted, setTodayFormatted] = useState('');

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting({ text: 'สวัสดีตอนเช้า', icon: 'sunrise' });
    } else if (hour >= 12 && hour < 18) {
      setGreeting({ text: 'สวัสดีตอนบ่าย', icon: 'sun' });
    } else {
      setGreeting({ text: 'สวัสดีตอนเย็น', icon: 'moon' });
    }

    const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const dayName = thaiDays[now.getDay()];
    const dateNum = now.getDate();
    const monthName = thaiMonths[now.getMonth()];
    const yearCE = now.getFullYear();
    setTodayFormatted(`${dayName}ที่ ${dateNum} ${monthName} ${yearCE}`);
  }, []);

  // 2. Filter tasks for My Work tabs
  const [activeTab, setActiveTab] = useState('overdue'); // 'overdue' | 'today' | 'upcoming' | 'all'
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const next7DaysDate = new Date(Date.now() + 7 * 86400000);
  const next7DaysStr = next7DaysDate.toISOString().split('T')[0];

  // Active pool for current calculation: exclude future-round routine tasks until their day arrives
  const activePool = allTasks.filter(t => !isFutureRoutineTask(t, todayStr));

  const overdueTasks = activePool.filter(t => t.status !== 'COMPLETED' && t.due_date && t.due_date < todayStr);
  const todayTasks = activePool.filter(t => t.status !== 'COMPLETED' && (t.due_date === todayStr || t.due_date === tomorrowStr));
  const upcomingTasks = activePool.filter(t => t.status !== 'COMPLETED' && t.due_date && t.due_date > tomorrowStr && t.due_date <= next7DaysStr);
  const completedTasks = activePool.filter(t => t.status === 'COMPLETED');
  const allActiveTasks = activePool.filter(t => t.status !== 'COMPLETED');

  // Overall metrics: fair calculation where next-month routines don't block 100% completion
  const totalCount = activePool.length;
  const completedCount = completedTasks.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Which list to show in tab
  let displayedTasks = overdueTasks;
  if (activeTab === 'today') displayedTasks = todayTasks;
  else if (activeTab === 'upcoming') displayedTasks = upcomingTasks;
  else if (activeTab === 'all') displayedTasks = allActiveTasks;

  // 3. Scratchpad State & Persistence
  const [scratchNote, setScratchNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedTime, setNoteSavedTime] = useState(null);
  const [targetListForNote, setTargetListForNote] = useState(spaces[0]?.lists?.[0]?.id || '');
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Load scratchpad from settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.scratchpad_note) {
          setScratchNote(data.scratchpad_note);
        }
      })
      .catch(err => console.error('Error loading scratchpad:', err));
  }, []);

  // Debounced auto-save scratchpad
  useEffect(() => {
    if (scratchNote === '') return;
    setIsSavingNote(true);
    const timer = setTimeout(() => {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scratchpad_note: scratchNote })
      })
        .then(() => {
          setIsSavingNote(false);
          setNoteSavedTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
        })
        .catch(() => setIsSavingNote(false));
    }, 800);

    return () => clearTimeout(timer);
  }, [scratchNote]);

  // Convert note to task
  const handleConvertNoteToTask = async () => {
    if (!scratchNote.trim()) return;
    const lines = scratchNote.trim().split('\n');
    const title = lines[0].slice(0, 100);
    const description = lines.length > 1 ? lines.slice(1).join('\n') : '';

    await onQuickAddTask({
      name: title,
      list_id: targetListForNote,
      description: description,
      status: 'NOT STARTED',
      priority: 'Normal'
    });

    setShowConvertModal(false);
    setScratchNote('');
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scratchpad_note: '' })
    });
  };

  // Quick Inline Add in My Work
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const handleQuickAddInHome = (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    const defaultList = spaces[0]?.lists?.[0]?.id || '';
    onQuickAddTask({
      name: quickTaskTitle.trim(),
      list_id: defaultList,
      status: 'NOT STARTED',
      priority: 'Normal'
    });
    setQuickTaskTitle('');
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
    <div className="flex-1 overflow-y-auto bg-[#1e1f21] text-[#ececef] p-6 space-y-6 select-none">
      {/* ========================================================= */}
      {/* 1. GREETING & HERO BANNER */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-[#24262b] via-[#222429] to-[#1c1d22] border border-[#333538] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          {/* User Info & Greeting */}
          <div className="flex items-center space-x-4">
            <img 
              src={logoImg} 
              alt="Status+" 
              className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-purple-500/20 ring-1 ring-white/10 flex-shrink-0" 
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center flex-wrap gap-1.5">
                  <span>{greeting.text},</span>
                  {isEditingName ? (
                    <span className="inline-flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        autoFocus
                        className="px-2.5 py-0.5 bg-[#18191c] border border-purple-500 rounded-lg text-purple-300 text-lg font-bold outline-none shadow-inner"
                        placeholder="พิมพ์ชื่อของคุณ..."
                      />
                      <button
                        onClick={handleSaveName}
                        className="p-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/40 rounded-md transition cursor-pointer"
                        title="บันทึกชื่อ"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1 bg-gray-700/30 hover:bg-gray-700/50 text-gray-400 hover:text-white rounded-md transition cursor-pointer"
                        title="ยกเลิก"
                      >
                        <X size={16} />
                      </button>
                    </span>
                  ) : (
                    <span
                      onClick={() => {
                        setTempName(userName);
                        setIsEditingName(true);
                      }}
                      className="group inline-flex items-center space-x-1.5 text-purple-400 hover:text-purple-300 cursor-pointer transition border-b border-dashed border-purple-500/40 hover:border-purple-300"
                      title="คลิกเพื่อแก้ไขชื่อของคุณ"
                    >
                      <span>{userName}</span>
                      <Edit2 size={13} className="text-purple-400/60 group-hover:text-purple-300 transition" />
                    </span>
                  )}
                </h1>
                {greeting.icon === 'sunrise' && <Sunrise size={20} className="text-amber-400" />}
                {greeting.icon === 'sun' && <Sun size={20} className="text-amber-400" />}
                {greeting.icon === 'moon' && <Moon size={20} className="text-indigo-400" />}
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center space-x-2">
                <Calendar size={13} className="text-gray-400" />
                <span>{todayFormatted}</span>
                <span>•</span>
                <span className="text-purple-400 font-semibold">Status+</span>
                <span>•</span>
                <span>{workspaceName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stat Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#333538]/70">
          <div className="bg-[#18191c]/80 border border-[#2e3034] rounded-xl p-3 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              <CheckSquare size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{totalCount}</div>
              <div className="text-[11px] text-gray-400">งานทั้งหมดในระบบ</div>
            </div>
          </div>

          <div className="bg-[#18191c]/80 border border-[#2e3034] rounded-xl p-3 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">{overdueTasks.length}</div>
              <div className="text-[11px] text-gray-400">งานเกินกำหนด (Overdue)</div>
            </div>
          </div>

          <div className="bg-[#18191c]/80 border border-[#2e3034] rounded-xl p-3 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">{todayTasks.length}</div>
              <div className="text-[11px] text-gray-400">ครบกำหนดวันนี้/เร็วๆ นี้</div>
            </div>
          </div>

          <div className="bg-[#18191c]/80 border border-[#2e3034] rounded-xl p-3 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 font-bold">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">{completionPercent}%</div>
              <div className="text-[11px] text-gray-400">เสร็จแล้ว ({completedCount}/{totalCount})</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN 2-COLUMN DASHBOARD */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: MY WORK WIDGET (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#24262b] border border-[#333538] rounded-2xl p-5 shadow-lg space-y-4">
            {/* Widget Header & Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#333538]">
              <div className="flex items-center space-x-2 flex-shrink-0 whitespace-nowrap">
                <div className="w-2.5 h-2.5 rounded-full bg-[#7b68ee] flex-shrink-0" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider whitespace-nowrap">
                  My Work
                </h2>
                <span className="text-xs text-gray-400 font-normal whitespace-nowrap">
                  ({allActiveTasks.length} งานที่ยังไม่เสร็จ)
                </span>
              </div>

              {/* Sub-Tabs */}
              <div className="flex items-center bg-[#18191b] p-1 rounded-lg border border-[#333538] text-xs">
                <button
                  onClick={() => setActiveTab('overdue')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                    activeTab === 'overdue' 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <AlertTriangle size={12} className="text-red-400" />
                  <span>เกินกำหนด</span>
                  <span className="ml-1 px-1 rounded-full bg-red-500/30 text-[10px] text-red-200">
                    {overdueTasks.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('today')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                    activeTab === 'today' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Clock size={12} className="text-amber-400" />
                  <span>วันนี้/เร็วๆ นี้</span>
                  <span className="ml-1 px-1 rounded-full bg-amber-500/30 text-[10px] text-amber-200">
                    {todayTasks.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                    activeTab === 'upcoming' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Calendar size={12} className="text-purple-400" />
                  <span>ถัดไป 7 วัน</span>
                  <span className="ml-1 px-1 rounded-full bg-purple-500/30 text-[10px] text-purple-200">
                    {upcomingTasks.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1 transition cursor-pointer ${
                    activeTab === 'all' 
                      ? 'bg-[#333538] text-white' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>ทั้งหมด</span>
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {displayedTasks.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-green-500/40" />
                  <p className="font-medium text-gray-300">ไม่มีงานคั่งค้างในหมวดนี้</p>
                  <p className="text-[11px]">คุณจัดการงานในหมวดนี้เสร็จเรียบร้อยหมดแล้ว ยอดเยี่ยมมาก!</p>
                </div>
              ) : (
                displayedTasks.map(task => {
                  const isDone = task.status === 'COMPLETED';
                  const isOverdue = task.due_date && task.due_date < todayStr && !isDone;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      onContextMenu={(e) => handleTaskContextMenu(e, task)}
                      className="group flex items-center justify-between p-2.5 bg-[#1a1b1e] hover:bg-[#202226] border border-[#2e3034] hover:border-[#3d4046] rounded-xl transition cursor-pointer"
                      title="คลิกขวาเพื่อเปิดเมนูลัด"
                    >
                      {/* Left: Checkbox + Name */}
                      <div className="flex items-center space-x-3 truncate flex-1 mr-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateTaskStatus(task.id, isDone ? 'NOT STARTED' : 'COMPLETED');
                          }}
                          className="text-gray-400 hover:text-green-400 transition cursor-pointer flex-shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 size={17} className="text-green-500" />
                          ) : (
                            <Circle size={17} className="text-gray-500 hover:text-green-400" />
                          )}
                        </button>

                        <div className="truncate">
                          <div className={`text-xs font-medium truncate ${isDone ? 'line-through text-gray-500' : 'text-gray-200 group-hover:text-white'}`}>
                            {task.name}
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] text-gray-400 mt-0.5">
                            {task.space_name && task.list_name && (
                              <span className="flex items-center space-x-1 text-gray-400">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.list_color || '#7b68ee' }} />
                                <span>{task.space_name} / {task.list_name}</span>
                              </span>
                            )}
                            {task.subtasks && task.subtasks.length > 0 && (
                              <span>• {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} ซับทาสก์</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Badges (Priority, Date, Status) */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* Priority Badge */}
                        {task.priority && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            task.priority === 'Urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            task.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            task.priority === 'Normal' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            'bg-gray-700/30 text-gray-400'
                          }`}>
                            {task.priority}
                          </span>
                        )}

                        {/* Due Date */}
                        {task.due_date && (
                          <span className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isOverdue ? 'bg-red-500/20 text-red-300 font-semibold' :
                            task.due_date === todayStr ? 'bg-amber-500/20 text-amber-300 font-semibold' :
                            'bg-[#282a2e] text-gray-300'
                          }`}>
                            <Clock size={10} />
                            <span>{task.due_date}</span>
                          </span>
                        )}

                        {/* Status Bubble */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                          task.status === 'IN PROGRESS' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Inline Quick Add Input */}
            <form onSubmit={handleQuickAddInHome} className="pt-2 border-t border-[#333538] flex items-center space-x-2">
              <input
                type="text"
                placeholder="+ พิมพ์ชื่องานเพื่อเพิ่มด่วนลงในระบบ... (กด Enter เพื่อบันทึก)"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#18191b] border border-[#333538] focus:border-[#7b68ee] rounded-lg text-xs text-white placeholder-gray-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={!quickTaskTitle.trim()}
                className="px-3 py-2 bg-[#7b68ee] hover:bg-[#6a55e0] disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                เพิ่มงาน
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: 3 WIDGETS (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Quick Scratchpad (Auto-save) */}
          <div className="bg-[#24262b] border border-[#333538] rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText size={15} className="text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Quick Scratchpad
                </h3>
              </div>
              <div className="text-[10px] text-gray-400 flex items-center space-x-1">
                {isSavingNote ? (
                  <span className="text-amber-400 animate-pulse">กำลังบันทึก...</span>
                ) : noteSavedTime ? (
                  <span className="text-green-400">✓ บันทึกเมื่อ {noteSavedTime}</span>
                ) : (
                  <span>Auto-save</span>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="จดไอเดีย บันทึกช่วยจำ หรือร่างงานที่นี่... (ระบบจะบันทึกอัตโนมัติ)"
              value={scratchNote}
              onChange={(e) => setScratchNote(e.target.value)}
              className="w-full p-3 bg-[#18191b] border border-[#333538] focus:border-[#7b68ee] rounded-xl text-xs text-gray-200 placeholder-gray-500 outline-none resize-none leading-relaxed transition"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setScratchNote('')}
                disabled={!scratchNote}
                className="flex items-center space-x-1 text-[11px] text-gray-400 hover:text-red-400 disabled:opacity-30 transition cursor-pointer"
              >
                <Trash2 size={12} />
                <span>ล้างโน้ต</span>
              </button>

              <button
                onClick={() => setShowConvertModal(true)}
                disabled={!scratchNote.trim()}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
              >
                <Sparkles size={13} />
                <span>✨ แปลงเป็น Task ใหม่</span>
              </button>
            </div>
          </div>

          {/* 2. Space & Project Progress */}
          <div className="bg-[#24262b] border border-[#333538] rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#333538] pb-2.5">
              <div className="flex items-center space-x-2">
                <Layers size={15} className="text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Space & Project Progress
                </h3>
              </div>
              <span className="text-[11px] text-gray-400">{spaces.length} Spaces</span>
            </div>

            <div className="space-y-2.5">
              {spaces.map(space => {
                return (
                  <div key={space.id} className="space-y-2">
                    {space.lists && space.lists.map(list => {
                      const listTasks = allTasks.filter(t => t.list_id === list.id && !isFutureRoutineTask(t, todayStr));
                      const listDone = listTasks.filter(t => t.status === 'COMPLETED').length;
                      const listTotal = listTasks.length;
                      const pct = listTotal > 0 ? Math.round((listDone / listTotal) * 100) : 0;

                      return (
                        <div
                          key={list.id}
                          onClick={() => onSelectList(list.id)}
                          className="group p-2.5 bg-[#1a1b1e] hover:bg-[#202226] border border-[#2e3034] hover:border-purple-500/40 rounded-xl transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: list.color || '#7b68ee' }} />
                              <span className="font-semibold text-gray-200 group-hover:text-purple-300 transition truncate">
                                {list.name}
                              </span>
                              <span className="text-[10px] text-gray-400">({space.name})</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-[11px] font-semibold">
                              <span className="text-white">{pct}%</span>
                              <ChevronRight size={13} className="text-gray-400 group-hover:text-white transition" />
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-1.5 bg-[#282a2e] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>เสร็จ {listDone} จาก {listTotal} งาน</span>
                            <span>{listTotal - listDone} งานที่เหลือ</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. AI Daily Briefing */}
          <div className="bg-gradient-to-br from-[#201d2d] to-[#1c1d22] border border-purple-500/30 rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                  AI Daily Briefing
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                AI Active
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
              {overdueTasks.length > 0 ? (
                <p className="flex items-start space-x-2 text-red-300">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <span>
                    พบงานเกินกำหนด <strong>{overdueTasks.length} รายการ</strong> ควรให้ความสำคัญกับ <strong>{overdueTasks[0]?.name}</strong> เป็นอันดับแรก
                  </span>
                </p>
              ) : (
                <p className="flex items-start space-x-2 text-green-300">
                  <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>ไม่มีงานคั่งค้างเกินกำหนดเลย คุณบริหารเวลาได้ดีเยี่ยม!</span>
                </p>
              )}

              {todayTasks.length > 0 && (
                <p className="flex items-start space-x-2 text-amber-200">
                  <Clock size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>
                    มีกำหนดส่งงาน <strong>{todayTasks.length} รายการ</strong> ในวันนี้หรือพรุ่งนี้ อย่าลืมตรวจเช็คความเรียบร้อย
                  </span>
                </p>
              )}


            </div>

            <button
              onClick={onOpenAISidebar}
              className="w-full py-2 bg-[#7b68ee]/20 hover:bg-[#7b68ee]/30 border border-[#7b68ee]/40 text-purple-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Sparkles size={13} />
              <span>เปิดแชทคุยวิเคราะห์กับ AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. CONVERT NOTE TO TASK MODAL */}
      {/* ========================================================= */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#24262b] border border-[#383a3e] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-purple-400">
              <Sparkles size={18} />
              <h3 className="text-sm font-bold text-white">แปลงโน้ตเป็น Task ใหม่</h3>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              ระบบจะนำบรรทัดแรกไปตั้งเป็นชื่องาน และข้อความที่เหลือเป็นคำอธิบายงาน (Description)
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">เลือกโปรเจกต์ / List ปลายทาง:</label>
              <select
                value={targetListForNote}
                onChange={(e) => setTargetListForNote(e.target.value)}
                className="w-full px-3 py-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-xs text-white outline-none focus:border-[#7b68ee]"
              >
                {spaces.map(sp => (
                  <optgroup key={sp.id} label={sp.name}>
                    {sp.lists && sp.lists.map(l => (
                      <option key={l.id} value={l.id}>
                        {sp.name} / {l.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="p-3 bg-[#18191b] border border-[#2e3034] rounded-xl text-xs text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {scratchNote}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#333538]">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#333538] transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConvertNoteToTask}
                className="px-4 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
              >
                สร้าง Task ทันที
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
