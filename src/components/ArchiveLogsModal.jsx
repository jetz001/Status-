import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  X, 
  Search, 
  Download, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Folder,
  FileSpreadsheet
} from 'lucide-react';

export default function ArchiveLogsModal({ isOpen, onClose, onTasksChanged }) {
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveOption, setArchiveOption] = useState('7');
  const [isArchiving, setIsArchiving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchArchivedTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/tasks/archived');
      if (res.ok) {
        const data = await res.json();
        setArchivedTasks(data);
      }
    } catch (err) {
      console.error('Error fetching archived tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchArchivedTasks();
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestore = async (taskId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/tasks/${taskId}/restore`, {
        method: 'POST'
      });
      if (res.ok) {
        setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
        setMessage({ type: 'success', text: 'กู้คืนงานกลับสู่บอร์ดหลักเรียบร้อยแล้ว' });
        if (onTasksChanged) onTasksChanged();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการกู้คืนงาน' });
    }
  };

  const handleRunArchive = async () => {
    setIsArchiving(true);
    setMessage(null);
    try {
      const days = archiveOption === 'all' ? 'all' : parseInt(archiveOption, 10);
      const res = await fetch('http://localhost:3001/api/tasks/archive/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: days })
      });
      if (res.ok) {
        const result = await res.json();
        setMessage({ 
          type: 'success', 
          text: `จัดเก็บงานเสร็จสิ้นเข้าคลังเพิ่ม ${result.archivedCount || 0} งาน` 
        });
        await fetchArchivedTasks();
        if (onTasksChanged) onTasksChanged();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการจัดเก็บงาน' });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleExportCSV = () => {
    window.open('http://localhost:3001/api/tasks/archive/export-csv', '_blank');
  };

  const handleClearAll = async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะล้างงานทั้งหมดในคลังอย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }
    try {
      const res = await fetch('http://localhost:3001/api/tasks/archived/clear', {
        method: 'DELETE'
      });
      if (res.ok) {
        const result = await res.json();
        setArchivedTasks([]);
        setMessage({ type: 'success', text: `ล้างงานถาวรเรียบร้อยแล้ว (${result.deletedCount || 0} รายการ)` });
        if (onTasksChanged) onTasksChanged();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการล้างข้อมูล' });
    }
  };

  // Filter tasks by search query
  const query = searchQuery.trim().toLowerCase();
  const filteredTasks = archivedTasks.filter(t => {
    if (!query) return true;
    const name = (t.name || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    const space = (t.space_name || '').toLowerCase();
    const list = (t.list_name || '').toLowerCase();
    const assignee = (t.assignee || '').toLowerCase();
    return name.includes(query) || desc.includes(query) || space.includes(query) || list.includes(query) || assignee.includes(query);
  });

  const formatDateThai = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split(' ')[0].split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const thaiMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const thaiYear = (parseInt(y, 10) + 543) % 100;
        return `${parseInt(d, 10)} ${thaiMonths[parseInt(m, 10)] || m} ${thaiYear}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div 
        className="bg-[#18191b] border border-[#333538] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-gray-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2d2f34] flex items-center justify-between bg-[#151618]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Archive size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">คลังประวัติงานที่เสร็จแล้ว (Task Archive & Logs Sheet)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#282a2e] text-amber-300 border border-amber-500/30">
                  {archivedTasks.length} รายการ
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                เก็บข้อมูลงานที่เสร็จสิ้นแล้วเพื่อลดการบวมของข้อมูลหลัก ป้องกันแอปหน่วง และสามารถกู้คืนหรือส่งออกได้ตลอดเวลา
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#25272a] rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Notification / Notice */}
        {message && (
          <div className={`px-5 py-2 text-xs flex items-center justify-between border-b ${
            message.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
          }`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Toolbar: Search, Manual Archive Trigger, Export CSV, Refresh */}
        <div className="px-5 py-2.5 border-b border-[#26282c] bg-[#1a1b1e] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่องาน, ผู้รับผิดชอบ, Space..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#121315] border border-[#333538] rounded-md text-xs text-white placeholder-gray-500 outline-none focus:border-[#7b68ee]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {/* Archive Run dropdown & trigger */}
            <div className="flex items-center bg-[#24262a] border border-[#383a3f] rounded-md overflow-hidden p-0.5">
              <span className="text-[11px] text-gray-400 px-2">ตัดงาน Completed:</span>
              <select 
                value={archiveOption}
                onChange={(e) => setArchiveOption(e.target.value)}
                className="bg-[#18191b] text-gray-200 text-xs px-2 py-1 outline-none border-r border-[#383a3f]"
              >
                <option value="7">เกิน 7 วัน</option>
                <option value="14">เกิน 14 วัน</option>
                <option value="30">เกิน 30 วัน</option>
                <option value="all">ทั้งหมดที่เสร็จแล้ว</option>
              </select>
              <button 
                onClick={handleRunArchive}
                disabled={isArchiving}
                className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-600 disabled:opacity-50 text-white font-medium text-xs transition flex items-center space-x-1"
                title="ย้ายงานที่มีสถานะเสร็จสิ้นเข้าคลังประวัติทันที"
              >
                <Archive size={12} />
                <span>{isArchiving ? 'กำลังจัดเก็บ...' : 'จัดเก็บเดี๋ยวนี้'}</span>
              </button>
            </div>

            {/* Export to CSV/Excel */}
            <button 
              onClick={handleExportCSV}
              disabled={archivedTasks.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#25272a] hover:bg-[#2f3136] disabled:opacity-40 text-emerald-400 border border-emerald-500/30 rounded-md font-medium transition cursor-pointer"
              title="ส่งออกรายการทั้งหมดเป็นไฟล์ CSV (เปิดใน Excel ได้ภาษาไทยไม่เพี้ยน)"
            >
              <FileSpreadsheet size={14} />
              <span>Export Excel / CSV</span>
            </button>

            {/* Refresh */}
            <button 
              onClick={fetchArchivedTasks}
              disabled={loading}
              className="p-1.5 hover:bg-[#2a2c30] text-gray-400 hover:text-white rounded border border-[#333538] transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Clear All Permanently */}
            {archivedTasks.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 rounded-md transition text-xs"
                title="ลบงานที่อยู่ในคลังนี้ทิ้งถาวรเพื่อคืนพื้นที่หน่วยความจำ"
              >
                <Trash2 size={13} />
                <span className="hidden md:inline">ล้างคลังถาวร</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Table (Logs Sheet) */}
        <div className="flex-1 overflow-auto bg-[#141517]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
              <RefreshCw size={24} className="animate-spin text-amber-500" />
              <p className="text-xs">กำลังโหลดรายการงานจากคลังประวัติ...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#1e2024] border border-[#2d2f34] flex items-center justify-center text-gray-600">
                <Archive size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-300">ไม่มีงานในคลังประวัติ</p>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  {searchQuery 
                    ? 'ไม่พบงานที่ตรงกับการค้นหา ลองเปลี่ยนคำค้นหา' 
                    : 'เมื่อมีงานสถานะเสร็จสิ้น (Completed) เกิน 7 วัน ระบบจะทยอยย้ายเข้ามาจัดเก็บที่นี่โดยอัตโนมัติ เพื่อให้หน้าบอร์ดหลักทำงานได้อย่างรวดเร็ว'}
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#1e2024] border-b border-[#2d2f34] text-gray-400 font-semibold z-10 select-none">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">สถานะ</th>
                  <th className="py-2.5 px-3 min-w-[220px]">ชื่องาน</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Space / List</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">ผู้รับผิดชอบ</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">กำหนดส่งเดิม</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">วันที่จัดเก็บ</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">งานย่อย</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232529]">
                {filteredTasks.map(task => {
                  const subCount = task.subtasks ? task.subtasks.length : 0;
                  const completedSubs = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;

                  return (
                    <tr key={task.id} className="hover:bg-[#1a1b1f] transition group">
                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        <CheckCircle2 size={16} className="text-emerald-500 inline-block" />
                      </td>

                      {/* Name & Desc */}
                      <td className="py-2 px-3 max-w-[280px]">
                        <div className="font-medium text-gray-300 line-through truncate" title={task.name}>
                          {task.name}
                        </div>
                        {task.description && (
                          <div className="text-[10px] text-gray-500 truncate mt-0.5" title={task.description}>
                            {task.description}
                          </div>
                        )}
                      </td>

                      {/* Space & List */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: task.list_color || task.space_color || '#7b68ee' }}
                          />
                          <span className="text-gray-300">{task.space_name || 'General'}</span>
                          <span className="text-gray-500">›</span>
                          <span className="text-gray-400 font-medium">{task.list_name || 'Tasks'}</span>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {task.assignee ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#222428] border border-[#2f3136] text-[11px] text-gray-300">
                            <span>👤</span>
                            <span>{task.assignee}</span>
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Due date */}
                      <td className="py-2 px-3 whitespace-nowrap text-gray-400">
                        {task.due_date ? formatDateThai(task.due_date) : '—'}
                      </td>

                      {/* Archived date */}
                      <td className="py-2 px-3 whitespace-nowrap text-amber-300/80">
                        {task.archived_at ? formatDateThai(task.archived_at) : '—'}
                      </td>

                      {/* Subtasks */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {subCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium">
                            {completedSubs}/{subCount}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Actions: Restore */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleRestore(task.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#252830] hover:bg-[#7b68ee]/20 text-gray-300 hover:text-white border border-[#3b3d45] hover:border-[#7b68ee]/60 transition text-xs font-medium cursor-pointer"
                          title="กู้คืนงานนี้กลับไปยังบอร์ดหลัก"
                        >
                          <RotateCcw size={12} className="text-cyan-400" />
                          <span>กู้คืนงาน</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#26282c] bg-[#17181a] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <span>แสดง {filteredTasks.length} จากทั้งหมด {archivedTasks.length} รายการ</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-[#25272a] hover:bg-[#2e3034] text-white rounded-md transition font-medium"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
