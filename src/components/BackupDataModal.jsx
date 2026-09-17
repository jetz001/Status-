import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Clock, 
  FileSpreadsheet, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  HardDrive
} from 'lucide-react';

export default function BackupDataModal({
  isOpen,
  onClose,
  activeListId,
  activeListName = 'IQA26',
  onDataRestored
}) {
  const [activeTab, setActiveTab] = useState('backups'); // 'backups' | 'export' | 'import'
  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backupNote, setBackupNote] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  // Import State
  const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [restoreConfirmFile, setRestoreConfirmFile] = useState(null);

  const fileInputRef = useRef(null);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      setBackups(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  // Create Instant Backup
  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: backupNote.trim() || 'manual' })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `สร้างจุดสำรองข้อมูลสำเร็จ: ${data.filename}` });
        setBackupNote('');
        fetchBackups();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'ไม่สามารถสร้างจุดสำรองข้อมูลได้' });
    } finally {
      setIsLoading(false);
    }
  };

  // Restore from rolling backup file
  const handleRestoreFromList = async (filename) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, mode: 'replace' })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `กู้คืนข้อมูลสำเร็จ (${data.restoredTasks} งาน)` });
        setRestoreConfirmFile(null);
        if (onDataRestored) onDataRestored();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle File Selection for Import
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
    };
    reader.readAsText(file);
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!selectedFile || !fileContent) return;
    setIsLoading(true);

    try {
      if (selectedFile.name.endsWith('.csv')) {
        const res = await fetch('/api/import/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listId: activeListId, csvText: fileContent })
        });
        const data = await res.json();
        if (data.success) {
          setStatusMessage({ type: 'success', text: `นำเข้าข้อมูลจาก CSV สำเร็จ ${data.count} งาน!` });
          setSelectedFile(null);
          setFileContent(null);
          if (onDataRestored) onDataRestored();
        }
      } else if (selectedFile.name.endsWith('.json')) {
        const parsed = JSON.parse(fileContent);
        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupData: parsed, mode: importMode })
        });
        const data = await res.json();
        if (data.success) {
          setStatusMessage({ type: 'success', text: `นำเข้า/กู้คืนข้อมูลสำเร็จ (${data.restoredTasks} งาน)!` });
          setSelectedFile(null);
          setFileContent(null);
          if (onDataRestored) onDataRestored();
        }
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการนำเข้าไฟล์: ' + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none text-xs">
      <div className="bg-[#1e1f21] border border-[#383a3e] rounded-xl w-[700px] max-w-full h-[600px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#333538] flex items-center justify-between bg-[#18191b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Database size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Backup & Data Center (ศูนย์จัดการและสำรองข้อมูล)</h3>
              <p className="text-[11px] text-gray-400">สำรองฐานข้อมูลรายวันอัตโนมัติ ส่งออก Excel/CSV และกู้คืนข้อมูล</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d]">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#2e3034] bg-[#161719] px-4">
          <button
            onClick={() => setActiveTab('backups')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'backups' ? 'border-[#7b68ee] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock size={14} />
            <span>จุดสำรองข้อมูลอัตโนมัติ ({backups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'export' ? 'border-[#7b68ee] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Download size={14} />
            <span>ส่งออกข้อมูล (Export)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'import' ? 'border-[#7b68ee] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload size={14} />
            <span>นำเข้า & กู้คืน (Import)</span>
          </button>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div className={`mx-4 mt-3 p-2.5 rounded flex items-center justify-between ${
            statusMessage.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/60 text-red-300 border border-red-500/40'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="p-0.5 hover:opacity-75">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: Auto-Backups List */}
          {activeTab === 'backups' && (
            <div className="space-y-4">
              {/* Create Instant Backup Bar */}
              <div className="p-3 bg-[#18191b] border border-[#333538] rounded-lg flex items-center space-x-3">
                <input 
                  type="text"
                  placeholder="บันทึกช่วยจำจุดสำรอง (เช่น ก่อนอัปเดตงานใหญ่)..."
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                  className="flex-1 p-2 bg-[#141517] border border-[#2e3034] rounded text-white text-xs outline-none focus:border-[#7b68ee]"
                />
                <button
                  disabled={isLoading}
                  onClick={handleCreateBackup}
                  className="px-4 py-2 bg-[#7b68ee] hover:bg-[#6a55e0] disabled:opacity-50 text-white font-semibold rounded text-xs transition flex items-center space-x-1.5 flex-shrink-0"
                >
                  <Plus size={14} />
                  <span>สร้างจุดสำรองทันที (Backup Now)</span>
                </button>
              </div>

              {/* List of Backups */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-gray-400 font-semibold text-[11px] px-1">
                  <span>ประวัติจุดสำรองข้อมูลย้อนหลัง 7 วันล่าสุด</span>
                  <span>ระบบลบไฟล์เก่ากว่า 7 วันอัตโนมัติ</span>
                </div>

                <div className="space-y-2">
                  {backups.map(b => (
                    <div 
                      key={b.filename}
                      className="p-3 bg-[#222427] hover:bg-[#282a2e] border border-[#333538] rounded-lg flex items-center justify-between transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <HardDrive size={15} className="text-purple-400" />
                          <span className="font-semibold text-white">{b.filename}</span>
                          <span className="text-[10px] px-2 py-0.2 bg-[#18191b] text-gray-400 rounded">
                            {(b.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center space-x-3">
                          <span>สร้างเมื่อ: {new Date(b.createdAt).toLocaleString('th-TH')}</span>
                          {b.summary && (
                            <span className="text-purple-300">
                              • มี {b.summary.totalTasks} งาน ({b.summary.totalLists} ลิสต์)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <a 
                          href={`/api/backup/download/${encodeURIComponent(b.filename)}`}
                          download={b.filename}
                          className="px-2.5 py-1.5 bg-[#18191b] hover:bg-[#2a2b2d] border border-[#383a3e] rounded text-gray-300 hover:text-white flex items-center space-x-1 text-[11px] transition"
                        >
                          <Download size={13} />
                          <span>โหลดไฟล์</span>
                        </a>

                        <button
                          onClick={() => setRestoreConfirmFile(b.filename)}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded font-semibold flex items-center space-x-1 text-[11px] transition"
                        >
                          <RotateCcw size={13} />
                          <span>กู้คืน (Restore)</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {backups.length === 0 && (
                    <div className="p-8 text-center text-gray-500 bg-[#18191b] rounded-lg border border-dashed border-[#333538]">
                      <p>ยังไม่มีไฟล์สำรองข้อมูลในโฟลเดอร์ backups/</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Export Data */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#18191b] border border-[#333538] rounded-lg space-y-3">
                <div className="flex items-center space-x-2.5">
                  <FileSpreadsheet size={20} className="text-emerald-400" />
                  <div>
                    <h4 className="font-bold text-white text-sm">ส่งออกตารางงานปัจจุบันเป็น Excel / CSV</h4>
                    <p className="text-gray-400 text-[11px]">
                      สำหรับลิสต์ <strong className="text-white">"{activeListName}"</strong> มีครบทั้งสถานะ ผู้รับผิดชอบ วันกำหนดส่ง ซับทาสก์ และ Custom Fields
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <a
                    href={`/api/export/csv?listId=${activeListId}`}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded shadow transition"
                  >
                    <Download size={14} />
                    <span>ดาวน์โหลดไฟล์ Excel CSV (.csv)</span>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-[#18191b] border border-[#333538] rounded-lg space-y-3">
                <div className="flex items-center space-x-2.5">
                  <FileJson size={20} className="text-purple-400" />
                  <div>
                    <h4 className="font-bold text-white text-sm">ส่งออกไฟล์สำรองทั้งระบบ (Full System JSON Backup)</h4>
                    <p className="text-gray-400 text-[11px]">
                      รวมข้อมูลทุก Spaces, Lists, Tasks, ซับทาสก์, Custom Fields, ค่าการตั้งค่า, และโครงสร้างทั้งหมดในระบบ
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <a
                    href="/api/export/backup"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-semibold rounded shadow transition"
                  >
                    <Download size={14} />
                    <span>ดาวน์โหลด Full Backup (.json)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Import & Restore */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#383a3e] hover:border-[#7b68ee] rounded-xl p-6 text-center cursor-pointer bg-[#18191b] transition space-y-2"
              >
                <Upload size={28} className="mx-auto text-purple-400" />
                <div className="space-y-1">
                  <p className="font-bold text-white">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                  <p className="text-[11px] text-gray-400">รองรับไฟล์ Excel (.csv) หรือไฟล์สำรอง (.json)</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept=".csv,.json" 
                  className="hidden" 
                />
              </div>

              {/* Selected File Details & Mode Selector */}
              {selectedFile && (
                <div className="p-4 bg-[#222427] border border-[#383a3e] rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">ไฟล์ที่เลือก:</span>
                      <span className="font-semibold text-white text-xs">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button 
                      onClick={() => { setSelectedFile(null); setFileContent(null); }}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Mode Selector for JSON */}
                  {selectedFile.name.endsWith('.json') && (
                    <div className="space-y-2 pt-2 border-t border-[#2e3034]">
                      <label className="font-semibold text-gray-300 block">เลือกรูปแบบการนำเข้า:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className={`p-3 rounded-lg border cursor-pointer transition ${
                          importMode === 'merge' ? 'border-[#7b68ee] bg-[#7b68ee]/10 text-white' : 'border-[#333538] bg-[#18191b] text-gray-400'
                        }`}>
                          <input 
                            type="radio" 
                            name="importMode" 
                            checked={importMode === 'merge'} 
                            onChange={() => setImportMode('merge')} 
                            className="hidden" 
                          />
                          <span className="font-bold block">1. Merge (นำเข้าเพิ่มเติม)</span>
                          <span className="text-[10px] text-gray-400 block pt-0.5">นำเข้างานใหม่เข้าสู่ระบบโดยไม่ลบงานเดิมที่มีอยู่</span>
                        </label>

                        <label className={`p-3 rounded-lg border cursor-pointer transition ${
                          importMode === 'replace' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-[#333538] bg-[#18191b] text-gray-400'
                        }`}>
                          <input 
                            type="radio" 
                            name="importMode" 
                            checked={importMode === 'replace'} 
                            onChange={() => setImportMode('replace')} 
                            className="hidden" 
                          />
                          <span className="font-bold text-amber-300 block">2. Full Restore (กู้คืนทับทั้งหมด)</span>
                          <span className="text-[10px] text-gray-400 block pt-0.5">แทนที่ระบบเดิมทั้งหมดด้วยไฟล์สำรองนี้ (มี Snapshot นิรภัยก่อนทำ)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      disabled={isLoading}
                      onClick={handleExecuteImport}
                      className="px-5 py-2 bg-[#7b68ee] hover:bg-[#6a55e0] disabled:opacity-50 text-white font-bold rounded shadow transition"
                    >
                      {isLoading ? 'กำลังดำเนินการ...' : 'ยืนยันการนำเข้าข้อมูล'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Restore Confirmation Dialog */}
        {restoreConfirmFile && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#222427] border border-amber-500/40 rounded-xl p-5 w-96 shadow-2xl space-y-4">
              <div className="flex items-center space-x-2.5 text-amber-400">
                <AlertTriangle size={22} />
                <h4 className="font-bold text-white text-sm">ยืนยันการกู้คืนระบบ</h4>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                คุณต้องการกู้คืนข้อมูลจากไฟล์ <strong className="text-white">"{restoreConfirmFile}"</strong> ใช่หรือไม่? ระบบจะสร้างจุดสำรองฉุกเฉินให้อัตโนมัติก่อนเริ่มแทนที่ข้อมูล
              </p>
              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  onClick={() => setRestoreConfirmFile(null)}
                  className="px-3.5 py-1.5 rounded text-gray-300 hover:bg-[#333538]"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => handleRestoreFromList(restoreConfirmFile)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded transition"
                >
                  ยืนยันกู้คืนทันที
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
