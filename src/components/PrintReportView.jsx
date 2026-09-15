import React, { useEffect } from 'react';
import { Printer, X, CheckSquare, Calendar, User, Flag } from 'lucide-react';

export default function PrintReportView({
  type = 'list', // 'list' or 'task'
  tasks = [],
  singleTask = null,
  listName = 'IQA26',
  spaceName = 'Team Space',
  onClose
}) {
  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-white text-black z-50 overflow-y-auto print:p-0 print:m-0">
      {/* On-screen control bar (Hidden during actual print) */}
      <div className="sticky top-0 bg-[#1e1f21] text-white p-3 flex items-center justify-between border-b border-[#333538] shadow-md no-print text-xs">
        <div className="flex items-center space-x-2 font-bold">
          <Printer size={16} className="text-blue-400" />
          <span>พรีวิวเอกสารสำหรับสั่งพิมพ์หรือบันทึกเป็น PDF (Print Preview)</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded shadow transition flex items-center space-x-1.5"
          >
            <Printer size={14} />
            <span>สั่งพิมพ์ / บันทึก PDF (Print Now)</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition flex items-center space-x-1"
          >
            <X size={14} />
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="max-w-4xl mx-auto p-8 font-['Noto_Sans_Thai',_sans-serif] print-page space-y-6">
        {/* ============================================================ */}
        {/* VIEW 1: FULL PROJECT LIST REPORT */}
        {/* ============================================================ */}
        {type === 'list' && (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="border-b-2 border-gray-800 pb-4 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  รายงานสรุปสถานะโครงการ (Project Status Report)
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  พื้นที่งาน: <span className="font-semibold text-gray-800">{spaceName}</span> &gt; ลิสต์งาน: <span className="font-semibold text-gray-800">{listName}</span>
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>วันที่พิมพ์: <span className="font-medium text-gray-800">{currentDate}</span></p>
                <p>จำนวนงานทั้งหมด: <span className="font-bold text-gray-800">{tasks.length} รายการ</span></p>
              </div>
            </div>

            {/* Statistics Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-gray-300 rounded p-3 bg-gray-50">
                <span className="text-xs text-gray-600 block">งานที่เสร็จสมบูรณ์ (COMPLETED)</span>
                <span className="text-xl font-bold text-emerald-600">
                  {tasks.filter(t => t.status === 'COMPLETED').length} รายการ
                </span>
              </div>
              <div className="border border-gray-300 rounded p-3 bg-gray-50">
                <span className="text-xs text-gray-600 block">งานที่กำลังดำเนินการ (IN PROGRESS)</span>
                <span className="text-xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'IN PROGRESS').length} รายการ
                </span>
              </div>
              <div className="border border-gray-300 rounded p-3 bg-gray-50">
                <span className="text-xs text-gray-600 block">งานที่ยังไม่เริ่ม (NOT STARTED)</span>
                <span className="text-xl font-bold text-red-600">
                  {tasks.filter(t => t.status === 'NOT STARTED').length} รายการ
                </span>
              </div>
            </div>

            {/* Tasks Table */}
            <table className="w-full text-left text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                  <th className="p-2 border-r border-gray-300 w-10 text-center">ลำดับ</th>
                  <th className="p-2 border-r border-gray-300">ชื่องาน (Task Name)</th>
                  <th className="p-2 border-r border-gray-300 w-28 text-center">สถานะ</th>
                  <th className="p-2 border-r border-gray-300 w-20 text-center">ความสำคัญ</th>
                  <th className="p-2 border-r border-gray-300 w-24 text-center">กำหนดส่ง</th>
                  <th className="p-2 border-r border-gray-300 w-20 text-center">ผู้รับผิดชอบ</th>
                  <th className="p-2 w-24 text-center">ซับทาสก์</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, idx) => {
                  const completedSubs = (t.subtasks || []).filter(s => s.completed).length;
                  const totalSubs = (t.subtasks || []).length;

                  return (
                    <tr key={t.id} className="border-b border-gray-200 even:bg-gray-50/60">
                      <td className="p-2 border-r border-gray-300 text-center font-medium text-gray-600">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-gray-300 font-semibold text-gray-900">
                        {t.name}
                        {t.description && (
                          <span className="block text-[11px] text-gray-500 font-normal pt-0.5 truncate max-w-sm">
                            {t.description}
                          </span>
                        )}
                      </td>
                      <td className="p-2 border-r border-gray-300 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          t.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-2 border-r border-gray-300 text-center font-medium text-gray-700">
                        {t.priority}
                      </td>
                      <td className="p-2 border-r border-gray-300 text-center text-gray-700">
                        {t.due_date || '-'}
                      </td>
                      <td className="p-2 border-r border-gray-300 text-center font-semibold text-gray-800">
                        {t.assignee || 'JM'}
                      </td>
                      <td className="p-2 text-center text-gray-600 font-medium">
                        {totalSubs > 0 ? `${completedSubs}/${totalSubs}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: SINGLE TASK DETAIL SHEET */}
        {/* ============================================================ */}
        {type === 'task' && singleTask && (
          <div className="space-y-6">
            {/* Sheet Header */}
            <div className="border-b-2 border-gray-800 pb-3 flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">เอกสารคำสั่งและรายละเอียดงาน (Task Sheet)</span>
                <h1 className="text-xl font-black text-gray-900 mt-1">
                  {singleTask.name}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  โครงการ: {listName} | รหัสงาน: {singleTask.id}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded text-xs font-bold ${
                  singleTask.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  singleTask.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {singleTask.status}
                </span>
                <p className="text-[11px] text-gray-500 mt-2">พิมพ์เมื่อ: {currentDate}</p>
              </div>
            </div>

            {/* Task Info Grid */}
            <div className="grid grid-cols-3 gap-4 border border-gray-300 rounded p-3 bg-gray-50 text-xs">
              <div>
                <span className="text-gray-500 block font-medium">ผู้รับผิดชอบ (Assignee)</span>
                <span className="font-bold text-gray-900 text-sm">{singleTask.assignee || 'JM'}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">ระดับความสำคัญ (Priority)</span>
                <span className="font-bold text-gray-900 text-sm">{singleTask.priority}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">วันกำหนดส่ง (Due Date)</span>
                <span className="font-bold text-gray-900 text-sm">{singleTask.due_date || 'ไม่ระบุ'}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-gray-800 border-b border-gray-300 pb-1">
                รายละเอียดและวัตถุประสงค์ (Description)
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap p-3 bg-gray-50 border border-gray-200 rounded">
                {singleTask.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </p>
            </div>

            {/* Subtasks Checklist */}
            {singleTask.subtasks && singleTask.subtasks.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-gray-800 border-b border-gray-300 pb-1">
                  ขั้นตอนย่อยที่ต้องดำเนินการ (Subtasks Checklist)
                </h3>
                <div className="space-y-1.5">
                  {singleTask.subtasks.map((st, i) => (
                    <div key={st.id || i} className="flex items-center space-x-2 text-xs text-gray-800">
                      <input 
                        type="checkbox" 
                        readOnly 
                        checked={!!st.completed} 
                        className="w-4 h-4 rounded border-gray-400"
                      />
                      <span className={st.completed ? 'line-through text-gray-500' : 'font-medium'}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments Images */}
            {singleTask.attachments && singleTask.attachments.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="font-bold text-sm text-gray-800 border-b border-gray-300 pb-1">
                  รูปภาพประกอบงาน (Attached Images)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {singleTask.attachments.map(att => (
                    <div key={att.id} className="border border-gray-300 rounded p-1">
                      <img 
                        src={att.url} 
                        alt={att.original_name} 
                        className="w-full h-48 object-contain rounded" 
                      />
                      <span className="text-[10px] text-gray-500 block text-center pt-1 truncate">
                        {att.original_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
