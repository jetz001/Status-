import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  Server, 
  FileText, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Bot, 
  Terminal, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  ClipboardList,
  HardDrive,
  User
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  workspaceInfo = { userName: 'User', workspaceName: 'My Workspace' },
  onUpdateWorkspaceInfo
}) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'api' | 'context' | 'mcp_logs'
  const [profileName, setProfileName] = useState(workspaceInfo.userName || 'User');
  const [profileWorkspace, setProfileWorkspace] = useState(workspaceInfo.workspaceName || 'My Workspace');

  useEffect(() => {
    if (workspaceInfo) {
      if (workspaceInfo.userName) setProfileName(workspaceInfo.userName);
      if (workspaceInfo.workspaceName) setProfileWorkspace(workspaceInfo.workspaceName);
    }
  }, [workspaceInfo]);
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [workspaceContext, setWorkspaceContext] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const PROVIDERS = [
    { id: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-1.5-flash', badge: 'แนะนำ / ฟรี' },
    { id: 'openrouter', label: 'OpenRouter', defaultModel: 'nex-agi/nex-n2.5-mini:free', badge: 'หลายโมเดล / ฟรี' },
    { id: 'groq', label: 'Groq Cloud (เร็วสุด)', defaultModel: 'llama-3.3-70b-versatile', badge: 'เร็วที่สุด / ฟรี' },
    { id: 'openai', label: 'OpenAI (ChatGPT)', defaultModel: 'gpt-4o-mini', badge: 'ยอดนิยม' },
    { id: 'claude', label: 'Claude (Anthropic)', defaultModel: 'claude-3-5-sonnet-20241022', badge: 'ฉลาดขั้นสูง' },
    { id: 'mistral', label: 'Mistral AI', defaultModel: 'pixtral-12b-2409', badge: 'เร็ว & รองรับภาพ' },
    { id: 'qwen', label: 'Qwen (Alibaba)', defaultModel: 'qwen-plus', badge: 'คุ้มค่า' },
    { id: 'kimi', label: 'Kimi (Moonshot)', defaultModel: 'moonshot-v1-8k', badge: 'อ่านเอกสารยาว' },
    { id: 'ollama', label: 'Local Ollama (ออฟไลน์)', defaultModel: 'llama3', badge: 'ไม่ต้องใช้ Key' }
  ];

  const POPULAR_MODELS = {
    groq: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (แนะนำ - ฉลาดและเร็วมาก)' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (เร็วสูงสุด)' },
      { id: 'gemma2-9b-it', label: 'Google Gemma 2 9B' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
    ],
    mistral: [
      { id: 'pixtral-12b-2409', label: 'Pixtral 12B' },
      { id: 'mistral-small-latest', label: 'Mistral Small (Latest)' },
      { id: 'open-mistral-7b', label: 'Open Mistral 7B' },
      { id: 'mistral-large-latest', label: 'Mistral Large' }
    ],
    gemini: [
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
    ],
    openai: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' }
    ],
    claude: [
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' }
    ],
    openrouter: [
      { id: 'nex-agi/nex-n2.5-mini:free', label: 'Nex-N2.5 Mini (แนะนำ / ฟรี - เสถียรและเร็ว)' },
      { id: 'liquid/lfm-2.5-2.6b:free', label: 'Liquid LFM 2.5 (ฟรี - รองรับภาษาไทยดี)' },
      { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nvidia Nemotron (ฟรี)' },
      { id: 'google/gemma-4-31b-it:free', label: 'Google Gemma 4 31B (ฟรี)' },
      { id: 'qwen/qwen3.8-27b:free', label: 'Qwen 3.8 27B (ฟรี)' },
      { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'deepseek/deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash' }
    ]
  };

  const sanitizeApiKey = (key) => (key || '').trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: sanitizeApiKey(apiKey),
          model: model.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.reply ? `AI ตอบกลับ: "${data.reply}" (เชื่อมต่อสำเร็จ)` : 'เชื่อมต่อสำเร็จเรียบร้อย!'
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || 'การเชื่อมต่อล้มเหลว ตรวจสอบ Key หรือชื่อโมเดล'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อได้: ' + err.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  // MCP Logs State
  const [mcpLogs, setMcpLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'reports' | 'tools'
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Temp Files & Cache State
  const [tempStatus, setTempStatus] = useState({ fileCount: 0, formattedSize: '0 B' });
  const [isCleaningTemp, setIsCleaningTemp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDatabase = async () => {
    const confirmed = window.confirm(
      '⚠️ คำเตือน: คุณต้องการล้างฐานข้อมูลทั้งหมดใช่หรือไม่?\\n\\n' +
      '• งาน รายการ และประวัติทั้งหมดจะถูกลบ\\n' +
      '• ระบบจะเริ่มต้นใหม่ด้วยพื้นที่ว่างเปล่า (0 งาน)\\n' +
      '• ระบบจะสร้างไฟล์สำรองข้อมูลฉุกเฉิน (Auto-Backup) ไว้ให้ก่อนลบ\\n\\n' +
      'กด "ตกลง (OK)" เพื่อยืนยันการล้างข้อมูล'
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const res = await fetch('/api/settings/reset-database', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('ล้างฐานข้อมูลสำเร็จเรียบร้อยแล้ว ระบบจะรีเฟรชหน้าต่างใหม่');
        window.location.reload();
      } else {
        alert('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถรีเซ็ตได้'));
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };


  const fetchSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.ai_provider) setProvider(data.ai_provider);
        if (data.ai_api_key) setApiKey(data.ai_api_key);
        if (data.ai_model) setModel(data.ai_model);
        if (data.workspace_context) setWorkspaceContext(data.workspace_context);
      })
      .catch(err => console.error(err));
  };

  const fetchTempStatus = async () => {
    try {
      const res = await fetch('/api/temp/status');
      if (res.ok) {
        const data = await res.json();
        setTempStatus(data);
      }
    } catch (e) {}
  };

  const handleCleanupTemp = async () => {
    setIsCleaningTemp(true);
    try {
      const res = await fetch('/api/temp/cleanup', { method: 'POST' });
      if (res.ok) {
        await fetchTempStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCleaningTemp(false);
    }
  };

  const fetchMcpLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/mcp/logs?limit=100');
      if (res.ok) {
        const data = await res.json();
        setMcpLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching MCP logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchMcpLogs();
      fetchTempStatus();
    }
  }, [isOpen]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (onUpdateWorkspaceInfo) {
        onUpdateWorkspaceInfo({
          userName: profileName.trim(),
          workspaceName: profileWorkspace.trim()
        });
      }
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_provider: provider,
          ai_api_key: sanitizeApiKey(apiKey),
          ai_model: model,
          workspace_context: workspaceContext,
          user_name: profileName.trim(),
          workspace_name: profileWorkspace.trim()
        })
      });
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('คุณต้องการล้างประวัติและรายงานการทำงานของ AI ทั้งหมดใช่หรือไม่?')) return;
    setIsClearingLogs(true);
    try {
      const res = await fetch('/api/mcp/logs', { method: 'DELETE' });
      if (res.ok) {
        setMcpLogs([]);
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
    } finally {
      setIsClearingLogs(false);
    }
  };

  const filteredLogs = mcpLogs.filter(log => {
    if (logFilter === 'reports') return log.action_type === 'execution_report';
    if (logFilter === 'tools') return log.action_type === 'tool_execution';
    return true;
  });

  const reportCount = mcpLogs.filter(l => l.action_type === 'execution_report').length;

  const parseReportData = (log) => {
    if (!log.report_text) return null;
    try {
      return JSON.parse(log.report_text);
    } catch {
      return { summary: log.report_text };
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 select-none text-xs"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#222427] border border-[#383a3e] rounded-xl shadow-2xl transition-all duration-200 flex flex-col ${
        activeTab === 'mcp_logs' ? 'w-[780px] max-h-[88vh]' : 'w-[540px]'
      } max-w-full overflow-hidden`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#333538] px-5 py-3.5 bg-[#1b1c1e]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">การตั้งค่าและบันทึกระบบ AI (Settings & AI Logs)</h3>
              <p className="text-[11px] text-gray-400">ควบคุมผู้ช่วย AI และตรวจสอบบันทึกการทำงานของ AI ภายนอก</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2d2f33] transition">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#333538] bg-[#1a1b1d] px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-medium text-xs transition cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#7b68ee] text-[#7b68ee] font-bold bg-[#222427]/60 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <User size={14} />
            <span>โปรไฟล์ & ทั่วไป</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-medium text-xs transition cursor-pointer ${
              activeTab === 'api'
                ? 'border-[#7b68ee] text-[#7b68ee] font-bold bg-[#222427]/60 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Key size={14} />
            <span>เชื่อมต่อ AI & Key</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('context')}
            className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-medium text-xs transition cursor-pointer ${
              activeTab === 'context'
                ? 'border-[#7b68ee] text-[#7b68ee] font-bold bg-[#222427]/60 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles size={14} />
            <span>บริบทองค์กร (Context)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('mcp_logs');
              fetchMcpLogs();
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-medium text-xs transition cursor-pointer relative ${
              activeTab === 'mcp_logs'
                ? 'border-[#7b68ee] text-[#7b68ee] font-bold bg-[#222427]/60 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ClipboardList size={14} />
            <span>บันทึก AI (MCP Logs)</span>
            {reportCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">
                {reportCount} รายงาน
              </span>
            )}
          </button>
        </div>

        {/* TAB 0: User Profile & Workspace Info */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="p-5 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[75vh]">
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-base flex-shrink-0">
                  {profileName.trim().charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold">ข้อมูลผู้ใช้งาน & Workspace</h4>
                  <p className="text-[11px] text-gray-400">กำหนดชื่อของคุณที่ใช้แสดงผลในโปรแกรม</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-semibold block text-xs">
                  ชื่อของคุณ (Display Name) <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="เช่น บอส, Boss-QA, Admin"
                  className="w-full px-3 py-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-white font-medium text-xs outline-none focus:border-[#7b68ee] shadow-inner"
                />
                <p className="text-[11px] text-gray-400">
                  ชื่อนี้จะแสดงในข้อความทักทาย Home Dashboard และรายงานสรุปสถานะ
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-semibold block text-xs">
                  ชื่อ Workspace (พื้นที่ทำงาน)
                </label>
                <input
                  type="text"
                  value={profileWorkspace}
                  onChange={(e) => setProfileWorkspace(e.target.value)}
                  placeholder="เช่น My Workspace, Project Team"
                  className="w-full px-3 py-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-white font-medium text-xs outline-none focus:border-[#7b68ee] shadow-inner"
                />
                <p className="text-[11px] text-gray-400">
                  ชื่อ Workspace หลักที่แสดงบนแถบเมนูด้านซ้ายและส่วนหัวของระบบ
                </p>
              </div>

              {/* Danger Zone: Factory Reset */}
              <div className="pt-3 mt-4 border-t border-rose-500/20">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-rose-400 text-xs font-bold flex items-center space-x-1.5">
                        <Trash2 size={14} />
                        <span>รีเซ็ตฐานข้อมูลทั้งหมด (Factory Reset 0 งาน)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        ล้างข้อมูลงานทั้งหมดในเครื่องเพื่อเริ่มต้นใหม่แบบว่างเปล่า (มีระบบสำรองข้อมูลอัตโนมัติก่อนลบ)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetDatabase}
                      disabled={isResetting}
                      className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 hover:border-rose-500/60 text-rose-300 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 flex-shrink-0"
                    >
                      <Trash2 size={13} className={isResetting ? "animate-spin" : ""} />
                      <span>{isResetting ? 'กำลังล้างข้อมูล...' : 'ล้างข้อมูล 0 งาน'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#333538] flex items-center justify-between">
              <div>
                {isSaved && (
                  <span className="text-xs text-green-400 flex items-center space-x-1">
                    <Check size={14} />
                    <span>บันทึกข้อมูลสำเร็จ!</span>
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-[#2d2f33] transition cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white text-xs font-semibold rounded-lg shadow-md transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Check size={14} />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 1: AI Provider & API Key (Clean & Streamlined) */}
        {activeTab === 'api' && (
          <form onSubmit={handleSave} className="p-5 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[75vh]">
            <div className="space-y-4">
              {/* 1. AI Provider Select Dropdown */}
              <div className="space-y-1.5">
                <label className="text-gray-300 font-semibold block text-xs">
                  ผู้ให้บริการ AI (AI Provider)
                </label>
                <div className="relative">
                  <select
                    value={provider}
                    onChange={(e) => {
                      const selected = PROVIDERS.find(p => p.id === e.target.value);
                      setProvider(e.target.value);
                      if (selected) setModel(selected.defaultModel);
                      setTestResult(null);
                    }}
                    className="w-full px-3 py-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-white font-medium text-xs outline-none focus:border-[#7b68ee] cursor-pointer appearance-none pr-8 shadow-inner"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#222427] text-white py-1">
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 2. Model Name Input & Suggestions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 font-semibold text-xs">ชื่อโมเดล (Model Name)</label>
                  <span className="text-[10px] text-gray-500">พิมพ์เปลี่ยนโมเดลเองได้อิสระ</span>
                </div>
                <input 
                  type="text"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="เช่น gemini-1.5-flash, gpt-4o-mini, pixtral-12b-2409..."
                  className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-white text-xs outline-none focus:border-[#7b68ee] font-mono shadow-inner"
                />
                {POPULAR_MODELS[provider] && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-gray-400">ตัวเลือกแนะนำ:</span>
                    {POPULAR_MODELS[provider].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setModel(m.id);
                          setTestResult(null);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer border ${
                          model === m.id
                            ? 'bg-[#7b68ee]/30 text-purple-300 border-[#7b68ee]/60 font-semibold shadow-xs'
                            : 'bg-[#18191b] text-gray-400 border-[#383a3e] hover:text-gray-200 hover:border-gray-500'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. API Key Input with Inline Test Button */}
              {provider !== 'ollama' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 font-semibold text-xs">
                      API Key ({PROVIDERS.find(p => p.id === provider)?.label || provider})
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[11px] text-purple-400 hover:underline cursor-pointer"
                    >
                      {showKey ? 'ซ่อน Key' : 'แสดง Key'}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder={
                        provider === 'gemini' ? 'AIzaSy...' :
                        provider === 'openrouter' ? 'sk-or-v1-...' :
                        provider === 'groq' ? 'gsk_...' :
                        provider === 'claude' ? 'sk-ant-api03-...' :
                        provider === 'mistral' ? 'ใส่ Mistral API Key...' :
                        provider === 'qwen' ? 'sk-...' :
                        provider === 'kimi' ? 'sk-...' :
                        'sk-proj-...'
                      }
                      className="flex-1 p-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-white outline-none focus:border-[#7b68ee] font-mono text-xs shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting || !apiKey.trim()}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer shadow-xs ${
                        isTesting || !apiKey.trim()
                          ? 'border-[#383a3e] bg-[#1a1b1d] text-gray-500 cursor-not-allowed'
                          : 'border-purple-500/40 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 hover:border-purple-500/60'
                      }`}
                    >
                      <RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
                      <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#18191b] border border-[#383a3e] rounded-lg text-xs text-gray-300 flex items-center justify-between">
                  <span>Ollama ทำงานแบบ Local บนเครื่อง (http://localhost:11434) ไม่ต้องใช้ API Key</span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
                    <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
                  </button>
                </div>
              )}

              {/* Test Connection Result Alert */}
              {testResult && (
                <div className={`p-2.5 rounded-lg border flex items-start space-x-2 text-xs transition-all ${
                  testResult.success
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{testResult.success ? 'เชื่อมต่อ AI สำเร็จ!' : 'การเชื่อมต่อล้มเหลว'}</div>
                    <div className="text-[11px] opacity-90 mt-0.5 break-all">{testResult.message}</div>
                  </div>
                </div>
              )}

              {/* Discreet Security Note */}
              <div className="flex items-center space-x-1.5 text-[11px] text-gray-400 pt-1">
                <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
                <span>API Key จะถูกจัดเก็บบนเครื่องของคุณใน SQLite อย่างปลอดภัย ไม่มีการส่งต่อไปยังเซิร์ฟเวอร์ภายนอกอื่นใด</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#333538]/60">
              <div>
                {isSaved && (
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <Check size={14} />
                    <span>บันทึกเรียบร้อยแล้ว</span>
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded text-gray-300 hover:bg-[#333538] transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-semibold rounded shadow transition cursor-pointer"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: Workspace Context (Clean & Un-mocked) */}
        {activeTab === 'context' && (
          <form onSubmit={handleSave} className="p-5 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[75vh]">
            <div className="space-y-3.5">
              <div>
                <h4 className="text-white font-semibold text-xs flex items-center space-x-1.5">
                  <Sparkles size={14} className="text-purple-400" />
                  <span>บริบทองค์กรและการทำงาน (Workspace Context)</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  ระบุรายละเอียดเกี่ยวกับงาน องค์กร แผนก หรือมาตรฐานของคุณ เพื่อให้ AI นำไปใช้อ้างอิงในการแตกงานย่อย (Subtasks) วิเคราะห์ และตอบคำถามได้ตรงจุด
                </p>
              </div>

              {/* Textarea for custom prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 font-medium text-xs block">
                    รายละเอียดบริบทการทำงานของคุณ
                  </label>
                  {workspaceContext && (
                    <button
                      type="button"
                      onClick={() => setWorkspaceContext('')}
                      className="text-[11px] text-gray-400 hover:text-rose-400 transition cursor-pointer"
                    >
                      ล้างข้อความ
                    </button>
                  )}
                </div>
                <textarea
                  rows={8}
                  value={workspaceContext}
                  onChange={(e) => setWorkspaceContext(e.target.value)}
                  placeholder="พิมพ์ข้อมูลบริบทองค์กร กฎระเบียบ ขั้นตอนการทำงาน หรือมาตรฐานของทีมคุณที่นี่ (เว้นว่างไว้ได้หากไม่ต้องการใช้)..."
                  className="w-full p-3 bg-[#18191b] border border-[#383a3e] rounded-lg text-white outline-none focus:border-[#7b68ee] text-xs leading-relaxed resize-none shadow-inner font-sans"
                />
                <p className="text-[10px] text-gray-500">
                  💡 ข้อมูลนี้จะถูกส่งเป็น System Prompt ประกอบการทำงานของ AI ในทุกคำสั่งงาน
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#333538]/60">
              <div>
                {isSaved && (
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <Check size={14} />
                    <span>บันทึกเรียบร้อยแล้ว</span>
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded text-gray-300 hover:bg-[#333538] transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-semibold rounded shadow transition cursor-pointer"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: MCP Logs & AI Execution Reports */}
        {activeTab === 'mcp_logs' && (
          <div className="p-5 flex flex-col space-y-4 overflow-hidden h-[75vh]">
            {/* Rule Notice Banner */}
            <div className="p-3 bg-gradient-to-r from-purple-950/40 to-indigo-950/30 border border-purple-500/30 rounded-lg flex items-start space-x-3">
              <div className="p-1 rounded bg-purple-500/20 text-purple-400 flex-shrink-0 mt-0.5">
                <Server size={16} />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-purple-200 flex items-center space-x-1.5">
                  <span>กฎระเบียบระบบ: AI ภายนอกต้องเขียนรายงานสรุปหลังปฏิบัติงานเสร็จ</span>
                  <span className="text-[10px] px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-300 rounded font-bold">MANDATORY RULE</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  AI ภายนอก (เช่น Claude Desktop, Cursor AI, หรือ Agent ภายนอก) ที่เชื่อมต่อผ่าน MCP จะต้องเรียกใช้เครื่องมือ <code className="px-1 py-0.5 bg-black/40 text-purple-300 rounded font-mono">status_submit_execution_report</code> ทุกครั้งหลังจบภารกิจ เพื่อบันทึกสรุปผลงานและการปรับปรุง Task ให้ตรวจสอบได้ที่นี่
                </p>
              </div>
            </div>

            {/* Temp Files & Screen Cache Control Card */}
            <div className="p-3 bg-[#17181b] border border-[#2d2f33] rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#222428] text-amber-400 border border-amber-500/20">
                  <HardDrive size={16} />
                </div>
                <div>
                  <div className="font-semibold text-gray-200 text-xs flex items-center space-x-2">
                    <span>แคชภาพหน้าจอ & ไฟล์ชั่วคราว (Screen & Analysis Cache)</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                      {tempStatus.fileCount} ไฟล์ ({tempStatus.formattedSize})
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    ระบบล้างภาพหน้าจอที่ AI นำไปวิเคราะห์ให้อัตโนมัติเมื่อ AI ส่งรายงานสรุปงาน หรือเมื่อเกิน 2 นาที เพื่อป้องกันพื้นที่ฮาร์ดดิสก์บวม
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCleanupTemp}
                disabled={isCleaningTemp || tempStatus.fileCount === 0}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                  tempStatus.fileCount > 0
                    ? 'bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200'
                    : 'bg-[#202225] border border-[#333538] text-gray-500 cursor-not-allowed'
                }`}
                title="ล้างภาพหน้าจอและไฟล์แคชชั่วคราวทั้งหมดทันที"
              >
                <Trash2 size={13} className={isCleaningTemp ? 'animate-spin' : ''} />
                <span>{isCleaningTemp ? 'กำลังล้าง...' : 'ล้างแคชทันที'}</span>
              </button>
            </div>

            {/* Filter and Control Bar */}
            <div className="flex items-center justify-between border-b border-[#333538] pb-3">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setLogFilter('all')}
                  className={`px-3 py-1 rounded text-xs transition cursor-pointer ${
                    logFilter === 'all'
                      ? 'bg-[#7b68ee] text-white font-semibold shadow'
                      : 'bg-[#18191b] text-gray-400 hover:text-white border border-[#333538]'
                  }`}
                >
                  ทั้งหมด ({mcpLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('reports')}
                  className={`px-3 py-1 rounded text-xs transition cursor-pointer ${
                    logFilter === 'reports'
                      ? 'bg-[#7b68ee] text-white font-semibold shadow'
                      : 'bg-[#18191b] text-gray-400 hover:text-white border border-[#333538]'
                  }`}
                >
                  📑 รายงานสรุป ({reportCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('tools')}
                  className={`px-3 py-1 rounded text-xs transition cursor-pointer ${
                    logFilter === 'tools'
                      ? 'bg-[#7b68ee] text-white font-semibold shadow'
                      : 'bg-[#18191b] text-gray-400 hover:text-white border border-[#333538]'
                  }`}
                >
                  ⚡ การเรียกใช้ Tools ({mcpLogs.length - reportCount})
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={fetchMcpLogs}
                  disabled={isLoadingLogs}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#18191b] hover:bg-[#282a2d] border border-[#383a3e] text-gray-300 hover:text-white transition cursor-pointer text-[11px]"
                  title="รีเฟรชบันทึกล่าสุด"
                >
                  <RefreshCw size={12} className={isLoadingLogs ? 'animate-spin text-purple-400' : ''} />
                  <span>รีเฟรช</span>
                </button>

                {mcpLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    disabled={isClearingLogs}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-red-950/30 hover:bg-red-900/50 border border-red-500/30 text-red-300 hover:text-red-100 transition cursor-pointer text-[11px]"
                    title="ล้างบันทึกทั้งหมด"
                  >
                    <Trash2 size={12} />
                    <span>{isClearingLogs ? 'กำลังล้าง...' : 'ล้างประวัติ'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Logs List Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingLogs && mcpLogs.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 space-x-2">
                  <RefreshCw size={16} className="animate-spin text-purple-400" />
                  <span>กำลังโหลดประวัติการทำงานของ AI...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#383a3e] rounded-xl text-gray-400 space-y-2.5 bg-[#18191b]/40">
                  <div className="p-3 rounded-full bg-[#25272a] text-gray-500">
                    <FileText size={28} />
                  </div>
                  <div className="font-semibold text-gray-300">ยังไม่มีบันทึกการทำงานของ AI ภายนอก</div>
                  <p className="text-[11px] text-gray-400 max-w-sm">
                    เมื่อเชื่อมต่อ Claude Desktop, Cursor หรือ AI Agent ผ่าน MCP Server (พอร์ต Stdio) และ AI ได้ทำการเรียกใช้คำสั่งหรือส่งรายงานสรุป ข้อมูลจะแสดงที่นี่โดยอัตโนมัติ
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isReport = log.action_type === 'execution_report';
                  const reportData = isReport ? parseReportData(log) : null;
                  const isExpanded = expandedLogId === log.id;

                  if (isReport) {
                    return (
                      <div 
                        key={log.id} 
                        className="bg-[#1a1c1f] border border-purple-500/40 hover:border-purple-500/70 rounded-xl p-4 space-y-3 shadow-lg transition"
                      >
                        {/* Report Header */}
                        <div className="flex items-center justify-between border-b border-[#2d2f33] pb-2.5">
                          <div className="flex items-center space-x-2">
                            <div className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center space-x-1">
                              <FileText size={11} />
                              <span>รายงานสรุปผลงาน AI</span>
                            </div>
                            <span className="font-bold text-white text-xs">{log.client_name || 'External AI'}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Clock size={11} />
                              <span>{formatDateTime(log.created_at)}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                              log.status === 'success' ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30' :
                              log.status === 'warning' ? 'bg-amber-950/50 text-amber-300 border border-amber-500/30' :
                              'bg-red-950/50 text-red-300 border border-red-500/30'
                            }`}>
                              {reportData?.status === 'completed' ? 'สำเร็จสมบูรณ์' : reportData?.status === 'partial' ? 'สำเร็จบางส่วน' : 'ล้มเหลว'}
                            </span>
                          </div>
                        </div>

                        {/* Report Summary */}
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-gray-300">📌 สรุปเนื้องานที่ดำเนินการ:</div>
                          <div className="p-2.5 bg-[#131416] border border-[#2b2d30] rounded-lg text-gray-200 text-xs leading-relaxed whitespace-pre-line font-sans">
                            {reportData?.summary || log.result_summary || 'ไม่มีรายละเอียดสรุป'}
                          </div>
                        </div>

                        {/* Tasks Modified */}
                        {Array.isArray(reportData?.tasks_modified) && reportData.tasks_modified.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-gray-300">📝 งานที่สร้างหรือแก้ไข ({reportData.tasks_modified.length} รายการ):</div>
                            <div className="flex flex-wrap gap-1.5">
                              {reportData.tasks_modified.map((item, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-[#25272b] border border-[#383b40] text-purple-300 text-[10px] rounded-md font-mono">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes / Recommendations */}
                        {reportData?.notes && reportData.notes.trim() !== '' && (
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-gray-300">💡 ข้อเสนอแนะ / ปัญหาที่พบ:</div>
                            <div className="p-2 bg-[#131416]/70 border border-[#2b2d30] rounded-lg text-amber-200 text-[11px] leading-relaxed">
                              {reportData.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Tool Execution Log Row
                  return (
                    <div 
                      key={log.id} 
                      className="bg-[#18191b] border border-[#2e3034] hover:border-[#404348] rounded-lg p-2.5 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded bg-[#242528] text-gray-400">
                            <Terminal size={12} />
                          </div>
                          <span className="font-mono text-purple-400 font-semibold text-xs">{log.tool_name}</span>
                          <span className="text-[10px] text-gray-400">({log.client_name || 'AI'})</span>
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                          <span className="text-gray-400">{formatDateTime(log.created_at)}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            log.status === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' : 'bg-red-950/40 text-red-400 border border-red-500/20'
                          }`}>
                            {log.status === 'success' ? 'SUCCESS' : 'ERROR'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                            title="ดูพารามิเตอร์"
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-300 truncate pl-6">
                        <span className="text-gray-400">ผลลัพธ์: </span>
                        {log.result_summary || '-'}
                      </div>

                      {/* Expandable JSON parameters */}
                      {isExpanded && log.input_params && (
                        <div className="pl-6 pt-1">
                          <div className="p-2 bg-[#121315] border border-[#27292c] rounded text-[10px] font-mono text-gray-300 overflow-x-auto max-h-36">
                            <pre>{typeof log.input_params === 'object' ? JSON.stringify(log.input_params, null, 2) : log.input_params}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Bottom Close */}
            <div className="flex items-center justify-between border-t border-[#333538] pt-3">
              <span className="text-[10px] text-gray-400">
                ข้อมูลบันทึกเก็บใน SQLite บนเครื่องของคุณ (`mcp_activity_logs`)
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded bg-[#333538] hover:bg-[#404348] text-white text-xs font-semibold transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
