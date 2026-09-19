import React, { useEffect } from 'react';
import { Printer, X, CheckSquare, Calendar, User, Flag } from 'lucide-react';

export default function PrintReportView({
  type = 'list', // 'list', 'board', 'timeline', 'home', 'task'
  tasks = [],
  singleTask = null,
  listName = 'Tasks',
  spaceName = 'Workspace',
  workspaceName = 'พื้นที่ทำงาน',
  userName = 'ผู้ใช้งาน',
  onClose
}) {
  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS');
  const notStartedTasks = tasks.filter(t => t.status === 'NOT STARTED');
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Real Gantt Chart Timeline Calculations (21-Day Landscape Grid)
  const todayDate = new Date();
  const todayDateStr = todayDate.toISOString().split('T')[0];

  let startGanttDate = new Date(todayDate);
  startGanttDate.setDate(startGanttDate.getDate() - 3);

  const validDueDates = tasks.map(t => t.due_date).filter(Boolean).sort();
  if (validDueDates.length > 0) {
    const earliestDue = new Date(validDueDates[0]);
    if (!isNaN(earliestDue) && earliestDue < startGanttDate) {
      startGanttDate = new Date(earliestDue);
      startGanttDate.setDate(startGanttDate.getDate() - 1);
    }
  }

  const totalGanttCols = 21; // 3 Full Calendar Weeks
  const ganttDateList = [];
  for (let i = 0; i < totalGanttCols; i++) {
    const d = new Date(startGanttDate);
    d.setDate(startGanttDate.getDate() + i);
    ganttDateList.push(d);
  }

  const thaiDayInitials = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  // Monthly Calendar Calculations (for type === 'calendar')
  const calDate = todayDate;
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

  const THAI_MONTHS_CAL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  const printCalendarCells = [];
  // Prev month leading
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = calMonth === 0 ? 12 : calMonth;
    const prevY = calMonth === 0 ? calYear - 1 : calYear;
    const iso = `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    printCalendarCells.push({ day, iso, isCurrentMonth: false, isToday: iso === todayDateStr });
  }
  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    printCalendarCells.push({ day, iso, isCurrentMonth: true, isToday: iso === todayDateStr });
  }
  // Next month trailing to complete full weeks
  const remainingCells = (7 - (printCalendarCells.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const nextM = calMonth === 11 ? 1 : calMonth + 2;
    const nextY = calMonth === 11 ? calYear + 1 : calYear;
    const iso = `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    printCalendarCells.push({ day, iso, isCurrentMonth: false, isToday: iso === todayDateStr });
  }

  // Month stats for calendar
  const calTasksInMonth = tasks.filter(t => t.due_date && t.due_date.startsWith(monthPrefix));
  const calCompletedInMonth = calTasksInMonth.filter(t => t.status === 'COMPLETED').length;
  const calOverdueInMonth = calTasksInMonth.filter(t => t.status !== 'COMPLETED' && t.due_date < todayDateStr).length;
  const unscheduledTasksInList = tasks.filter(t => !t.due_date);

  return (
    <div className="fixed inset-0 bg-white text-black z-50 overflow-y-auto print:p-0 print:m-0">
      {/* Print Page Orientation & Color Adjustment Styles */}
      <style>{`
        @media print {
          @page {
            size: ${type === 'timeline' || type === 'calendar' ? 'landscape' : 'portrait'};
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-landscape-sheet {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* On-screen control bar (Hidden during actual print) */}
      <div className="sticky top-0 bg-[#1e1f21] text-white p-3 flex items-center justify-between border-b border-[#333538] shadow-md no-print text-xs">
        <div className="flex items-center space-x-2 font-bold">
          <Printer size={16} className="text-blue-400" />
          <span>
            {type === 'list' && 'พรีวิวเอกสารตารางรายการงาน (Print List View)'}
            {type === 'board' && 'พรีวิวเอกสารกระดานงาน (Print Kanban Board)'}
            {type === 'timeline' && 'พรีวิวเอกสารผังกำหนดการ Gantt Chart แนวนอน (Print Gantt Chart Landscape)'}
            {type === 'calendar' && 'พรีวิวเอกสารปฏิทินงานประจำเดือน แนวนอน (Print Monthly Calendar Landscape)'}
            {type === 'home' && 'พรีวิวเอกสารสรุปภาพรวมพื้นที่ทำงาน (Print Executive Summary)'}
            {type === 'task' && 'พรีวิวเอกสารคำสั่งงาน (Print Task Sheet)'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded shadow transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>สั่งพิมพ์ / บันทึก PDF (Print Now)</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition flex items-center space-x-1 cursor-pointer"
          >
            <X size={14} />
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className={`mx-auto p-8 font-['Noto_Sans_Thai',_sans-serif] print-page space-y-6 ${
        type === 'timeline' ? 'max-w-[1360px] print-landscape-sheet' : 'max-w-4xl'
      }`}>
        {/* ============================================================ */}
        {/* VIEW 1: FULL PROJECT LIST REPORT */}
        {/* ============================================================ */}
        {type === 'list' && (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="border-b-2 border-gray-800 pb-4 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  รายงานตารางงานโครงการ (Project Task List Report)
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  พื้นที่งาน: <span className="font-semibold text-gray-800">{spaceName}</span> &gt; ลิสต์งาน: <span className="font-semibold text-gray-800">{listName}</span>
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>วันที่พิมพ์: <span className="font-medium text-gray-800">{currentDate}</span></p>
                <p>จำนวนงานทั้งหมด: <span className="font-bold text-gray-800">{tasks.length} รายการ</span></p>
              </div>
            </div>

            {/* Statistics Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-gray-300 rounded p-3 bg-gray-50">
                <span className="text-xs text-gray-600 block">งานที่เสร็จสมบูรณ์ (COMPLETED)</span>
                <span className="text-xl font-bold text-emerald-600">
                  {completedTasks.length} รายการ ({completionRate}%)
                </span>
              </div>
              <div className="border border-gray-300 rounded p-3 bg-gray-50">
                <span className="text-xs text-gray-600 block">งานที่กำลังดำเนินการ (IN PROGRESS)</span>
                <span className="text-xl font-bold text-blue-600">
                  {inProgressTasks.length} รายการ
                </span>
              </div>
              <div className="border border-gray-300 rounded p-3 bg-gray-50">
                <span className="text-xs text-gray-600 block">งานที่ยังไม่เริ่ม (NOT STARTED)</span>
                <span className="text-xl font-bold text-red-600">
                  {notStartedTasks.length} รายการ
                </span>
              </div>
            </div>

            {/* Tasks Table */}
            <table className="w-full text-left text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                  <th className="p-2 border-r border-gray-300 w-10 text-center">ลำดับ</th>
                  <th className="p-2 border-r border-gray-300">ชื่องาน (Task Name)</th>
                  <th className="p-2 border-r border-gray-300 w-28 text-center">สถานะ</th>
                  <th className="p-2 border-r border-gray-300 w-20 text-center">ความสำคัญ</th>
                  <th className="p-2 border-r border-gray-300 w-24 text-center">กำหนดส่ง</th>
                  <th className="p-2 border-r border-gray-300 w-24 text-center">ผู้รับผิดชอบ</th>
                  <th className="p-2 w-20 text-center">ซับทาสก์</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-400 italic">
                      ไม่มีรายการงานในลิสต์นี้
                    </td>
                  </tr>
                ) : (
                  tasks.map((t, idx) => {
                    const completedSubs = (t.subtasks || []).filter(s => s.completed).length;
                    const totalSubs = (t.subtasks || []).length;

                    return (
                      <tr key={t.id} className="border-b border-gray-200 even:bg-gray-50/60">
                        <td className="p-2 border-r border-gray-300 text-center font-medium text-gray-600">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-gray-300 font-semibold text-gray-900">
                          {t.name}
                          {t.description && (
                            <span className="block text-[11px] text-gray-500 font-normal pt-0.5 truncate max-w-sm">
                              {t.description}
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-gray-300 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            t.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-2 border-r border-gray-300 text-center font-medium text-gray-700">
                          {t.priority}
                        </td>
                        <td className="p-2 border-r border-gray-300 text-center text-gray-700">
                          {t.due_date || '-'}
                        </td>
                        <td className="p-2 border-r border-gray-300 text-center font-semibold text-gray-800">
                          {t.assignee || '-'}
                        </td>
                        <td className="p-2 text-center text-gray-600 font-medium">
                          {totalSubs > 0 ? `${completedSubs}/${totalSubs}` : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: KANBAN BOARD REPORT */}
        {/* ============================================================ */}
        {type === 'board' && (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="border-b-2 border-gray-800 pb-4 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  รายงานกระดานงาน Kanban (Board View Report)
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  พื้นที่งาน: <span className="font-semibold text-gray-800">{spaceName}</span> &gt; ลิสต์งาน: <span className="font-semibold text-gray-800">{listName}</span>
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>วันที่พิมพ์: <span className="font-medium text-gray-800">{currentDate}</span></p>
                <p>รวมงานทั้งหมด: <span className="font-bold text-gray-800">{tasks.length} รายการ</span></p>
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-3 gap-4">
              {/* Not Started Column */}
              <div className="border border-red-200 rounded-lg bg-red-50/30 overflow-hidden">
                <div className="bg-red-100 border-b border-red-200 p-2.5 font-bold text-red-900 text-xs flex justify-between items-center">
                  <span>ยังไม่เริ่ม (NOT STARTED)</span>
                  <span className="bg-red-200 text-red-900 px-1.5 py-0.5 rounded text-[10px]">{notStartedTasks.length}</span>
                </div>
                <div className="p-2.5 space-y-2">
                  {notStartedTasks.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">ไม่มีงาน</p>
                  ) : (
                    notStartedTasks.map(t => (
                      <div key={t.id} className="bg-white border border-gray-200 rounded p-2 text-xs shadow-sm space-y-1">
                        <p className="font-bold text-gray-800">{t.name}</p>
                        {t.description && <p className="text-[11px] text-gray-500 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-500">
                          <span className="font-medium text-red-700">{t.priority}</span>
                          <span>{t.assignee || 'ไม่ระบุผู้รับผิดชอบ'}</span>
                        </div>
                        {t.due_date && <p className="text-[10px] text-gray-400">กำหนดส่ง: {t.due_date}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* In Progress Column */}
              <div className="border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
                <div className="bg-blue-100 border-b border-blue-200 p-2.5 font-bold text-blue-900 text-xs flex justify-between items-center">
                  <span>กำลังทำ (IN PROGRESS)</span>
                  <span className="bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded text-[10px]">{inProgressTasks.length}</span>
                </div>
                <div className="p-2.5 space-y-2">
                  {inProgressTasks.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">ไม่มีงาน</p>
                  ) : (
                    inProgressTasks.map(t => (
                      <div key={t.id} className="bg-white border border-gray-200 rounded p-2 text-xs shadow-sm space-y-1">
                        <p className="font-bold text-gray-800">{t.name}</p>
                        {t.description && <p className="text-[11px] text-gray-500 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-500">
                          <span className="font-medium text-blue-700">{t.priority}</span>
                          <span>{t.assignee || 'ไม่ระบุผู้รับผิดชอบ'}</span>
                        </div>
                        {t.due_date && <p className="text-[10px] text-gray-400">กำหนดส่ง: {t.due_date}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Completed Column */}
              <div className="border border-emerald-200 rounded-lg bg-emerald-50/30 overflow-hidden">
                <div className="bg-emerald-100 border-b border-emerald-200 p-2.5 font-bold text-emerald-900 text-xs flex justify-between items-center">
                  <span>เสร็จสิ้น (COMPLETED)</span>
                  <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded text-[10px]">{completedTasks.length}</span>
                </div>
                <div className="p-2.5 space-y-2">
                  {completedTasks.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">ไม่มีงาน</p>
                  ) : (
                    completedTasks.map(t => (
                      <div key={t.id} className="bg-white border border-gray-200 rounded p-2 text-xs shadow-sm space-y-1 opacity-90">
                        <p className="font-bold text-gray-800 line-through">{t.name}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-500">
                          <span className="font-medium text-emerald-700">เสร็จแล้ว</span>
                          <span>{t.assignee || '-'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: AUTHENTIC GANTT CHART TIMELINE REPORT (LANDSCAPE) */}
        {/* ============================================================ */}
        {type === 'timeline' && (
          <div className="space-y-4">
            {/* Report Header */}
            <div className="border-b-2 border-gray-800 pb-3 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center space-x-2">
                  <span>แผนผังกำหนดการปฏิบัติงาน Gantt Chart (Gantt Timeline Report)</span>
                </h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  พื้นที่งาน: <span className="font-semibold text-gray-800">{spaceName}</span> &gt; ลิสต์งาน: <span className="font-semibold text-gray-800">{listName}</span>
                  <span className="mx-2 text-gray-400">|</span>
                  ช่วงปฏิทิน: <span className="font-medium text-gray-800">
                    {ganttDateList[0].toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - {ganttDateList[totalGanttCols - 1].toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>วันที่พิมพ์: <span className="font-medium text-gray-800">{currentDate}</span></p>
                <p>จำนวนงานทั้งหมด: <span className="font-bold text-gray-800">{tasks.length} รายการ</span></p>
              </div>
            </div>

            {/* Legend Bar */}
            <div className="flex items-center justify-between bg-gray-50 border border-gray-300 rounded p-2 text-xs">
              <div className="flex items-center space-x-4">
                <span className="font-bold text-gray-700">สัญลักษณ์สีบาร์งาน (Legend):</span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-600 inline-block shadow-xs"></span>
                  <span className="text-gray-700">เสร็จสมบูรณ์ ({completedTasks.length})</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-blue-600 inline-block shadow-xs"></span>
                  <span className="text-gray-700">กำลังดำเนินการ ({inProgressTasks.length})</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500 inline-block shadow-xs"></span>
                  <span className="text-gray-700">ยังไม่เริ่ม ({notStartedTasks.length})</span>
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[11px] text-gray-500">
                <span className="flex items-center space-x-1">
                  <span className="w-3 h-3 border-2 border-purple-600 bg-purple-100 inline-block rounded-xs"></span>
                  <span>วันนี้ (Today)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-gray-200 inline-block rounded-xs"></span>
                  <span>วันหยุดเสาร์-อาทิตย์</span>
                </span>
              </div>
            </div>

            {/* Real Gantt Chart Grid Table */}
            <div className="border border-gray-300 rounded overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  {/* Top Header: Left Task Info + Right Calendar Days */}
                  <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold">
                    <th className="p-2 border-r border-gray-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-gray-300 w-48 truncate">ชื่องาน (Task Name)</th>
                    <th className="p-2 border-r border-gray-300 w-20 text-center">สถานะ</th>
                    <th className="p-2 border-r border-gray-300 w-16 text-center">ความสำคัญ</th>
                    <th className="p-2 border-r border-gray-300 w-20 text-center">ผู้รับผิดชอบ</th>
                    <th className="p-2 border-r border-gray-300 w-20 text-center">กำหนดส่ง</th>
                    
                    {/* 21 Calendar Date Columns */}
                    {ganttDateList.map(d => {
                      const dIso = d.toISOString().split('T')[0];
                      const isToday = dIso === todayDateStr;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                      return (
                        <th 
                          key={dIso} 
                          className={`p-1 border-r border-gray-300 text-center text-[10px] select-none ${
                            isToday ? 'bg-purple-600 text-white font-black' :
                            isWeekend ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="leading-tight">{thaiDayInitials[d.getDay()]}</div>
                          <div className="font-bold text-xs">{d.getDate()}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6 + totalGanttCols} className="p-8 text-center text-gray-400 italic">
                        ไม่มีรายการงานในโครงการนี้
                      </td>
                    </tr>
                  ) : (
                    tasks.map((t, idx) => {
                      const dueIso = t.due_date ? t.due_date.split('T')[0] : null;
                      let dueColIdx = dueIso ? ganttDateList.findIndex(d => d.toISOString().split('T')[0] === dueIso) : -1;
                      
                      let startColIdx = -1;
                      if (t.created_at) {
                        const createdIso = t.created_at.split('T')[0];
                        startColIdx = ganttDateList.findIndex(d => d.toISOString().split('T')[0] === createdIso);
                      }
                      if (startColIdx === -1 && dueColIdx !== -1) {
                        startColIdx = Math.max(0, dueColIdx - 2); // default 3-day duration
                      }

                      const isCompleted = t.status === 'COMPLETED';
                      const isInProgress = t.status === 'IN PROGRESS';

                      return (
                        <tr key={t.id} className="border-b border-gray-200 even:bg-gray-50/40 no-break h-10">
                          {/* 1. Index */}
                          <td className="p-2 border-r border-gray-300 text-center font-medium text-gray-500 text-[11px]">
                            {idx + 1}
                          </td>

                          {/* 2. Task Name */}
                          <td className="p-2 border-r border-gray-300 font-bold text-gray-900 truncate" title={t.name}>
                            {t.name}
                          </td>

                          {/* 3. Status Badge */}
                          <td className="p-1 border-r border-gray-300 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold block truncate ${
                              isCompleted ? 'bg-emerald-100 text-emerald-800' :
                              isInProgress ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {t.status}
                            </span>
                          </td>

                          {/* 4. Priority */}
                          <td className="p-1 border-r border-gray-300 text-center text-[10px] font-medium text-gray-700">
                            {t.priority}
                          </td>

                          {/* 5. Assignee */}
                          <td className="p-1 border-r border-gray-300 text-center text-[10px] text-gray-700 truncate" title={t.assignee || ''}>
                            {t.assignee || '-'}
                          </td>

                          {/* 6. Due Date */}
                          <td className="p-1 border-r border-gray-300 text-center text-[10px] font-mono text-gray-700">
                            {t.due_date || '-'}
                          </td>

                          {/* 7. Right 21-Day Calendar Grid with Overlaid Gantt Bar */}
                          <td colSpan={totalGanttCols} className="relative p-0 h-10 border-r border-gray-300">
                            {/* Background Calendar Grid Columns */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {ganttDateList.map((d, colIndex) => {
                                const dIso = d.toISOString().split('T')[0];
                                const isToday = dIso === todayDateStr;
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                                return (
                                  <div 
                                    key={colIndex}
                                    className={`flex-1 h-full border-r border-gray-200/70 ${
                                      isToday ? 'bg-purple-100/40 border-l-2 border-r-2 border-purple-400' :
                                      isWeekend ? 'bg-gray-100/60' : ''
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            {/* Overlaid Authentic Gantt Bar */}
                            {dueColIdx >= 0 ? (
                              <div
                                style={{
                                  left: `${(startColIdx / totalGanttCols) * 100}%`,
                                  width: `${Math.max(4.5, ((dueColIdx - startColIdx + 1) / totalGanttCols) * 100)}%`
                                }}
                                className={`absolute top-2 bottom-2 rounded px-2 flex items-center justify-between text-[10px] font-bold text-white shadow-xs z-10 truncate ${
                                  isCompleted ? 'bg-emerald-600' :
                                  isInProgress ? 'bg-blue-600' : 'bg-rose-500'
                                }`}
                                title={`${t.name} (กำหนดส่ง: ${t.due_date})`}
                              >
                                <span className="truncate mr-1">{t.name}</span>
                                <span className="text-[9px] font-mono opacity-90 flex-shrink-0">
                                  {isCompleted ? '✓ เสร็จ' : (t.due_date ? t.due_date.slice(5) : '')}
                                </span>
                              </div>
                            ) : dueIso ? (
                              dueIso < ganttDateList[0].toISOString().split('T')[0] ? (
                                <div className="absolute left-1 top-2 px-1.5 py-0.5 bg-red-100 border border-red-300 text-red-700 rounded text-[9px] font-medium z-10">
                                  ◄ เลยกำหนด ({dueIso})
                                </div>
                              ) : (
                                <div className="absolute right-1 top-2 px-1.5 py-0.5 bg-blue-100 border border-blue-300 text-blue-700 rounded text-[9px] font-medium z-10">
                                  กำหนดส่ง {dueIso} ►
                                </div>
                              )
                            ) : (
                              <div className="absolute left-1/3 top-2 px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-400 rounded text-[9px] italic z-10">
                                ไม่ระบุวันส่ง
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW: MONTHLY CALENDAR REPORT (LANDSCAPE) */}
        {/* ============================================================ */}
        {type === 'calendar' && (
          <div className="space-y-4 print-landscape-sheet">
            {/* Header */}
            <div className="border-b-2 border-gray-800 pb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[11px] font-bold">
                    ปฏิทินงานประจำเดือน (Monthly Task Calendar)
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {spaceName} / {listName}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
                  {THAI_MONTHS_CAL[calMonth]} {calYear + 543} ({calYear})
                </h1>
                <p className="text-xs text-gray-600">
                  เวิร์กสเปซ: <span className="font-semibold text-gray-800">{workspaceName}</span> | ผู้จัดทำ: <span className="font-semibold text-gray-800">{userName}</span>
                </p>
              </div>

              <div className="text-right text-xs text-gray-500 space-y-0.5">
                <p>วันที่พิมพ์: <span className="font-medium text-gray-800">{currentDate}</span></p>
                <p>งานในเดือนนี้: <span className="font-bold text-gray-800">{calTasksInMonth.length} งาน</span></p>
              </div>
            </div>

            {/* Monthly KPI Stats Bar */}
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div className="border border-gray-300 rounded p-2 bg-gray-50 text-center">
                <span className="text-gray-500 block text-[10px]">งานในเดือนนี้ทั้งหมด</span>
                <span className="text-lg font-black text-gray-900">{calTasksInMonth.length}</span>
              </div>
              <div className="border border-emerald-300 rounded p-2 bg-emerald-50 text-center">
                <span className="text-emerald-700 block text-[10px]">เสร็จสมบูรณ์แล้ว</span>
                <span className="text-lg font-black text-emerald-700">
                  {calCompletedInMonth}
                  <span className="text-xs font-normal ml-1">
                    ({calTasksInMonth.length > 0 ? Math.round((calCompletedInMonth / calTasksInMonth.length) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="border border-blue-300 rounded p-2 bg-blue-50 text-center">
                <span className="text-blue-700 block text-[10px]">กำลังดำเนินการ</span>
                <span className="text-lg font-black text-blue-700">
                  {calTasksInMonth.filter(t => t.status === 'IN PROGRESS').length}
                </span>
              </div>
              <div className="border border-rose-300 rounded p-2 bg-rose-50 text-center">
                <span className="text-rose-700 block text-[10px]">ค้างส่ง (Overdue)</span>
                <span className="text-lg font-black text-rose-700">{calOverdueInMonth}</span>
              </div>
              <div className="border border-purple-300 rounded p-2 bg-purple-50 text-center">
                <span className="text-purple-700 block text-[10px]">งานรอระบุวันส่ง</span>
                <span className="text-lg font-black text-purple-700">{unscheduledTasksInList.length}</span>
              </div>
            </div>

            {/* 7-Column Calendar Grid Table */}
            <table className="w-full border-collapse border border-gray-400 table-fixed text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-400">
                  {['อาทิตย์ (Sun)', 'จันทร์ (Mon)', 'อังคาร (Tue)', 'พุธ (Wed)', 'พฤหัสบดี (Thu)', 'ศุกร์ (Fri)', 'เสาร์ (Sat)'].map((dayTitle, di) => (
                    <th key={di} className={`p-1.5 border-r border-gray-400 text-center font-bold text-[11px] ${di === 0 || di === 6 ? 'text-red-700 bg-red-50/50' : 'text-gray-800'}`}>
                      {dayTitle}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(printCalendarCells.length / 7) }).map((_, weekIdx) => {
                  const weekCells = printCalendarCells.slice(weekIdx * 7, (weekIdx + 1) * 7);
                  return (
                    <tr key={weekIdx} className="border-b border-gray-400 align-top">
                      {weekCells.map((cell, cIdx) => {
                        const cellTasks = tasks.filter(t => t.due_date === cell.iso);
                        const isWeekend = cIdx === 0 || cIdx === 6;

                        return (
                          <td 
                            key={cIdx} 
                            className={`p-1.5 border-r border-gray-400 min-h-[90px] h-24 align-top ${
                              !cell.isCurrentMonth ? 'bg-gray-100/70 text-gray-400' :
                              cell.isToday ? 'bg-purple-50/60' :
                              isWeekend ? 'bg-amber-50/20' : 'bg-white'
                            }`}
                          >
                            {/* Date Number */}
                            <div className="flex items-center justify-between mb-1">
                              <span className={`inline-block text-[11px] font-bold px-1.5 py-0.2 rounded ${
                                cell.isToday 
                                  ? 'bg-purple-600 text-white font-extrabold' 
                                  : !cell.isCurrentMonth 
                                  ? 'text-gray-400' 
                                  : isWeekend ? 'text-rose-600' : 'text-gray-800'
                              }`}>
                                {cell.day}
                              </span>
                              {cellTasks.length > 0 && (
                                <span className="text-[9px] font-semibold text-gray-500">
                                  {cellTasks.length} งาน
                                </span>
                              )}
                            </div>

                            {/* Tasks scheduled on this day */}
                            <div className="space-y-1 overflow-hidden">
                              {cellTasks.map((t) => {
                                const isDone = t.status === 'COMPLETED';
                                const isInProg = t.status === 'IN PROGRESS';
                                return (
                                  <div 
                                    key={t.id}
                                    className={`p-1 rounded border text-[10px] leading-tight ${
                                      isDone ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                                      isInProg ? 'bg-blue-50 border-blue-300 text-blue-900' :
                                      'bg-gray-50 border-gray-300 text-gray-900'
                                    }`}
                                  >
                                    <div className="font-semibold truncate">
                                      {isDone ? '✓ ' : '• '}{t.name}
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] text-gray-500 mt-0.5">
                                      <span className={`px-1 rounded text-[8px] font-bold ${
                                        isDone ? 'bg-emerald-200 text-emerald-800' :
                                        isInProg ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
                                      }`}>
                                        {t.status}
                                      </span>
                                      {t.assignee && (
                                        <span className="truncate max-w-[50px] text-gray-600">
                                          {t.assignee}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Unscheduled Tasks Section if any */}
            {unscheduledTasksInList.length > 0 && (
              <div className="mt-4 pt-2 border-t border-gray-300 no-break">
                <h3 className="font-bold text-xs text-gray-800 mb-1.5 flex items-center justify-between">
                  <span>รายการงานที่ยังไม่ได้ระบุวันกำหนดส่ง (Unscheduled Tasks): {unscheduledTasksInList.length} งาน</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {unscheduledTasksInList.slice(0, 12).map(t => (
                    <div key={t.id} className="p-1.5 bg-gray-50 border border-gray-300 rounded text-[10px] flex items-center justify-between">
                      <span className="font-medium truncate mr-1">• {t.name}</span>
                      <span className="text-[9px] px-1 bg-gray-200 text-gray-700 rounded flex-shrink-0">
                        {t.status}
                      </span>
                    </div>
                  ))}
                  {unscheduledTasksInList.length > 12 && (
                    <div className="p-1.5 text-center text-gray-500 italic text-[10px]">
                      ...และอีก {unscheduledTasksInList.length - 12} งานที่ยังไม่กำหนดวันส่ง
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: WORKSPACE EXECUTIVE SUMMARY REPORT */}
        {/* ============================================================ */}
        {type === 'home' && (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="border-b-2 border-gray-800 pb-4 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  รายงานสรุปภาพรวมพื้นที่ทำงาน (Workspace Executive Summary)
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  เวิร์กสเปซ: <span className="font-semibold text-gray-800">{workspaceName || 'My Workspace'}</span> | ผู้จัดทำ: <span className="font-semibold text-gray-800">{userName || 'Admin'}</span>
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>วันที่พิมพ์: <span className="font-medium text-gray-800">{currentDate}</span></p>
                <p>รวมทั้งระบบ: <span className="font-bold text-gray-800">{tasks.length} งาน</span></p>
              </div>
            </div>

            {/* High Level KPI Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-center">
                <span className="text-xs text-gray-500 block">งานทั้งหมด (Total Tasks)</span>
                <span className="text-2xl font-black text-gray-900">{tasks.length}</span>
              </div>
              <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 text-center">
                <span className="text-xs text-emerald-700 block">อัตราความสำเร็จ (Completed)</span>
                <span className="text-2xl font-black text-emerald-600">{completionRate}%</span>
                <span className="text-[10px] text-emerald-700">({completedTasks.length} งาน)</span>
              </div>
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 text-center">
                <span className="text-xs text-blue-700 block">กำลังดำเนินการ (Active)</span>
                <span className="text-2xl font-black text-blue-600">{inProgressTasks.length}</span>
                <span className="text-[10px] text-blue-700">งาน</span>
              </div>
              <div className="border border-red-200 rounded-lg p-3 bg-red-50 text-center">
                <span className="text-xs text-red-700 block">รอดำเนินการ (Backlog)</span>
                <span className="text-2xl font-black text-red-600">{notStartedTasks.length}</span>
                <span className="text-[10px] text-red-700">งาน</span>
              </div>
            </div>

            {/* Priority Tasks Table */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 flex items-center justify-between">
                <span>รายการงานที่ต้องให้ความสำคัญเร่งด่วน (Urgent & High Priority Tasks)</span>
                <span className="text-xs font-normal text-gray-500">
                  {tasks.filter(t => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'COMPLETED').length} งานคงค้าง
                </span>
              </h3>
              <table className="w-full text-left text-xs border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                    <th className="p-2 border-r border-gray-300 w-10 text-center">ลำดับ</th>
                    <th className="p-2 border-r border-gray-300">ชื่องาน</th>
                    <th className="p-2 border-r border-gray-300 w-24 text-center">ความสำคัญ</th>
                    <th className="p-2 border-r border-gray-300 w-24 text-center">สถานะ</th>
                    <th className="p-2 border-r border-gray-300 w-28 text-center">กำหนดส่ง</th>
                    <th className="p-2 w-28 text-center">ผู้รับผิดชอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.filter(t => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'COMPLETED').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-emerald-600 font-medium italic">
                        ไม่มีงานด่วนหรือความสำคัญสูงที่คั่งค้าง
                      </td>
                    </tr>
                  ) : (
                    tasks
                      .filter(t => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'COMPLETED')
                      .map((t, i) => (
                        <tr key={t.id} className="border-b border-gray-200">
                          <td className="p-2 border-r border-gray-300 text-center">{i + 1}</td>
                          <td className="p-2 border-r border-gray-300 font-semibold text-gray-900">{t.name}</td>
                          <td className="p-2 border-r border-gray-300 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                              {t.priority}
                            </span>
                          </td>
                          <td className="p-2 border-r border-gray-300 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-2 border-r border-gray-300 text-center">{t.due_date || '-'}</td>
                          <td className="p-2 text-center">{t.assignee || '-'}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: SINGLE TASK DETAIL SHEET */}
        {/* ============================================================ */}
        {type === 'task' && singleTask && (
          <div className="space-y-6">
            {/* Sheet Header */}
            <div className="border-b-2 border-gray-800 pb-3 flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">เอกสารคำสั่งและรายละเอียดงาน (Task Sheet)</span>
                <h1 className="text-xl font-black text-gray-900 mt-1">
                  {singleTask.name}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  โครงการ: {listName} | รหัสงาน: {singleTask.id}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded text-xs font-bold ${
                  singleTask.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  singleTask.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {singleTask.status}
                </span>
                <p className="text-[11px] text-gray-500 mt-2">พิมพ์เมื่อ: {currentDate}</p>
              </div>
            </div>

            {/* Task Info Grid */}
            <div className="grid grid-cols-3 gap-4 border border-gray-300 rounded p-3 bg-gray-50 text-xs">
              <div>
                <span className="text-gray-500 block font-medium">ผู้รับผิดชอบ (Assignee)</span>
                <span className="font-bold text-gray-900 text-sm">{singleTask.assignee || 'ยังไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">ระดับความสำคัญ (Priority)</span>
                <span className="font-bold text-gray-900 text-sm">{singleTask.priority}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">วันกำหนดส่ง (Due Date)</span>
                <span className="font-bold text-gray-900 text-sm">{singleTask.due_date || 'ไม่ระบุ'}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-gray-800 border-b border-gray-300 pb-1">
                รายละเอียดและวัตถุประสงค์ (Description)
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap p-3 bg-gray-50 border border-gray-200 rounded">
                {singleTask.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </p>
            </div>

            {/* Subtasks Checklist */}
            {singleTask.subtasks && singleTask.subtasks.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-gray-800 border-b border-gray-300 pb-1">
                  ขั้นตอนย่อยที่ต้องดำเนินการ (Subtasks Checklist)
                </h3>
                <div className="space-y-1.5">
                  {singleTask.subtasks.map((st, i) => (
                    <div key={st.id || i} className="flex items-center space-x-2 text-xs text-gray-800">
                      <input 
                        type="checkbox" 
                        readOnly 
                        checked={!!st.completed} 
                        className="w-4 h-4 rounded border-gray-400"
                      />
                      <span className={st.completed ? 'line-through text-gray-500' : 'font-medium'}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments Images */}
            {singleTask.attachments && singleTask.attachments.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="font-bold text-sm text-gray-800 border-b border-gray-300 pb-1">
                  รูปภาพประกอบงาน (Attached Images)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {singleTask.attachments.map(att => (
                    <div key={att.id} className="border border-gray-300 rounded p-1">
                      <img 
                        src={att.url} 
                        alt={att.original_name} 
                        className="w-full h-48 object-contain rounded" 
                      />
                      <span className="text-[10px] text-gray-500 block text-center pt-1 truncate">
                        {att.original_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
