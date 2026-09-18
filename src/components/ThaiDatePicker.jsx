import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check, X, RotateCw } from 'lucide-react';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export function formatToDMY(isoStr) {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const dNum = parseInt(d, 10);
    const mNum = parseInt(m, 10);
    return `${dNum} ${THAI_MONTHS_SHORT[mNum - 1] || m} ${y}`;
  }
  return isoStr;
}

export function formatToDMYNumeric(isoStr) {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return isoStr;
}

export function parseDMYToISO(dmyStr) {
  if (!dmyStr) return null;
  const match = dmyStr.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${y}-${m}-${d}`;
  }
  return null;
}

export default function ThaiDatePicker({
  value,
  onChange,
  onClose,
  showRecurring = false,
  recurringRule = null,
  onUpdateRecurring = null
}) {
  const initialDate = value ? new Date(value) : new Date();
  const safeDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [calYear, setCalYear] = useState(safeDate.getFullYear());
  const [calMonth, setCalMonth] = useState(safeDate.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(value || '');
  const [manualInput, setManualInput] = useState(formatToDMYNumeric(value || ''));

  useEffect(() => {
    setSelectedDate(value || '');
    setManualInput(formatToDMYNumeric(value || ''));
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      }
    }
  }, [value]);

  const todayIso = new Date().toISOString().split('T')[0];

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(iso);
    setManualInput(formatToDMYNumeric(iso));
  };

  const handleQuickPick = (iso) => {
    setSelectedDate(iso || '');
    setManualInput(formatToDMYNumeric(iso || ''));
    if (iso) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      }
    }
  };

  const handleManualChange = (e) => {
    const text = e.target.value;
    setManualInput(text);
    const parsed = parseDMYToISO(text);
    if (parsed) {
      setSelectedDate(parsed);
      const d = new Date(parsed);
      if (!isNaN(d.getTime())) {
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      }
    }
  };

  const handleSave = (e) => {
    e.stopPropagation();
    onChange(selectedDate || null);
    if (onClose) onClose();
  };

  // Calendar grid calculation
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(calYear, calMonth, 1).getDay();

  const daysArray = [];
  for (let i = 0; i < firstDayWeekday; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  // Active recurring state
  let parsedRule = null;
  try {
    parsedRule = recurringRule ? (typeof recurringRule === 'string' ? JSON.parse(recurringRule) : recurringRule) : null;
  } catch (e) {}

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="p-3 bg-[#1e2023] text-gray-200 rounded-lg shadow-2xl border border-[#383a3e] select-none text-xs w-[280px] space-y-2.5"
    >
      {/* Header Info: วัน เดือน ปี */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2f34]">
        <div className="flex items-center space-x-1.5 font-bold text-gray-300">
          <Calendar size={13} className="text-purple-400" />
          <span>กำหนดส่ง (วัน / เดือน / ปี)</span>
        </div>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-0.5 rounded transition"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Quick Date Shortcuts */}
      <div className="grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={() => handleQuickPick(todayIso)}
          className={`py-1 rounded text-center text-[10px] font-medium transition ${
            selectedDate === todayIso 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold' 
              : 'bg-[#26282d] hover:bg-[#32343a] text-amber-300/90'
          }`}
        >
          วันนี้
        </button>
        <button
          type="button"
          onClick={() => {
            const tom = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            handleQuickPick(tom);
          }}
          className="py-1 rounded text-center text-[10px] font-medium bg-[#26282d] hover:bg-[#32343a] text-blue-300 transition"
        >
          พรุ่งนี้
        </button>
        <button
          type="button"
          onClick={() => {
            const nextWeek = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
            handleQuickPick(nextWeek);
          }}
          className="py-1 rounded text-center text-[10px] font-medium bg-[#26282d] hover:bg-[#32343a] text-purple-300 transition"
        >
          +7 วัน
        </button>
        <button
          type="button"
          onClick={() => handleQuickPick(null)}
          className="py-1 rounded text-center text-[10px] font-medium bg-[#26282d] hover:bg-red-950/40 text-red-400 transition"
        >
          ล้าง
        </button>
      </div>

      {/* Direct Day / Month / Year text box */}
      <div className="flex items-center space-x-1.5 pt-0.5">
        <div className="flex-1 relative">
          <input
            type="text"
            value={manualInput}
            onChange={handleManualChange}
            placeholder="วว/ดด/ปปปป (เช่น 22/09/2026)"
            className="w-full px-2 py-1 bg-[#141517] border border-[#333538] rounded text-white text-[11px] outline-none font-mono focus:border-[#7b68ee] text-center"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1 bg-[#7b68ee] hover:bg-[#6852e6] text-white rounded font-bold text-[11px] transition shadow-sm flex items-center space-x-1"
        >
          <Check size={12} />
          <span>บันทึก</span>
        </button>
      </div>

      {/* Thai Calendar Month Navigation */}
      <div className="flex items-center justify-between pt-1 border-t border-[#2d2f34]">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 hover:bg-[#2e3035] rounded text-gray-400 hover:text-white transition"
          title="เดือนก่อนหน้า"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="font-bold text-gray-200 text-[11px]">
          {THAI_MONTHS_FULL[calMonth]} {calYear} <span className="text-gray-500 font-normal">({calYear + 543})</span>
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 hover:bg-[#2e3035] rounded text-gray-400 hover:text-white transition"
          title="เดือนถัดไป"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-gray-400 pb-0.5">
        {THAI_DAYS.map((day, idx) => (
          <div key={day} className={idx === 0 ? 'text-red-400/80' : ''}>
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {daysArray.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="w-8 h-7" />;
          }

          const currentIso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedDate === currentIso;
          const isToday = currentIso === todayIso;

          let btnClass = 'text-gray-200 hover:bg-[#2c2e33]';
          if (isSelected) {
            btnClass = 'bg-[#7b68ee] text-white font-bold shadow-md';
          } else if (isToday) {
            btnClass = 'border border-amber-400 text-amber-300 font-bold bg-amber-950/20';
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={`w-8 h-7 rounded text-[11px] flex items-center justify-center transition ${btnClass}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected Date Summary */}
      {selectedDate && (
        <div className="text-[10px] text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2 py-1 rounded text-center font-medium">
          วันกำหนดส่ง: <strong>{formatToDMY(selectedDate)}</strong> ({formatToDMYNumeric(selectedDate)})
        </div>
      )}

      {/* Optional Recurring Task Settings */}
      {showRecurring && onUpdateRecurring && (
        <div className="pt-2 border-t border-[#2d2f34] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
            <span className="flex items-center space-x-1">
              <RotateCw size={11} className="text-purple-400" />
              <span>การทำซ้ำ (Recurring Tasks)</span>
            </span>
          </div>

          <select
            value={parsedRule?.type || 'none'}
            onChange={(e) => {
              const type = e.target.value;
              if (type === 'none') {
                onUpdateRecurring(null);
              } else {
                const day = selectedDate ? parseInt(selectedDate.split('-')[2], 10) : 1;
                onUpdateRecurring({ type, day });
              }
            }}
            className="w-full px-2 py-1 bg-[#141517] border border-[#333538] rounded text-white text-[11px] outline-none cursor-pointer"
          >
            <option value="none">ไม่ทำซ้ำ (รอบเดียวจบ)</option>
            <option value="daily">ทุกวัน (Daily)</option>
            <option value="weekly">ทุกสัปดาห์ (Weekly)</option>
            <option value="monthly">ทุกเดือน (Monthly)</option>
            <option value="monthly_date">ทุกวันที่... ของเดือน (Monthly on Day X)</option>
            <option value="half_yearly">ทุกครึ่งปี (ทุก 6 เดือน)</option>
            <option value="yearly">ทุกปี (Yearly)</option>
          </select>

          {parsedRule?.type === 'monthly_date' && (
            <div className="flex items-center space-x-2 pt-0.5 text-[11px] text-gray-300">
              <span>ทุกวันที่:</span>
              <input
                type="number"
                min="1"
                max="31"
                value={parsedRule.day || 1}
                onChange={(e) => {
                  const val = Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1));
                  onUpdateRecurring({ type: 'monthly_date', day: val });
                }}
                className="w-14 px-1.5 py-0.5 bg-[#141517] border border-[#333538] rounded text-white text-center outline-none text-[11px]"
              />
              <span className="text-gray-400">ของทุกเดือน</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
