import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ListView from './components/ListView.jsx';
import BoardView from './components/BoardView.jsx';
import TimelineView from './components/TimelineView.jsx';
import TaskDrawer from './components/TaskDrawer.jsx';
import AISidebarRAG from './components/AISidebarRAG.jsx';
import WallpaperModal from './components/WallpaperModal.jsx';
import NotificationCenter from './components/NotificationCenter.jsx';
import MoveCopyModal from './components/MoveCopyModal.jsx';
import CustomFieldModal from './components/CustomFieldModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ImageLightboxModal from './components/ImageLightboxModal.jsx';
import PrintReportView from './components/PrintReportView.jsx';

export default function App() {
  const [spaces, setSpaces] = useState([]);
  const [activeListId, setActiveListId] = useState('list-iqa26');
  const [tasks, setTasks] = useState([]);
  const [fields, setFields] = useState([]);
  const [activeView, setActiveView] = useState('list'); // 'list' | 'board' | 'timeline'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Panels
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMoveCopyModal, setShowMoveCopyModal] = useState(false);
  const [taskForMoveCopy, setTaskForMoveCopy] = useState(null);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);
  const [printConfig, setPrintConfig] = useState(null); // { type: 'list' | 'task', singleTask }

  const [notifications, setNotifications] = useState([]);

  // Load Spaces & Lists
  const loadSpaces = async () => {
    try {
      const res = await fetch('/api/spaces');
      const data = await res.json();
      setSpaces(data);
      if (!activeListId && data[0]?.lists?.[0]) {
        setActiveListId(data[0].lists[0].id);
      }
    } catch (err) {
      console.error('Error loading spaces:', err);
    }
  };

  // Load Tasks for active list
  const loadTasks = async (listId = activeListId) => {
    if (!listId) return;
    try {
      const res = await fetch(`/api/tasks?listId=${listId}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setFields(data.fields || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  // Load Notifications
  const checkNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data || []);

      // If in Electron and there are overdue/due soon alerts, send desktop toast
      if (window.electronAPI && data && data.length > 0) {
        const overdue = data.filter(d => d.type === 'overdue');
        if (overdue.length > 0) {
          window.electronAPI.showNotification(
            '⚠️ มีงานเกินกำหนดส่ง (ClickUp Alert)',
            `พบงานเกินกำหนด ${overdue.length} รายการ: ${overdue[0].title}`
          );
        }
      }
    } catch (err) {
      console.error('Error checking notifications:', err);
    }
  };

  useEffect(() => {
    loadSpaces();
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeListId) {
      loadTasks(activeListId);
    }
  }, [activeListId]);

  // Global Keyboard Shortcuts (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowAISidebar(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Space & List creation
  const handleCreateSpace = async (name) => {
    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      loadSpaces();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateList = async (spaceId, name) => {
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space_id: spaceId, name })
      });
      const data = await res.json();
      loadSpaces();
      setActiveListId(data.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Task Mutations
  const handleQuickAddTask = async ({ name, status }) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: activeListId,
          name,
          status: status || 'NOT STARTED'
        })
      });
      loadTasks();
      loadSpaces();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      loadTasks();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => ({ ...prev, ...updates }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTaskStatus = async (taskId, nextStatus) => {
    handleUpdateTask(taskId, { status: nextStatus });
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      loadTasks();
      loadSpaces();
      if (selectedTask?.id === taskId) setSelectedTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Move & Copy Tasks
  const handleMoveTask = async (taskId, targetListId) => {
    try {
      await fetch(`/api/tasks/${taskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_list_id: targetListId })
      });
      loadTasks();
      loadSpaces();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyTask = async (taskId, targetListId, copySubtasks, copyAttachments) => {
    try {
      await fetch(`/api/tasks/${taskId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_list_id: targetListId,
          copy_subtasks: copySubtasks,
          copy_attachments: copyAttachments
        })
      });
      loadTasks();
      loadSpaces();
    } catch (err) {
      console.error(err);
    }
  };

  // Custom Field
  const handleAddCustomField = async (listId, fieldData) => {
    try {
      await fetch(`/api/lists/${listId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldData)
      });
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Find active space and list metadata
  let activeSpaceName = 'Team Space';
  let activeListName = 'IQA26';
  for (const sp of spaces) {
    const foundList = sp.lists?.find(l => l.id === activeListId);
    if (foundList) {
      activeSpaceName = sp.name;
      activeListName = foundList.name;
      break;
    }
  }

  // Filter tasks by search query
  const filteredTasks = tasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.assignee && t.assignee.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f21] text-[#ececef]">
      {/* 1. Left Sidebar */}
      <Sidebar 
        spaces={spaces}
        activeListId={activeListId}
        onSelectList={setActiveListId}
        onCreateSpace={handleCreateSpace}
        onCreateList={handleCreateList}
        onOpenAISidebar={() => setShowAISidebar(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* 2. Main Content Center */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header 
          spaceName={activeSpaceName}
          listName={activeListName}
          activeView={activeView}
          onSelectView={setActiveView}
          onOpenAISidebar={() => setShowAISidebar(true)}
          onOpenWallpaperModal={() => setShowWallpaperModal(true)}
          onOpenNotificationCenter={() => setShowNotificationCenter(prev => !prev)}
          onOpenPrintReport={() => setPrintConfig({ type: 'list' })}
          onOpenCustomFieldModal={() => setShowCustomFieldModal(true)}
          onQuickAddTask={() => handleQuickAddTask({ name: 'งานใหม่...', status: 'NOT STARTED' })}
          notificationCount={notifications.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* View Routing */}
        <div className="flex-1 flex overflow-hidden">
          {activeView === 'list' && (
            <ListView 
              tasks={filteredTasks}
              fields={fields}
              onSelectTask={setSelectedTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onDeleteTask={handleDeleteTask}
              onQuickAddTask={handleQuickAddTask}
              onOpenMoveCopy={(task) => {
                setTaskForMoveCopy(task);
                setShowMoveCopyModal(true);
              }}
              onOpenAddColumn={() => setShowCustomFieldModal(true)}
            />
          )}

          {activeView === 'board' && (
            <BoardView 
              tasks={filteredTasks}
              onSelectTask={setSelectedTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onDeleteTask={handleDeleteTask}
              onQuickAddTask={handleQuickAddTask}
              onOpenMoveCopy={(task) => {
                setTaskForMoveCopy(task);
                setShowMoveCopyModal(true);
              }}
            />
          )}

          {activeView === 'timeline' && (
            <TimelineView 
              tasks={filteredTasks}
              onSelectTask={setSelectedTask}
            />
          )}
        </div>
      </main>

      {/* 3. Task Detail Drawer */}
      {selectedTask && (
        <TaskDrawer 
          task={selectedTask}
          fields={fields}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onOpenMoveCopy={(task) => {
            setTaskForMoveCopy(task);
            setShowMoveCopyModal(true);
          }}
          onOpenPrintSingleTask={(task) => setPrintConfig({ type: 'task', singleTask: task })}
          onOpenLightbox={(url) => setLightboxImageUrl(url)}
        />
      )}

      {/* 4. AI Assistant Sidebar & RAG Search */}
      <AISidebarRAG 
        isOpen={showAISidebar}
        onClose={() => setShowAISidebar(false)}
        onSelectTaskById={(taskId) => {
          const t = tasks.find(item => item.id === taskId);
          if (t) setSelectedTask(t);
        }}
      />

      {/* 5. Wallpaper Generator Modal */}
      <WallpaperModal 
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        tasks={tasks}
        listName={activeListName}
      />

      {/* 6. Notification Center Dropdown */}
      <NotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        notifications={notifications}
        onSelectTaskById={(taskId) => {
          const t = tasks.find(item => item.id === taskId);
          if (t) setSelectedTask(t);
        }}
      />

      {/* 7. Move & Copy Modal */}
      <MoveCopyModal 
        isOpen={showMoveCopyModal}
        onClose={() => {
          setShowMoveCopyModal(false);
          setTaskForMoveCopy(null);
        }}
        task={taskForMoveCopy}
        spaces={spaces}
        onMoveTask={handleMoveTask}
        onCopyTask={handleCopyTask}
      />

      {/* 8. Custom Field Modal */}
      <CustomFieldModal 
        isOpen={showCustomFieldModal}
        onClose={() => setShowCustomFieldModal(false)}
        listId={activeListId}
        onAddCustomField={handleAddCustomField}
      />

      {/* 9. Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* 10. Image Lightbox */}
      <ImageLightboxModal 
        imageUrl={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />

      {/* 11. Print / PDF Report Overlay */}
      {printConfig && (
        <PrintReportView 
          type={printConfig.type}
          tasks={tasks}
          singleTask={printConfig.singleTask}
          listName={activeListName}
          spaceName={activeSpaceName}
          onClose={() => setPrintConfig(null)}
        />
      )}
    </div>
  );
}
