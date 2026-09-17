import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Bell, 
  Image as ImageIcon, 
  Printer, 
  SlidersHorizontal, 
  Plus, 
  List, 
  Kanban, 
  CalendarRange, 
  Share2,
  ChevronDown,
  Download,
  Database,
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
            <span className="text-gray-400 font-medium">{spaceName || 'Team Space'}</span>
            <span className="text-gray-500">/</span>
            <div className="flex items-center space-x-1.5 text-white font-semibold">
              <span className="w-2 h-2 rounded-sm bg-[#7b68ee]"></span>
              <span>{listName || 'IQA26'}</span>
              <ChevronDown size={13} className="text-gray-400" />
            </div>
          </div>
        )}

        {/* Center: Search & AI Assistant */}
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

          <button 
            onClick={onOpenAISidebar}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 border border-purple-500/40 rounded-full text-purple-200 text-xs font-medium transition shadow-sm flex-shrink-0"
          >
            <Sparkles size={13} className="text-purple-300" />
            <span>AI Assistant</span>
          </button>
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

          {/* Quick Export Excel/CSV Button */}
          <a 
            href={`/api/export/csv?listId=${activeListId || 'list-iqa26'}`}
            title="ส่งออกตารางงานเป็น Excel CSV ทันที"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-emerald-400 text-xs font-medium transition"
          >
            <Download size={15} className="text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </a>

          {/* Backup & Data Center Button */}
          <button 
            onClick={onOpenBackupDataModal}
            title="ศูนย์สำรองข้อมูลและกู้คืน (Backup & Data Center)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-purple-400 text-xs font-medium transition"
          >
            <Database size={15} className="text-purple-400" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          {/* Print / PDF Button */}
          <button 
            onClick={onOpenPrintReport}
            title="พิมพ์หรือส่งออกเป็น PDF บนเบราว์เซอร์"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white text-xs font-medium transition"
          >
            <Printer size={15} className="text-blue-400" />
            <span className="hidden sm:inline">Print / PDF</span>
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

          {/* Add Item Button */}
          <button 
            onClick={onQuickAddTask}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white text-xs font-semibold rounded shadow-sm transition"
          >
            <Plus size={14} />
            <span>Add Item</span>
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

        {/* View Options */}
        <div className="flex items-center space-x-2 text-xs">
          <button 
            onClick={onOpenCustomFieldModal}
            className="flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-[#2a2b2d] text-gray-400 hover:text-white transition"
          >
            <SlidersHorizontal size={13} />
            <span>Columns</span>
          </button>
        </div>
      </div>
    </header>
  );
}
