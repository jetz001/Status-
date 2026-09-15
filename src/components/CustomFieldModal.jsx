import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export default function CustomFieldModal({
  isOpen,
  onClose,
  listId,
  onAddCustomField
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [optionsStr, setOptionsStr] = useState('Critical, Major, Minor, Low');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    let options = [];
    if (type === 'select') {
      options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
    }

    onAddCustomField(listId, {
      name: name.trim(),
      type,
      options
    });
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 select-none text-xs">
      <div className="bg-[#222427] border border-[#383a3e] rounded-xl w-[400px] max-w-full shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#333538] pb-3">
          <h3 className="font-bold text-white text-sm">เพิ่มคอลัมน์ใหม่ (Custom Column)</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-gray-300 font-medium">ชื่อคอลัมน์</label>
            <input 
              type="text"
              placeholder="เช่น Tester Assigned, Bug ID, Client..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded text-white outline-none focus:border-[#7b68ee]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-300 font-medium">ชนิดข้อมูล (Column Type)</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded text-white outline-none"
            >
              <option value="text">ข้อความทั่วไป (Text)</option>
              <option value="number">ตัวเลข (Number)</option>
              <option value="date">วันที่ (Date)</option>
              <option value="select">ดรอปดาวน์เลือกค่า (Dropdown Select)</option>
            </select>
          </div>

          {type === 'select' && (
            <div className="space-y-1">
              <label className="text-gray-300 font-medium">ตัวเลือก (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input 
                type="text"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
                className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded text-white outline-none"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-gray-300 hover:bg-[#333538]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-semibold rounded shadow transition"
            >
              สร้างคอลัมน์
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
