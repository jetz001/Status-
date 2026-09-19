import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Image as ImageIcon, 
  Printer, 
  SlidersHorizontal, 
  List, 
  Kanban, 
  Calendar,
  Grid2X2,
  CalendarRange, 
  Share2,
  ChevronDown,
  Download,
  Home
} from 'lucide-react';

export default function Header({
  spaceName,
  listName,
  activeListId,
  activeView,
  onSelectView,
  onOpenAISidebar,
  onOpenWallpaperModal,
  onOpenNotificationCenter,
  onOpenPrintReport,
  onOpenCustomFieldModal,
  onOpenBackupDataModal,
  onQuickAddTask,
  notificationCount = 0,
  searchQuery,
  onSearchChange
}) {
  return (
    <header className="bg-[#1e1f21] border-b border-[#333538] px-4 py-2.5 flex flex-col space-y-2 select-none no-print">
      {/* Top row: Breadcrumbs, Search, AI bar, Quick Actions */}
      <div className="flex items-center justify-between">
        {/* Breadcrumb */}
        {activeView === 'home' ? (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-purple-400 font-bold">Status+</span>
            <span className="text-gray-500">/</span>
            <div className="flex items-center space-x-1.5 text-white font-semibold">
              <span className="w-2 h-2 rounded-sm bg-[#7b68ee]"></span>
              <span>Home Dashboard</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-400 font-medium">{spaceName || 'Workspace'}</span>
            <span className="text-gray-500">/</span>
            <div className="flex items-center space-x-1.5 text-white font-semibold">
              <span className="w-2 h-2 rounded-sm bg-[#7b68ee]"></span>
              <span>{listName || 'Tasks'}</span>
            </div>
          </div>
        )}

        {/* Center: Search */}
        <div className="flex items-center space-x-2 flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="ค้นหาชื่องาน รายละเอียด หรือผู้รับผิดชอบ (Ctrl+K)..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-16 py-1.5 bg-[#141517] border border-[#333538] rounded-full text-xs text-white placeholder-gray-500 outline-none focus:border-[#7b68ee] transition"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 bg-[#222427] px-1.5 py-0.5 rounded border border-[#333538]">
              Ctrl+K
            </span>
          </div>
        </div>

        {/* Right action icons */}
        <div className="flex items-center space-x-2">
          {/* Wallpaper Generator Button */}
          <button 
            onClick={onOpenWallpaperModal}
            title="สร้างและเปลี่ยนวอลเปเปอร์ Windows ตามงาน"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white text-xs font-medium transition"
          >
            <ImageIcon size={15} className="text-pink-400" />
            <span className="hidden sm:inline">Wallpaper</span>
          </button>

          {/* Export / Backup Modal Button */}
          <button 
            onClick={onOpenBackupDataModal}
            title="ส่งออกและสำรองข้อมูล (Export / Backup)"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-emerald-400 text-xs font-medium transition cursor-pointer"
          >
            <Download size={15} className="text-emerald-400" />
            <span className="hidden sm:inline">Export / Backup</span>
          </button>

          {/* Notification Bell */}
          <button 
            onClick={onOpenNotificationCenter}
            title="การแจ้งเตือนงาน (Due Soon / Overdue)"
            className="relative p-1.5 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white transition"
          >
            <Bell size={16} />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center animate-pulse">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom row: View Switcher Tabs (Home, List View, Board View, Timeline View) */}
      <div className="flex items-center justify-between pt-1 border-t border-[#2a2b2d]">
        <div className="flex items-center space-x-1 text-xs">
          <button 
            onClick={() => onSelectView('home')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-medium transition ${
              activeView === 'home' 
                ? 'bg-[#2a2b2d] text-white border-b-2 border-[#7b68ee]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222427]'
            }`}
          >
            <Home size={14} className={activeView === 'home' ? 'text-[#7b68ee]' : ''} />
            <span>Home</span>
          </button>

          <button 
            onClick={() => onSelectView('list')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-medium transition ${
              activeView === 'list' 
                ? 'bg-[#2a2b2d] text-white border-b-2 border-[#7b68ee]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222427]'
            }`}
          >
            <List size={14} />
            <span>List View</span>
          </button>

          <button 
            onClick={() => onSelectView('board')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-medium transition ${
              activeView === 'board' 
                ? 'bg-[#2a2b2d] text-white border-b-2 border-[#7b68ee]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222427]'
            }`}
          >
            <Kanban size={14} />
            <span>Board View</span>
          </button>

          <button 
            onClick={() => onSelectView('calendar')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-medium transition ${
              activeView === 'calendar' 
                ? 'bg-[#2a2b2d] text-white border-b-2 border-[#7b68ee]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222427]'
            }`}
          >
            <Calendar size={14} />
            <span>Calendar View</span>
          </button>

          <button 
            onClick={() => onSelectView('matrix')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-medium transition ${
              activeView === 'matrix' 
                ? 'bg-[#2a2b2d] text-white border-b-2 border-[#7b68ee]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222427]'
            }`}
          >
            <Grid2X2 size={14} />
            <span>Matrix View</span>
          </button>

          <button 
            onClick={() => onSelectView('timeline')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-medium transition ${
              activeView === 'timeline' 
                ? 'bg-[#2a2b2d] text-white border-b-2 border-[#7b68ee]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222427]'
            }`}
          >
            <CalendarRange size={14} />
            <span>Timeline View</span>
          </button>
        </div>

        {/* View Options & Contextual Module Print Button */}
        <div className="flex items-center space-x-2 text-xs">
          {activeView === 'list' && (
            <>
              <button 
                onClick={() => onOpenPrintReport('list')}
                title="พิมพ์ตารางรายการงาน (Print List View)"
                className="flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white transition cursor-pointer border border-[#3a3b3d]/50"
              >
                <Printer size={13} className="text-blue-400" />
                <span>พิมพ์ตารางงาน</span>
              </button>
            </>
          )}

          {activeView === 'board' && (
            <button 
              onClick={() => onOpenPrintReport('board')}
              title="พิมพ์กระดานงาน (Print Kanban Board)"
              className="flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white transition cursor-pointer border border-[#3a3b3d]/50"
            >
              <Printer size={13} className="text-blue-400" />
              <span>พิมพ์บอร์ด</span>
            </button>
          )}

          {activeView === 'calendar' && (
            <button 
              onClick={() => onOpenPrintReport('calendar')}
              title="พิมพ์ปฏิทินรายเดือน (Print Monthly Calendar)"
              className="flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white transition cursor-pointer border border-[#3a3b3d]/50"
            >
              <Printer size={13} className="text-blue-400" />
              <span>พิมพ์ปฏิทิน</span>
            </button>
          )}

          {activeView === 'matrix' && (
            <button 
              onClick={() => onOpenPrintReport('matrix')}
              title="พิมพ์ผัง Eisenhower Matrix แนวนอน (Print Matrix Chart)"
              className="flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white transition cursor-pointer border border-[#3a3b3d]/50"
            >
              <Printer size={13} className="text-blue-400" />
              <span>พิมพ์ Matrix</span>
            </button>
          )}

          {activeView === 'timeline' && (
            <button 
              onClick={() => onOpenPrintReport('timeline')}
              title="พิมพ์แผนผังกำหนดเวลา (Print Gantt Timeline)"
              className="flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white transition cursor-pointer border border-[#3a3b3d]/50"
            >
              <Printer size={13} className="text-blue-400" />
              <span>พิมพ์ Gantt</span>
            </button>
          )}

          {activeView === 'home' && (
            <button 
              onClick={() => onOpenPrintReport('home')}
              title="พิมพ์สรุปภาพรวมเวิร์กสเปซ (Print Workspace Summary)"
              className="flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white transition cursor-pointer border border-[#3a3b3d]/50"
            >
              <Printer size={13} className="text-blue-400" />
              <span>พิมพ์สรุปภาพรวม</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
