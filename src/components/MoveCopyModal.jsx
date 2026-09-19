import React, { useState } from 'react';
import { X, ArrowRightLeft, Copy, Folder } from 'lucide-react';

export default function MoveCopyModal({
  isOpen,
  onClose,
  task,
  spaces = [],
  onMoveTask,
  onCopyTask
}) {
  const [actionType, setActionType] = useState('move'); // 'move' or 'copy'
  const [targetSpaceId, setTargetSpaceId] = useState(spaces[0]?.id || '');
  const [targetListId, setTargetListId] = useState('');
  const [copySubtasks, setCopySubtasks] = useState(true);
  const [copyAttachments, setCopyAttachments] = useState(true);

  if (!isOpen || !task) return null;

  const currentSpace = spaces.find(s => s.id === targetSpaceId) || spaces[0];
  const lists = currentSpace?.lists || [];

  const effectiveListId = targetListId || lists[0]?.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!effectiveListId) return;

    if (actionType === 'move') {
      onMoveTask(task.id, effectiveListId);
    } else {
      onCopyTask(task.id, effectiveListId, copySubtasks, copyAttachments);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 select-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#222427] border border-[#383a3e] rounded-xl w-[440px] max-w-full shadow-2xl p-5 space-y-4 text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#333538] pb-3">
          <div className="flex items-center space-x-2">
            {actionType === 'move' ? (
              <ArrowRightLeft size={16} className="text-purple-400" />
            ) : (
              <Copy size={16} className="text-blue-400" />
            )}
            <h3 className="font-bold text-white text-sm">ย้ายหรือคัดลอกงานข้ามโปรเจกต์</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        {/* Task Title preview */}
        <div className="p-2.5 bg-[#18191b] rounded border border-[#2e3034]">
          <span className="text-[10px] text-gray-400 font-semibold block uppercase">งานที่จะดำเนินการ:</span>
          <span className="font-medium text-white truncate block pt-0.5">{task.name}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Choice Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#18191b] p-1 rounded-lg border border-[#2e3034]">
            <button
              type="button"
              onClick={() => setActionType('move')}
              className={`py-1.5 rounded font-semibold transition ${
                actionType === 'move' ? 'bg-[#7b68ee] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              ย้ายงาน (Move)
            </button>
            <button
              type="button"
              onClick={() => setActionType('copy')}
              className={`py-1.5 rounded font-semibold transition ${
                actionType === 'copy' ? 'bg-[#7b68ee] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              คัดลอกงาน (Copy)
            </button>
          </div>

          {/* Space Selection */}
          <div className="space-y-1">
            <label className="text-gray-400 font-medium">เลือก Space ปลายทาง</label>
            <select
              value={targetSpaceId}
              onChange={(e) => {
                setTargetSpaceId(e.target.value);
                const s = spaces.find(sp => sp.id === e.target.value);
                if (s?.lists?.[0]) setTargetListId(s.lists[0].id);
              }}
              className="w-full bg-[#18191b] border border-[#383a3e] rounded p-2 text-white outline-none"
            >
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* List Selection */}
          <div className="space-y-1">
            <label className="text-gray-400 font-medium">เลือก List ปลายทาง</label>
            <select
              value={effectiveListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="w-full bg-[#18191b] border border-[#383a3e] rounded p-2 text-white outline-none"
            >
              {lists.map(l => (
                <option key={l.id} value={l.id}># {l.name}</option>
              ))}
            </select>
          </div>

          {/* Copy options if action is copy */}
          {actionType === 'copy' && (
            <div className="space-y-2 pt-1 border-t border-[#2e3034]">
              <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copySubtasks}
                  onChange={(e) => setCopySubtasks(e.target.checked)}
                  className="rounded accent-[#7b68ee]"
                />
                <span>คัดลอกขั้นตอนซับทาสก์ (Subtasks) ไปด้วย</span>
              </label>
              <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyAttachments}
                  onChange={(e) => setCopyAttachments(e.target.checked)}
                  className="rounded accent-[#7b68ee]"
                />
                <span>คัดลอกรูปภาพแนบ (Attachments) ไปด้วย</span>
              </label>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-gray-300 hover:bg-[#333538] font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-semibold rounded shadow transition"
            >
              {actionType === 'move' ? 'ยืนยันการย้ายงาน' : 'ยืนยันการทำซ้ำงาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
