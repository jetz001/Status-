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
  LayoutDashboard
} from 'lucide-react';

export default function Sidebar({ 
  spaces, 
  activeListId, 
  onSelectList, 
  onCreateSpace, 
  onCreateList,
  onOpenAISidebar,
  onOpenSettings
}) {
  const [expandedSpaces, setExpandedSpaces] = useState({ 'space-team': true });
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showAddListModal, setShowAddListModal] = useState(null);
  const [newListName, setNewListName] = useState('');

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

  return (
    <aside className="w-64 bg-[#18191b] border-r border-[#333538] flex flex-col h-screen select-none text-[#cfd3d8] flex-shrink-0 z-10 text-xs">
      {/* Workspace Header */}
      <div className="p-3 border-b border-[#333538] flex items-center justify-between hover:bg-[#222427] cursor-pointer transition">
        <div className="flex items-center space-x-2 truncate">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
            J
          </div>
          <span className="font-semibold text-white truncate text-xs">Jet mut's Workspace</span>
        </div>
        <ChevronDown size={14} className="text-gray-400" />
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Core Nav items */}
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2.5 px-2 py-1.5 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white cursor-pointer font-medium">
            <Home size={15} className="text-gray-400" />
            <span>Home</span>
          </div>
          <div className="flex items-center space-x-2.5 px-2 py-1.5 rounded hover:bg-[#2a2b2d] text-gray-300 hover:text-white cursor-pointer font-medium">
            <CheckSquare size={15} className="text-gray-400" />
            <span>My Tasks</span>
          </div>
        </div>

        {/* SPACES Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            <span>Spaces</span>
            <button 
              onClick={() => setShowAddSpaceModal(true)}
              title="Add Space"
              className="p-0.5 hover:bg-[#333538] rounded text-gray-400 hover:text-white transition"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-1 mt-1">
            {spaces.map(space => {
              const isExpanded = !!expandedSpaces[space.id];
              return (
                <div key={space.id} className="space-y-0.5">
                  {/* Space Header */}
                  <div 
                    onClick={() => toggleSpace(space.id)}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#222427] cursor-pointer text-gray-200 group"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {isExpanded ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: space.color || '#7b68ee' }} />
                      <span className="font-semibold truncate text-[12px] text-gray-100">{space.name}</span>
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
                        return (
                          <div 
                            key={list.id}
                            onClick={() => onSelectList(list.id)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition text-xs ${
                              isActive 
                                ? 'bg-[#2a2b2d] text-white font-semibold border-l-2 border-[#7b68ee]' 
                                : 'text-gray-300 hover:bg-[#222427] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className="text-gray-400">#</span>
                              <span className="truncate">{list.name}</span>
                            </div>
                            {list.taskCount !== undefined && list.taskCount > 0 && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                isActive ? 'bg-[#3b3d42] text-white' : 'text-gray-400'
                              }`}>
                                {list.taskCount}
                              </span>
                            )}
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

        {/* AI & Super Agents Section */}
        <div className="pt-2 border-t border-[#2e3033]">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            <span>AI Assistant</span>
            <Sparkles size={13} className="text-purple-400 animate-pulse" />
          </div>
          <div className="space-y-0.5 mt-1">
            <div 
              onClick={onOpenAISidebar}
              className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-[#2a2b2d] text-purple-300 hover:text-purple-200 cursor-pointer font-medium"
            >
              <Sparkles size={14} className="text-purple-400" />
              <span>AI Chat & RAG Search</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="p-2.5 border-t border-[#333538] flex items-center justify-between bg-[#141517]">
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
                  className="px-3 py-1.5 rounded text-gray-300 hover:bg-[#333538] text-xs"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-3 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-medium rounded text-xs"
                >
                  สร้าง Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
