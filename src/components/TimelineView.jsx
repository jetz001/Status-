import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function TimelineView({ tasks, onSelectTask }) {
  // Setup 14-day window centered around today
  const [baseDate, setBaseDate] = useState(new Date());

  const days = [];
  const startDay = new Date(baseDate);
  startDay.setDate(startDay.getDate() - 3);

  for (let i = 0; i < 18; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    days.push(d);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const shiftDays = (amount) => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + amount);
    setBaseDate(next);
  };

  const getStatusColor = (status) => {
    if (status === 'COMPLETED') return '#26b26d';
    if (status === 'IN PROGRESS') return '#1e88e5';
    return '#e2483d';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1f21] p-4 text-xs select-none">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-[#333538]">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-white text-sm">Gantt & Timeline</span>
          <span className="text-gray-400 text-xs">
            {days[0].toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => shiftDays(-7)}
            className="p-1 hover:bg-[#2a2b2d] rounded text-gray-300 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setBaseDate(new Date())}
            className="px-2.5 py-1 bg-[#2a2b2d] hover:bg-[#383a3e] rounded text-gray-200 text-xs font-medium"
          >
            วันนี้ (Today)
          </button>
          <button 
            onClick={() => shiftDays(7)}
            className="p-1 hover:bg-[#2a2b2d] rounded text-gray-300 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-auto mt-2 border border-[#2a2b2d] rounded-md bg-[#18191b]">
        <div className="min-w-[900px]">
          {/* Header Dates */}
          <div className="flex border-b border-[#333538] sticky top-0 bg-[#18191b] z-10">
            <div className="w-64 p-2.5 font-bold text-gray-400 border-r border-[#333538]">
              งาน / กิจกรรม (Task)
            </div>
            <div className="flex-1 flex">
              {days.map(d => {
                const dateStr = d.toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                return (
                  <div 
                    key={dateStr}
                    className={`flex-1 text-center py-2 border-r border-[#27292c] ${
                      isToday ? 'bg-purple-950/40 text-purple-300 font-bold border-t-2 border-t-purple-500' : 'text-gray-400'
                    }`}
                  >
                    <div className="text-[10px]">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                    <div className="text-xs">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-[#242528]">
            {tasks.map(task => {
              const taskDate = task.due_date || todayStr;
              // Find date offset in our 18-day array
              let dayIndex = days.findIndex(d => d.toISOString().split('T')[0] === taskDate);
              if (dayIndex === -1) dayIndex = 3; // default fallback

              const color = getStatusColor(task.status);

              return (
                <div 
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="flex items-center hover:bg-[#222427] cursor-pointer group transition h-10"
                >
                  {/* Task Name Title on Left */}
                  <div className="w-64 px-3 truncate text-gray-200 font-medium border-r border-[#2d2f33] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="truncate">{task.name}</span>
                  </div>

                  {/* Timeline Bar Area */}
                  <div className="flex-1 flex relative h-full items-center px-1">
                    {/* Today marker vertical guide line */}
                    {days.map((d, i) => {
                      const isToday = d.toISOString().split('T')[0] === todayStr;
                      return (
                        <div 
                          key={i} 
                          className={`flex-1 h-full border-r border-[#202124] ${isToday ? 'bg-purple-500/5' : ''}`} 
                        />
                      );
                    })}

                    {/* The Task Duration Bar */}
                    <div 
                      className="absolute rounded px-2 py-1 text-[11px] font-semibold text-white shadow truncate flex items-center space-x-1 transition hover:brightness-110"
                      style={{
                        left: `${(Math.max(0, dayIndex - 1) / days.length) * 100}%`,
                        width: `${(2 / days.length) * 100}%`,
                        backgroundColor: color
                      }}
                      title={`${task.name} - กำหนดส่ง: ${task.due_date || 'ไม่มี'}`}
                    >
                      <span className="truncate">{task.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
