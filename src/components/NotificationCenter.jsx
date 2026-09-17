import React, { useEffect } from 'react';
import { Bell, AlertTriangle, Clock, X, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  onSelectTaskById
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overdueCount = notifications.filter(n => n.type === 'overdue').length;
  const dueSoonCount = notifications.filter(n => n.type === 'due_soon').length;

  return (
    <>
      {/* Backdrop: Click outside to close */}
      <div 
        className="fixed inset-0 z-40 bg-black/20" 
        onClick={onClose} 
      />

      {/* Dropdown Panel */}
      <div className="fixed top-13 right-4 sm:right-14 w-88 max-w-[calc(100vw-2rem)] bg-[#1a1b1e] border border-[#383a3e] rounded-xl shadow-2xl z-50 overflow-hidden text-xs select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 border-b border-[#2e3033] flex items-center justify-between bg-[#141517]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Bell size={15} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xs">การแจ้งเตือนงาน</h3>
              <p className="text-[10px] text-gray-400">
                {notifications.length > 0 
                  ? `พบ ${notifications.length} รายการที่ต้องติดตาม`
                  : 'ไม่มีงานค้างเตือน'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#2a2b2d] transition"
            title="ปิด (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick summary pill tags */}
        {notifications.length > 0 && (
          <div className="flex items-center space-x-2 px-3.5 py-2 bg-[#18191c] border-b border-[#282a2d] text-[10px]">
            {overdueCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold border border-red-500/30 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                <span>เกินกำหนด {overdueCount}</span>
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                ใกล้ถึงกำหนด {dueSoonCount}
              </span>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-[#26282b] p-1.5">
          {notifications.length > 0 ? (
            notifications.map(notif => {
              const isOverdue = notif.type === 'overdue';
              return (
                <div 
                  key={notif.id}
                  onClick={() => {
                    onSelectTaskById(notif.taskId, notif.listId);
                    onClose();
                  }}
                  className="p-3 hover:bg-[#24262a] cursor-pointer rounded-lg transition space-y-1.5 group border border-transparent hover:border-[#383a3e]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-semibold">
                      {isOverdue ? (
                        <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                      ) : (
                        <Clock size={14} className="text-amber-400 flex-shrink-0" />
                      )}
                      <span className={isOverdue ? 'text-red-300' : 'text-amber-300'}>
                        {notif.title}
                      </span>
                    </div>

                    {notif.listName && (
                      <span className="px-1.5 py-0.5 rounded bg-[#2a2b2d] text-gray-400 text-[9px]">
                        {notif.listName}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-200 text-xs font-medium leading-relaxed group-hover:text-cyan-300 transition">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Calendar size={11} className="text-gray-500" />
                      <span>{notif.date}</span>
                    </span>
                    <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition flex items-center space-x-0.5 font-medium">
                      <span>เปิดดูงาน</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 px-4 text-center text-gray-400 space-y-2">
              <CheckCircle2 size={28} className="mx-auto text-emerald-400/70" />
              <div>
                <p className="font-semibold text-gray-300 text-xs">ไม่มีงานค้างเตือน</p>
                <p className="text-[11px] text-gray-500 mt-0.5">งานทั้งหมดส่งตรงเวลา หรือยังไม่ถึงกำหนดส่ง</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
