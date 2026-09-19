import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ListView from './components/ListView.jsx';
import BoardView from './components/BoardView.jsx';
import CalendarView from './components/CalendarView.jsx';
import MatrixView from './components/MatrixView.jsx';
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
import BackupDataModal from './components/BackupDataModal.jsx';
import HomeView from './components/HomeView.jsx';

export default function App() {
  const [spaces, setSpaces] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [fields, setFields] = useState([]);
  const [activeView, setActiveView] = useState('home'); // 'home' | 'list' | 'board' | 'timeline'
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceInfo, setWorkspaceInfo] = useState(() => {
    try {
      const u = localStorage.getItem('status_user_name');
      const w = localStorage.getItem('status_workspace_name');
      return {
        workspaceName: w || 'My Workspace',
        userName: u || 'User'
      };
    } catch {
      return { workspaceName: 'My Workspace', userName: 'User' };
    }
  });
  
  // Modals & Panels
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showMoveCopyModal, setShowMoveCopyModal] = useState(false);
  const [taskForMoveCopy, setTaskForMoveCopy] = useState(null);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);
  const [printConfig, setPrintConfig] = useState(null); // { type: 'list' | 'task', singleTask }

  const [notifications, setNotifications] = useState([]);
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [activeAiSessionId, setActiveAiSessionId] = useState(null);

  // Load AI chat history
  const loadAiHistory = async () => {
    try {
      const res = await fetch('/api/ai/history');
      if (res.ok) {
        const data = await res.json();
        setAiChatHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading AI history:', err);
    }
  };

  const handleSelectAiSession = (sessionId) => {
    setActiveAiSessionId(sessionId);
    setShowAISidebar(true);
  };

  const handleNewAiChat = () => {
    setActiveAiSessionId(null);
    setShowAISidebar(true);
  };

  const handleDeleteAiSession = async (sessionId) => {
    try {
      await fetch(`/api/ai/history/${sessionId}`, { method: 'DELETE' });
      if (activeAiSessionId === sessionId) {
        setActiveAiSessionId(null);
      }
      loadAiHistory();
    } catch (err) {
      console.error('Error deleting AI session:', err);
    }
  };

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
    if (listId === 'all') {
      try {
        const res = await fetch('/api/tasks/all');
        const data = await res.json();
        const fresh = data || [];
        setAllTasks(fresh);
        setTasks(fresh);
      } catch (err) {
        console.error('Error loading all tasks:', err);
      }
      return;
    }
    try {
      const res = await fetch(`/api/tasks?listId=${listId}`);
      const data = await res.json();
      const freshTasks = data.tasks || [];
      setTasks(freshTasks);
      setFields(data.fields || []);
      setSelectedTask(prev => {
        if (!prev) return null;
        const fresh = freshTasks.find(t => t.id === prev.id);
        return fresh ? { ...prev, ...fresh } : prev;
      });
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  // Load all tasks across all lists for Home Dashboard & Cross-project views
  const loadAllTasks = async () => {
    try {
      const res = await fetch('/api/tasks/all');
      const data = await res.json();
      setAllTasks(data || []);
    } catch (err) {
      console.error('Error loading all tasks:', err);
    }
  };

  // Load Notifications
  const checkNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);

      // If in Electron and there are overdue/due soon alerts, send desktop toast
      if (window.electronAPI && Array.isArray(data) && data.length > 0) {
        const overdue = data.filter(d => d.type === 'overdue');
        if (overdue.length > 0) {
          window.electronAPI.showNotification(
            '⚠️ มีงานเกินกำหนดส่ง (Status+ Alert)',
            `พบงานเกินกำหนด ${overdue.length} รายการ: ${overdue[0].title}`
          );
        }
      }
    } catch (err) {
      console.error('Error checking notifications:', err);
    }
  };

  const handleDismissNotification = async (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notifId })
      });
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  // Load Workspace Info (Name, User)
  const loadWorkspaceInfo = async () => {
    try {
      const res = await fetch('/api/workspace');
      if (res.ok) {
        const data = await res.json();
        setWorkspaceInfo(prev => {
          const localUser = localStorage.getItem('status_user_name');
          const localWs = localStorage.getItem('status_workspace_name');
          const userName = (data.userName && data.userName !== 'User' && data.userName !== 'Me')
            ? data.userName
            : (localUser || data.userName || prev.userName);
          const workspaceName = data.workspaceName || localWs || prev.workspaceName;
          try {
            if (userName) localStorage.setItem('status_user_name', userName);
            if (workspaceName) localStorage.setItem('status_workspace_name', workspaceName);
          } catch (e) {}
          return { workspaceName, userName };
        });
      }
    } catch (err) {
      console.error('Error loading workspace info:', err);
    }
  };

  // Update Workspace & User Info
  const handleUpdateWorkspaceInfo = async (newInfo) => {
    // 1. Instantly update React state & localStorage so UI never reverts
    setWorkspaceInfo(prev => {
      const nextUser = newInfo.userName !== undefined ? newInfo.userName : prev.userName;
      const nextWs = newInfo.workspaceName !== undefined ? newInfo.workspaceName : prev.workspaceName;
      try {
        if (nextUser) localStorage.setItem('status_user_name', nextUser);
        if (nextWs) localStorage.setItem('status_workspace_name', nextWs);
      } catch (e) {}
      return { workspaceName: nextWs, userName: nextUser };
    });

    // 2. Persist to server
    try {
      await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInfo)
      });
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: newInfo.userName,
          workspace_name: newInfo.workspaceName
        })
      });
    } catch (err) {
      console.error('Error updating workspace info:', err);
    }
  };

  useEffect(() => {
    loadWorkspaceInfo();
    loadSpaces();
    loadAllTasks();
    checkNotifications();
    loadAiHistory();
    const interval = setInterval(checkNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeListId) {
      loadTasks(activeListId);
    }
  }, [activeListId]);

  // Global Keyboard Shortcuts (Ctrl+K for Search, Ctrl+J for AI)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
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

  const handleUpdateSpace = async (spaceId, updates) => {
    try {
      await fetch(`/api/spaces/${spaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      loadSpaces();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSpace = async (spaceId) => {
    try {
      await fetch(`/api/spaces/${spaceId}`, { method: 'DELETE' });
      loadSpaces();
      loadTasks();
      loadAllTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateList = async (listId, updates) => {
    try {
      await fetch(`/api/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      loadSpaces();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
      loadSpaces();
      loadTasks();
      loadAllTasks();
      if (activeListId === listId) {
        setActiveListId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateList = async (listId) => {
    try {
      const res = await fetch(`/api/lists/${listId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      loadSpaces();
      loadAllTasks();
      if (data && data.newList && data.newList.id) {
        setActiveListId(data.newList.id);
        setActiveView('list');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Task Mutations
  const handleQuickAddTask = async (taskData, defaultStatus = 'NOT STARTED', defaultDueDate = null) => {
    try {
      let data = {};
      if (typeof taskData === 'string') {
        data = { name: taskData, status: defaultStatus, due_date: defaultDueDate };
      } else {
        data = taskData || {};
      }
      let targetList = data.list_id || activeListId;
      if (!targetList || targetList === 'all') {
        targetList = spaces[0]?.lists?.[0]?.id || '';
      }
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: targetList,
          name: data.name,
          description: data.description || '',
          status: data.status || defaultStatus || 'NOT STARTED',
          priority: data.priority || 'Normal',
          due_date: data.due_date || defaultDueDate || null
        })
      });
      loadTasks();
      loadAllTasks();
      loadSpaces();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const { attachments: updatedAtts, ...dbUpdates } = updates;
      if (Object.keys(dbUpdates).length > 0) {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbUpdates)
        });
      }
      loadTasks();
      loadAllTasks();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => ({ 
          ...prev, 
          ...updates,
          ...(updatedAtts !== undefined ? { attachments: updatedAtts } : {})
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTaskStatus = async (taskId, nextStatus) => {
    handleUpdateTask(taskId, { status: nextStatus });
  };

  const handleToggleSubtask = async (subtaskId, completed) => {
    try {
      await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      loadTasks();
      loadAllTasks();
      if (selectedTask) {
        const updatedSubs = (selectedTask.subtasks || []).map(s => 
          s.id === subtaskId ? { ...s, completed: completed ? 1 : 0 } : s
        );
        setSelectedTask(prev => ({ ...prev, subtasks: updatedSubs }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubtask = async (taskId, title) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const newSub = await res.json();
      loadTasks();
      loadAllTasks();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), newSub] }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      loadTasks();
      loadAllTasks();
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
      loadAllTasks();
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
      loadAllTasks();
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
  let activeSpaceName = spaces[0]?.name || 'Workspace';
  let activeListName = spaces[0]?.lists?.[0]?.name || 'Tasks';
  if (activeListId === 'all') {
    activeSpaceName = 'Workspace';
    activeListName = 'All Tasks';
  } else {
    for (const sp of spaces) {
      const foundList = sp.lists?.find(l => l.id === activeListId);
      if (foundList) {
        activeSpaceName = sp.name;
        activeListName = foundList.name;
        break;
      }
    }
  }

  // Filter tasks by search query
  const baseTasks = activeListId === 'all' ? allTasks : tasks;
  const filteredTasks = baseTasks.filter(t => {
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
        workspaceName={workspaceInfo.workspaceName}
        spaces={spaces}
        activeListId={activeListId}
        activeView={activeView}
        onSelectList={(listId) => {
          setActiveListId(listId);
          setActiveView('list');
        }}
        onSelectHome={() => setActiveView('home')}
        onSelectAllTasks={() => {
          setActiveListId('all');
          if (activeView === 'home') {
            setActiveView('list');
          }
        }}
        allTasksCount={allTasks.length}
        onCreateSpace={handleCreateSpace}
        onCreateList={handleCreateList}
        onUpdateSpace={handleUpdateSpace}
        onDeleteSpace={handleDeleteSpace}
        onUpdateList={handleUpdateList}
        onDeleteList={handleDeleteList}
        onDuplicateList={handleDuplicateList}
        onQuickAddTask={handleQuickAddTask}
        onOpenAISidebar={handleNewAiChat}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenBackupDataModal={() => setShowBackupModal(true)}
        aiChatHistory={aiChatHistory}
        activeAiSessionId={activeAiSessionId}
        onSelectAiSession={handleSelectAiSession}
        onNewAiChat={handleNewAiChat}
        onDeleteAiSession={handleDeleteAiSession}
      />

      {/* 2. Main Content Center */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header 
          spaceName={activeSpaceName}
          listName={activeListName}
          activeListId={activeListId}
          activeView={activeView}
          onSelectView={setActiveView}
          onOpenAISidebar={() => setShowAISidebar(true)}
          onOpenWallpaperModal={() => setShowWallpaperModal(true)}
          onOpenNotificationCenter={() => setShowNotificationCenter(prev => !prev)}
          onOpenPrintReport={(viewType) => setPrintConfig({ type: viewType || activeView || 'list' })}
          onOpenCustomFieldModal={() => setShowCustomFieldModal(true)}
          onOpenBackupDataModal={() => setShowBackupModal(true)}
          onQuickAddTask={() => handleQuickAddTask({ name: 'งานใหม่...', status: 'NOT STARTED' })}
          notificationCount={notifications.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          allTasks={allTasks}
          onSelectTask={setSelectedTask}
        />

        {/* View Routing */}
        <div className="flex-1 flex overflow-hidden">
          {activeView === 'home' && (
            <HomeView 
              workspaceName={workspaceInfo.workspaceName}
              userName={workspaceInfo.userName}
              onUpdateWorkspaceInfo={handleUpdateWorkspaceInfo}
              allTasks={allTasks}
              searchQuery={searchQuery}
              spaces={spaces}
              onSelectTask={setSelectedTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateTaskPriority={(taskId, priority) => handleUpdateTask(taskId, { priority })}
              onDeleteTask={handleDeleteTask}
              onCopyTask={(taskId, targetListId) => handleCopyTask(taskId, targetListId, true, true)}
              onOpenMoveCopy={(task) => {
                setTaskForMoveCopy(task);
                setShowMoveCopyModal(true);
              }}
              onOpenPrintSingleTask={(task) => setPrintConfig({ type: 'task', singleTask: task })}
              onQuickAddTask={handleQuickAddTask}
              onSelectList={(listId) => {
                setActiveListId(listId);
                setActiveView('list');
              }}
              onOpenAISidebar={() => setShowAISidebar(true)}
              onOpenWallpaperModal={() => setShowWallpaperModal(true)}
              onOpenBackupModal={() => setShowBackupModal(true)}
            />
          )}

          {activeView === 'list' && (
            <ListView 
              tasks={filteredTasks}
              fields={fields}
              onSelectTask={setSelectedTask}
              onUpdateTask={handleUpdateTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateTaskPriority={(taskId, priority) => handleUpdateTask(taskId, { priority })}
              onDeleteTask={handleDeleteTask}
              onCopyTask={(taskId, targetListId) => handleCopyTask(taskId, targetListId, true, true)}
              onOpenPrintSingleTask={(task) => setPrintConfig({ type: 'task', singleTask: task })}
              onQuickAddTask={handleQuickAddTask}
              onOpenMoveCopy={(task) => {
                setTaskForMoveCopy(task);
                setShowMoveCopyModal(true);
              }}
              onOpenAddColumn={() => setShowCustomFieldModal(true)}
              onToggleSubtask={handleToggleSubtask}
              onAddSubtask={handleAddSubtask}
            />
          )}

          {activeView === 'board' && (
            <BoardView 
              tasks={filteredTasks}
              onSelectTask={setSelectedTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateTaskPriority={(taskId, priority) => handleUpdateTask(taskId, { priority })}
              onDeleteTask={handleDeleteTask}
              onCopyTask={(taskId, targetListId) => handleCopyTask(taskId, targetListId, true, true)}
              onOpenPrintSingleTask={(task) => setPrintConfig({ type: 'task', singleTask: task })}
              onQuickAddTask={handleQuickAddTask}
              onOpenMoveCopy={(task) => {
                setTaskForMoveCopy(task);
                setShowMoveCopyModal(true);
              }}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView 
              tasks={filteredTasks}
              allTasks={allTasks}
              onSelectTask={setSelectedTask}
              onUpdateTask={handleUpdateTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onQuickAddTask={handleQuickAddTask}
              onOpenPrintReport={(viewType) => setPrintConfig({ type: viewType || 'calendar' })}
              activeListName={activeListName}
              activeListId={activeListId}
            />
          )}

          {activeView === 'matrix' && (
            <MatrixView 
              tasks={filteredTasks}
              allTasks={allTasks}
              onSelectTask={setSelectedTask}
              onUpdateTask={handleUpdateTask}
              activeListName={activeListName}
              activeListId={activeListId}
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
          listName={activeListName}
          spaceName={activeSpaceName}
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
        activeSessionId={activeAiSessionId}
        onSessionChange={setActiveAiSessionId}
        onHistoryUpdated={loadAiHistory}
        activeListId={activeListId}
        onDataChanged={() => {
          loadTasks();
          loadAllTasks();
          loadSpaces();
          checkNotifications();
        }}
        context={[activeSpaceName ? `Space: ${activeSpaceName}` : '', activeListName ? `List: ${activeListName}` : ''].filter(Boolean).join(', ')}
        onSelectTaskById={async (taskId) => {
          try {
            const res = await fetch(`/api/tasks/${taskId}`);
            if (res.ok) {
              const fullTask = await res.json();
              if (fullTask.list_id && fullTask.list_id !== activeListId) {
                setActiveListId(fullTask.list_id);
              }
              setSelectedTask(fullTask);
              return;
            }
          } catch (err) {
            console.error('Error fetching task details:', err);
          }
          const t = tasks.find(item => item.id === taskId) || allTasks.find(item => item.id === taskId);
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
        onDismissNotification={handleDismissNotification}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onSelectTaskById={async (taskId, listId) => {
          if (listId && listId !== activeListId) {
            setActiveListId(listId);
          }
          try {
            const res = await fetch(`/api/tasks/${taskId}`);
            if (res.ok) {
              const fullTask = await res.json();
              setSelectedTask(fullTask);
              return;
            }
          } catch (err) {
            console.error('Error fetching task details:', err);
          }
          const t = tasks.find(item => item.id === taskId) || allTasks.find(item => item.id === taskId);
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
        workspaceInfo={workspaceInfo}
        onUpdateWorkspaceInfo={handleUpdateWorkspaceInfo}
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
          tasks={(printConfig.type === 'home' || activeListId === 'all') ? allTasks : tasks}
          singleTask={printConfig.singleTask}
          listName={activeListName}
          spaceName={activeSpaceName}
          workspaceName={workspaceInfo.workspaceName}
          userName={workspaceInfo.userName}
          onClose={() => setPrintConfig(null)}
        />
      )}

      {/* 12. Backup & Data Management Modal */}
      <BackupDataModal 
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        activeListId={activeListId}
        activeListName={activeListName}
        onDataRestored={() => {
          loadSpaces();
          loadAllTasks();
          loadTasks();
        }}
      />
    </div>
  );
}
