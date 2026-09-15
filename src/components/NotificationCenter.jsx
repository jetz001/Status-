import React from 'react';
import { Bell, AlertTriangle, Clock, X, ExternalLink } from 'lucide-react';

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  onSelectTaskById
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed top-14 right-16 w-80 bg-[#1e1f21] border border-[#383a3e] rounded-lg shadow-2xl z-50 overflow-hidden text-xs select-none">
      {/* Header */}
      <div className="p-3 border-b border-[#333538] flex items-center justify-between bg-[#18191b]">
        <div className="flex items-center space-x-2 text-white font-bold">
          <Bell size={14} className="text-purple-400" />
          <span>การแจ้งเตือนงาน (Notifications)</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d]"
        >
          <X size={15} />
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[#2a2b2d] p-1">
        {notifications.length > 0 ? (
          notifications.map(notif => {
            const isOverdue = notif.type === 'overdue';
            return (
              <div 
                key={notif.id}
                onClick={() => {
                  onSelectTaskById(notif.taskId);
                  onClose();
                }}
                className="p-2.5 hover:bg-[#25272a] cursor-pointer rounded transition space-y-1 group"
              >
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
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  {notif.message}
                </p>
                <span className="text-[10px] text-gray-500 block pt-0.5">
                  คลิกเพื่อเปิดดูรายละเอียดงาน →
                </span>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-gray-500">
            <Bell size={20} className="mx-auto mb-1 opacity-40" />
            <p>ไม่มีงานที่ค้างเตือนในขณะนี้</p>
          </div>
        )}
      </div>
    </div>
  );
}
