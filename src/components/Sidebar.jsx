import React, { useState } from 'react';
import { 
  Home, 
  CheckSquare, 
  Folder, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  Users, 
  FileText, 
  Layers, 
  Settings, 
  Compass,
  Calendar,
  Clock,
  LayoutDashboard,
  Database,
  Edit3,
  Palette,
  Copy,
  Trash2,
  PlusCircle,
  AlertTriangle,
  History,
  FolderInput,
  MoreHorizontal
} from 'lucide-react';
import ContextMenu from './ContextMenu.jsx';

const COLOR_PRESETS = [
  { label: 'ม่วง Purple', value: '#7b68ee' },
  { label: 'ฟ้า Blue', value: '#3b82f6' },
  { label: 'เขียว Emerald', value: '#10b981' },
  { label: 'ส้ม Amber', value: '#f59e0b' },
  { label: 'แดง Ruby', value: '#ef4444' },
  { label: 'ชมพู Rose', value: '#ec4899' },
  { label: 'คราม Cyan', value: '#06b6d4' }
];

export default function Sidebar({ 
  spaces, 
  activeListId, 
  activeView,
  onSelectList, 
  onSelectHome,
  onSelectAllTasks,
  allTasksCount = 0,
  onCreateSpace, 
  onCreateList,
  onUpdateSpace,
  onDeleteSpace,
  onUpdateList,
  onDeleteList,
  onDuplicateList,
  onQuickAddTask,
  onOpenAISidebar,
  onOpenSettings,
  onOpenBackupDataModal,
  aiChatHistory = [],
  activeAiSessionId = null,
  onSelectAiSession,
  onNewAiChat,
  onDeleteAiSession
}) {
  const [expandedSpaces, setExpandedSpaces] = useState({ 'space-team': true });
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showAddListModal, setShowAddListModal] = useState(null);
  const [newListName, setNewListName] = useState('');

  // Drag and Drop state for Lists
  const [draggedList, setDraggedList] = useState(null); // { listId, sourceSpaceId }
  const [dragOverSpaceId, setDragOverSpaceId] = useState(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, items: [] });
  
  // Modals for context menu actions
  const [renameTarget, setRenameTarget] = useState(null); // { type: 'space' | 'list', id, name }
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); // { type: 'space' | 'list', id, name }

  const toggleSpace = (spaceId) => {
    setExpandedSpaces(prev => ({ ...prev, [spaceId]: !prev[spaceId] }));
  };

  const handleCreateSpaceSubmit = (e) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    onCreateSpace(newSpaceName.trim());
    setNewSpaceName('');
    setShowAddSpaceModal(false);
  };

  const handleCreateListSubmit = (e, spaceId) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(spaceId, newListName.trim());
    setNewListName('');
    setShowAddListModal(null);
  };

  // Right-click on Space
  const handleSpaceContextMenu = (e, space) => {
    e.preventDefault();
    e.stopPropagation();

    const colorSubmenu = COLOR_PRESETS.map(c => ({
      label: c.label,
      colorDot: c.value,
      checked: space.color === c.value,
      onClick: () => {
        if (onUpdateSpace) onUpdateSpace(space.id, { color: c.value });
      }
    }));

    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      items: [
        {
          label: 'เปลี่ยนชื่อ Space...',
          icon: Edit3,
          onClick: () => setRenameTarget({ type: 'space', id: space.id, name: space.name })
        },
        {
          label: 'เปลี่ยนสี Space',
          icon: Palette,
          submenu: colorSubmenu
        },
        { type: 'separator' },
        {
          label: 'เพิ่ม List ใหม่...',
          icon: Plus,
          onClick: () => {
            setExpandedSpaces(prev => ({ ...prev, [space.id]: true }));
            setShowAddListModal(space.id);
          }
        },
        { type: 'separator' },
        {
          label: 'ลบ Space นี้...',
          icon: Trash2,
          danger: true,
          onClick: () => setDeleteConfirmTarget({ type: 'space', id: space.id, name: space.name })
        }
      ]
    });
  };

  // Right-click or Menu on List
  const handleListContextMenu = (e, list, currentSpaceId) => {
    e.preventDefault();
    e.stopPropagation();

    const colorSubmenu = COLOR_PRESETS.map(c => ({
      label: c.label,
      colorDot: c.value,
      checked: list.color === c.value,
      onClick: () => {
        if (onUpdateList) onUpdateList(list.id, { color: c.value });
      }
    }));

    const targetSpaces = (spaces || []).filter(s => s.id !== (list.space_id || currentSpaceId));
    const moveSubmenu = targetSpaces.length > 0 ? targetSpaces.map(s => ({
      label: s.name,
      colorDot: s.color || '#7b68ee',
      icon: Folder,
      onClick: () => {
        if (onUpdateList) {
          onUpdateList(list.id, { space_id: s.id });
          setExpandedSpaces(prev => ({ ...prev, [s.id]: true }));
        }
      }
    })) : [
      {
        label: 'ไม่มี Space อื่นให้ย้าย',
        disabled: true
      }
    ];

    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      items: [
        {
          label: 'เปลี่ยนชื่อ List...',
          icon: Edit3,
          onClick: () => setRenameTarget({ type: 'list', id: list.id, name: list.name })
        },
        {
          label: 'เปลี่ยนสี List',
          icon: Palette,
          submenu: colorSubmenu
        },
        {
          label: 'ย้าย List ไปที่ Space อื่น',
          icon: FolderInput,
          submenu: moveSubmenu
        },
        {
          label: 'ทำสำเนา List (Duplicate)',
          icon: Copy,
          onClick: () => {
            if (onDuplicateList) onDuplicateList(list.id);
          }
        },
        { type: 'separator' },
        {
          label: 'เพิ่มงานใน List นี้',
          icon: PlusCircle,
          onClick: () => {
            if (onQuickAddTask) onQuickAddTask({ list_id: list.id, name: 'งานใหม่...' });
          }
        },
        { type: 'separator' },
        {
          label: 'ลบ List นี้...',
          icon: Trash2,
          danger: true,
          onClick: () => setDeleteConfirmTarget({ type: 'list', id: list.id, name: list.name })
        }
      ]
    });
  };

  // Drag & Drop handlers for lists moving between spaces
  const handleListDragStart = (e, list, currentSpaceId) => {
    e.stopPropagation();
    const data = { type: 'list', listId: list.id, sourceSpaceId: list.space_id || currentSpaceId };
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.setData('text/plain', list.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedList(data);
  };

  const handleListDragEnd = () => {
    setDraggedList(null);
    setDragOverSpaceId(null);
  };

  const handleSpaceDragOver = (e, spaceId) => {
    if (draggedList && draggedList.sourceSpaceId !== spaceId) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverSpaceId !== spaceId) {
        setDragOverSpaceId(spaceId);
      }
    }
  };

  const handleSpaceDragLeave = (e, spaceId) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverSpaceId === spaceId) {
      setDragOverSpaceId(null);
    }
  };

  const handleSpaceDrop = (e, targetSpaceId) => {
    e.preventDefault();
    setDragOverSpaceId(null);
    setDraggedList(null);

    let listId = null;
    let sourceSpaceId = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const parsed = JSON.parse(raw);
        listId = parsed.listId;
        sourceSpaceId = parsed.sourceSpaceId;
      }
    } catch {
      listId = e.dataTransfer.getData('text/plain');
    }

    if (listId && targetSpaceId && sourceSpaceId !== targetSpaceId) {
      if (onUpdateList) {
        onUpdateList(listId, { space_id: targetSpaceId });
        setExpandedSpaces(prev => ({ ...prev, [targetSpaceId]: true }));
      }
    }
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (!renameTarget || !renameTarget.name.trim()) return;
    if (renameTarget.type === 'space') {
      if (onUpdateSpace) onUpdateSpace(renameTarget.id, { name: renameTarget.name.trim() });
    } else {
      if (onUpdateList) onUpdateList(renameTarget.id, { name: renameTarget.name.trim() });
    }
    setRenameTarget(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'space') {
      if (onDeleteSpace) onDeleteSpace(deleteConfirmTarget.id);
    } else {
      if (onDeleteList) onDeleteList(deleteConfirmTarget.id);
    }
    setDeleteConfirmTarget(null);
  };

  return (
    <aside className="w-64 bg-[#18191b] border-r border-[#333538] flex flex-col h-screen select-none text-[#cfd3d8] flex-shrink-0 z-10 text-xs">
      {/* Workspace Header */}
      <div 
        onClick={onSelectHome}
        className="p-3 border-b border-[#333538] flex items-center justify-between hover:bg-[#222427] cursor-pointer transition"
      >
        <div className="flex items-center space-x-2.5 truncate">
          <img 
            src="/logo.png" 
            alt="Status+" 
            className="w-7 h-7 rounded-lg object-cover shadow-sm ring-1 ring-[#7b68ee]/30 flex-shrink-0" 
          />
          <div className="flex flex-col truncate leading-tight">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-white truncate text-xs">Status+</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#7b68ee]/20 text-[#a292ff] font-semibold">PRO</span>
            </div>
            <span className="text-[10px] text-gray-400 truncate">Jet mut's Workspace</span>
          </div>
        </div>
        <ChevronDown size={14} className="text-gray-400" />
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Core Nav items */}
        <div className="space-y-1">
          <div 
            onClick={onSelectHome}
            className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition ${
              activeView === 'home'
                ? 'bg-[#7b68ee]/20 text-white font-semibold border-l-2 border-[#7b68ee]'
                : 'hover:bg-[#2a2b2d] text-gray-300 hover:text-white'
            }`}
          >
            <Home size={15} className={activeView === 'home' ? 'text-[#7b68ee]' : 'text-gray-400'} />
            <span>Home</span>
          </div>

          {/* All Tasks - Jet mut's Workspace */}
          <div 
            onClick={onSelectAllTasks}
            className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition group ${
              activeListId === 'all' && activeView !== 'home'
                ? 'bg-[#2a2b2d] text-white font-semibold border-l-2 border-cyan-400'
                : 'hover:bg-[#2a2b2d] text-gray-300 hover:text-white'
            }`}
          >
            <div className="w-5 h-5 rounded bg-[#1e2024] border border-[#383a3e] flex items-center justify-center flex-shrink-0 shadow-xs group-hover:border-cyan-500/50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 group-hover:text-cyan-400">
                <circle cx="12" cy="12" r="3"></circle>
                <circle cx="12" cy="3" r="2.5"></circle>
                <circle cx="12" cy="21" r="2.5"></circle>
                <circle cx="3" cy="12" r="2.5"></circle>
                <circle cx="21" cy="12" r="2.5"></circle>
                <line x1="12" y1="5.5" x2="12" y2="9"></line>
                <line x1="12" y1="15" x2="12" y2="18.5"></line>
                <line x1="5.5" y1="12" x2="9" y2="12"></line>
                <line x1="15" y1="12" x2="18.5" y2="12"></line>
              </svg>
            </div>
            <div className="truncate flex-1">
              <span className="text-white font-medium">All Tasks</span>
              <span className="text-[10px] text-gray-400 ml-1.5">- Jet mut's Workspace</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#242629] text-gray-400 group-hover:text-cyan-300">
              {allTasksCount || 0}
            </span>
          </div>
        </div>

        {/* SPACES Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            <span>Spaces</span>
            <button 
              onClick={() => setShowAddSpaceModal(true)}
              title="Add Space"
              className="p-0.5 hover:bg-[#333538] rounded text-gray-400 hover:text-white transition cursor-pointer"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-1 mt-1">
            {spaces.map(space => {
              const isExpanded = !!expandedSpaces[space.id];
              const isDropTarget = dragOverSpaceId === space.id;
              return (
                <div 
                  key={space.id} 
                  onDragOver={(e) => handleSpaceDragOver(e, space.id)}
                  onDragLeave={(e) => handleSpaceDragLeave(e, space.id)}
                  onDrop={(e) => handleSpaceDrop(e, space.id)}
                  className={`space-y-0.5 rounded-lg transition-all ${
                    isDropTarget ? 'bg-[#7b68ee]/20 ring-2 ring-[#7b68ee] p-1' : ''
                  }`}
                >
                  {/* Space Header */}
                  <div 
                    onClick={() => toggleSpace(space.id)}
                    onContextMenu={(e) => handleSpaceContextMenu(e, space)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#222427] cursor-pointer text-gray-200 group ${
                      isDropTarget ? 'bg-[#7b68ee]/30' : ''
                    }`}
                    title="คลิกขวาเพื่อจัดการ Space หรือลาก List มาวางที่นี่"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {isExpanded ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: space.color || '#7b68ee' }} />
                      <span className="font-semibold truncate text-[12px] text-gray-100">{space.name}</span>
                      {isDropTarget && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#7b68ee] text-white font-medium animate-pulse ml-1">
                          ปล่อยเพื่อย้าย List
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowAddListModal(space.id); }}
                      title="Add List to this Space"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#333538] rounded text-gray-300 hover:text-white transition"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Lists in Space */}
                  {isExpanded && (
                    <div className="pl-6 space-y-0.5 border-l border-[#2e3033] ml-3 mt-0.5">
                      {space.lists && space.lists.map(list => {
                        const isActive = list.id === activeListId;
                        const isBeingDragged = draggedList?.listId === list.id;
                        return (
                          <div 
                            key={list.id}
                            draggable={true}
                            onDragStart={(e) => handleListDragStart(e, list, space.id)}
                            onDragEnd={handleListDragEnd}
                            onClick={() => onSelectList(list.id)}
                            onContextMenu={(e) => handleListContextMenu(e, list, space.id)}
                            className={`group/list flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition text-xs ${
                              isBeingDragged ? 'opacity-40 scale-95 border-dashed border border-[#7b68ee]' : ''
                            } ${
                              isActive 
                                ? 'bg-[#2a2b2d] text-white font-semibold border-l-2 border-[#7b68ee]' 
                                : 'text-gray-300 hover:bg-[#222427] hover:text-white'
                            }`}
                            title="ลากเพื่อย้าย Space หรือคลิกขวาเพื่อจัดการ List"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: list.color || space.color || '#7b68ee' }} 
                              />
                              <span className="truncate">{list.name}</span>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              {list.taskCount !== undefined && list.taskCount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  isActive ? 'bg-[#3b3d42] text-white' : 'text-gray-400'
                                }`}>
                                  {list.taskCount}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleListContextMenu(e, list, space.id);
                                }}
                                title="จัดการ List"
                                className="opacity-0 group-hover/list:opacity-100 p-0.5 hover:bg-[#383a3e] rounded text-gray-400 hover:text-white transition cursor-pointer"
                              >
                                <MoreHorizontal size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add List Input inside Space */}
                      {showAddListModal === space.id && (
                        <form onSubmit={(e) => handleCreateListSubmit(e, space.id)} className="p-1">
                          <input 
                            type="text"
                            placeholder="ชื่อ List ใหม่..."
                            autoFocus
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onBlur={() => setShowAddListModal(null)}
                            className="w-full px-2 py-1 bg-[#222427] border border-[#7b68ee] rounded text-white text-xs outline-none"
                          />
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Assistant Section */}
        <div className="pt-2 border-t border-[#2e3033]">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            <span>AI Assistant</span>
            <Sparkles size={13} className="text-cyan-400 animate-pulse" />
          </div>
          <div className="space-y-0.5 mt-1">
            <div 
              onClick={onOpenAISidebar}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#2a2b2d] text-cyan-300 hover:text-cyan-200 cursor-pointer font-medium transition group"
            >
              <div className="flex items-center space-x-2">
                <Sparkles size={14} className="text-cyan-400" />
                <span>AI Assistant</span>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewAiChat();
                }}
                title="เริ่มแชทใหม่ (+ New Chat)"
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#383a3e] text-cyan-300 transition cursor-pointer"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* History Log ที่คุยกับ AI */}
        <div className="pt-3 border-t border-[#2e3033] flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            <div className="flex items-center space-x-1.5">
              <History size={12} className="text-cyan-500" />
              <span>ประวัติคุย AI ({aiChatHistory.length})</span>
            </div>
            {aiChatHistory.length > 0 && (
              <button
                type="button"
                onClick={onNewAiChat}
                title="เริ่มแชทใหม่"
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
              >
                + แชทใหม่
              </button>
            )}
          </div>

          <div className="space-y-1 mt-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {aiChatHistory && aiChatHistory.length > 0 ? (
              aiChatHistory.map(item => (
                <div 
                  key={item.id}
                  onClick={() => onSelectAiSession(item.id)}
                  title={item.title}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition text-xs ${
                    activeAiSessionId === item.id 
                      ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/40 font-semibold' 
                      : 'text-gray-300 hover:text-white hover:bg-[#25272a]'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <MessageSquare size={13} className="text-gray-500 group-hover:text-cyan-400 flex-shrink-0" />
                    <span className="truncate text-[11px] block">
                      {item.title}
                    </span>
                  </div>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAiSession(item.id);
                    }}
                    title="ลบประวัติแชทนี้"
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 rounded transition flex-shrink-0 ml-1 cursor-pointer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-gray-500 text-[11px] space-y-1.5 bg-[#141517]/50 rounded-lg border border-[#2a2b2d]/50">
                <p>ยังไม่มีประวัติการคุย</p>
                <button 
                  type="button"
                  onClick={onNewAiChat}
                  className="px-2.5 py-1 rounded bg-[#242629] hover:bg-[#2e3135] text-cyan-400 text-[10px] font-medium transition inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Plus size={11} />
                  <span>เริ่มถามคำถามแรก</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="p-2 border-t border-[#333538] flex flex-col space-y-1 bg-[#141517]">

        <button 
          onClick={onOpenSettings}
          className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-[#2a2b2d] text-gray-400 hover:text-white cursor-pointer transition w-full"
        >
          <Settings size={15} />
          <span className="text-xs font-medium">Settings & API Key</span>
        </button>
      </div>

      {/* Modal to add Space */}
      {showAddSpaceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#222427] border border-[#383a3e] rounded-lg p-4 w-80 shadow-2xl space-y-3">
            <h3 className="font-semibold text-white text-sm">สร้าง Space ใหม่</h3>
            <form onSubmit={handleCreateSpaceSubmit} className="space-y-3">
              <input 
                type="text" 
                placeholder="เช่น Marketing, Development, HR..."
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 bg-[#18191b] border border-[#383a3e] rounded text-white text-xs outline-none focus:border-[#7b68ee]"
              />
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddSpaceModal(false)}
                  className="px-3 py-1.5 rounded text-gray-300 hover:bg-[#333538] text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-3 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-medium rounded text-xs cursor-pointer"
                >
                  สร้าง Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Rename Space or List */}
      {renameTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#222427] border border-[#383a3e] rounded-xl p-4 w-80 shadow-2xl space-y-3">
            <h3 className="font-semibold text-white text-sm">
              เปลี่ยนชื่อ {renameTarget.type === 'space' ? 'Space' : 'List'}
            </h3>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <input 
                type="text" 
                value={renameTarget.name}
                onChange={(e) => setRenameTarget({ ...renameTarget, name: e.target.value })}
                autoFocus
                className="w-full px-3 py-2 bg-[#18191b] border border-[#383a3e] rounded text-white text-xs outline-none focus:border-[#7b68ee]"
              />
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setRenameTarget(null)}
                  className="px-3 py-1.5 rounded text-gray-300 hover:bg-[#333538] text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-3 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-medium rounded text-xs cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Confirm Delete Space or List */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#222427] border border-red-500/30 rounded-xl p-4 w-88 shadow-2xl space-y-3">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle size={18} />
              <h3 className="font-semibold text-sm">
                ยืนยันการลบ {deleteConfirmTarget.type === 'space' ? 'Space' : 'List'}
              </h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบ <span className="font-semibold text-white">"{deleteConfirmTarget.name}"</span>? ข้อมูลงานย่อยและบันทึกทั้งหมดภายในจะถูกลบถาวร
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3 py-1.5 rounded text-gray-300 hover:bg-[#333538] text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded text-xs cursor-pointer"
              >
                ยืนยันลบ
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
    </aside>
  );
}
