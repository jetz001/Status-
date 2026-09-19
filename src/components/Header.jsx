import React, { useState, useRef, useEffect } from 'react';
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
  Home,
  CheckCircle2,
  Circle,
  Clock,
  X
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
  searchQuery = '',
  onSearchChange,
  allTasks = [],
  onSelectTask
}) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Filter tasks based on searchQuery
  const query = (searchQuery || '').trim().toLowerCase();
  const searchResults = query ? allTasks.filter(t => {
    const nameMatch = t.name && t.name.toLowerCase().includes(query);
    const descMatch = t.description && t.description.toLowerCase().includes(query);
    const assigneeMatch = t.assignee && t.assignee.toLowerCase().includes(query);
    const spaceMatch = t.space_name && t.space_name.toLowerCase().includes(query);
    const listMatch = t.list_name && t.list_name.toLowerCase().includes(query);
    return nameMatch || descMatch || assigneeMatch || spaceMatch || listMatch;
  }).slice(0, 12) : [];

  // Reset selectedIndex when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isSearchFocused || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        if (onSelectTask) {
          onSelectTask(searchResults[selectedIndex]);
        }
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
    }
  };

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

        {/* Center: Search with Live Dropdown & Ctrl+K */}
        <div ref={searchContainerRef} className="relative flex items-center space-x-2 flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              ref={searchInputRef}
              id="global-search-input"
              type="text"
              placeholder="ค้นหาชื่องาน รายละเอียด หรือผู้รับผิดชอบ (Ctrl+K)..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsSearchFocused(true);
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-8 pr-20 py-1.5 bg-[#141517] border border-[#333538] focus:border-[#7b68ee] rounded-full text-xs text-white placeholder-gray-500 outline-none transition"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-0.5 text-gray-400 hover:text-white rounded-full hover:bg-[#2b2d32] transition"
                  title="ล้างคำค้นหา"
                >
                  <X size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  searchInputRef.current?.focus();
                  searchInputRef.current?.select();
                  setIsSearchFocused(true);
                }}
                className="text-[10px] text-gray-400 hover:text-white bg-[#222427] hover:bg-[#2c2e33] px-1.5 py-0.5 rounded border border-[#333538] transition cursor-pointer"
                title="กด Ctrl+K เพื่อค้นหา"
              >
                Ctrl+K
              </button>
            </div>
          </div>

          {/* Floating Live Search Dropdown */}
          {isSearchFocused && query && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#18191c] border border-[#333538] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-[#1d1f23] border-b border-[#2d2f34] flex items-center justify-between text-[11px] text-gray-400">
                <span>ผลการค้นหา {searchResults.length > 0 ? `พบ ${searchResults.length} รายการ` : ''}</span>
                <span className="text-[10px] text-gray-500">กด Enter เพื่อเปิด • Esc เพื่อปิด</span>
              </div>

              {searchResults.length > 0 ? (
                <div className="max-h-[380px] overflow-y-auto divide-y divide-[#222428]">
                  {searchResults.map((t, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={t.id || idx}
                        onClick={() => {
                          if (onSelectTask) {
                            onSelectTask(t);
                          }
                          setIsSearchFocused(false);
                          searchInputRef.current?.blur();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`px-3 py-2.5 flex items-center justify-between transition cursor-pointer ${
                          isSelected ? 'bg-[#252830] border-l-2 border-[#7b68ee]' : 'hover:bg-[#1e2025]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-3">
                          {t.status === 'COMPLETED' ? (
                            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                          ) : t.status === 'IN PROGRESS' ? (
                            <Clock size={14} className="text-blue-400 flex-shrink-0" />
                          ) : (
                            <Circle size={14} className="text-gray-500 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-xs font-medium truncate ${
                                t.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-100'
                              }`}>
                                {t.name}
                              </span>
                            </div>
                            {(t.space_name || t.list_name) && (
                              <div className="text-[10px] text-gray-400 mt-0.5 flex items-center space-x-1 truncate">
                                <span>{t.space_name || 'Space'}</span>
                                <span>›</span>
                                <span className="text-gray-300 font-medium">{t.list_name || 'List'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0 text-[10px]">
                          {t.priority && t.priority !== 'Normal' && (
                            <span className={`px-1.5 py-0.5 rounded font-medium ${
                              t.priority === 'Urgent' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              t.priority === 'High' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                              'bg-gray-800 text-gray-400'
                            }`}>
                              {t.priority}
                            </span>
                          )}
                          {t.due_date && (
                            <span className="text-gray-400 bg-[#222428] px-1.5 py-0.5 rounded border border-[#2f3136] flex items-center space-x-1">
                              <span>📅</span>
                              <span>{t.due_date}</span>
                            </span>
                          )}
                          {t.assignee && (
                            <span className="text-gray-400 bg-[#222428] px-1.5 py-0.5 rounded border border-[#2f3136]">
                              👤 {t.assignee}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 space-y-1">
                  <p className="text-xs">ไม่พบงานที่ตรงกับ "<span className="text-white font-medium">{searchQuery}</span>"</p>
                  <p className="text-[11px] text-gray-500">ลองค้นหาด้วยชื่องานอื่น, ผู้รับผิดชอบ หรือชื่อ Space/List</p>
                </div>
              )}
            </div>
          )}
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
