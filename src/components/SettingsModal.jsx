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
  HardDrive
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'mcp_logs'
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [workspaceContext, setWorkspaceContext] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // MCP Logs State
  const [mcpLogs, setMcpLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'reports' | 'tools'
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Temp Files & Cache State
  const [tempStatus, setTempStatus] = useState({ fileCount: 0, formattedSize: '0 B' });
  const [isCleaningTemp, setIsCleaningTemp] = useState(false);

  const CONTEXT_PRESETS = [
    {
      label: '🏭 QA, IQA & ISO Compliance',
      context: 'ทีมงานฝ่ายคุณภาพ (QA/QC) และผู้ตรวจประเมินภายใน (IQA) สำหรับโรงงานและองค์กรที่ปฏิบัติตามมาตรฐาน ISO 9001:2015, ISO 14001, มาตรฐาน FSC, ตรวจสอบรถขนส่ง, ประเมินคู่ค้า Supplier List, ตรวจนับ Stockcard, ติดตามข้อบกพร่อง CAR/PAR และบริหาร KPI ทุกแผนก'
    },
    {
      label: '💻 Software & Tech Startup',
      context: 'ทีมพัฒนาซอฟต์แวร์และเทคโนโลยี ทำงานแบบ Agile/Scrum, Sprint Planning, Code Review, CI/CD Pipeline, Bug Tracking, Automated Testing, API Design และ Product Release Roadmap'
    },
    {
      label: '🏢 General Business & Ops',
      context: 'องค์กรธุรกิจและงานบริหารทั่วไป ติดตาม OKR/KPI ของทุกแผนก, งานการตลาด, ฝ่ายขาย, บริหารทรัพยากรบุคคล (HR), การเงินบัญชี, จัดซื้อจัดจ้าง และการจัดทำรายงานสรุปประจำเดือน'
    }
  ];

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
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_provider: provider,
          ai_api_key: apiKey,
          ai_model: model,
          workspace_context: workspaceContext
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
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 select-none text-xs">
      <div className={`bg-[#222427] border border-[#383a3e] rounded-xl shadow-2xl transition-all duration-200 flex flex-col ${
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
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-xs transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#7b68ee] text-[#7b68ee] font-bold bg-[#222427]/60 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Key size={14} />
            <span>โมเดล & API Keys</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('mcp_logs');
              fetchMcpLogs();
            }}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-xs transition cursor-pointer relative ${
              activeTab === 'mcp_logs'
                ? 'border-[#7b68ee] text-[#7b68ee] font-bold bg-[#222427]/60 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ClipboardList size={14} />
            <span>ประวัติ & รายงาน AI ภายนอก (MCP Logs)</span>
            {reportCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">
                {reportCount} รายงาน
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: AI Settings Form */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
            {/* AI Provider Radio */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-semibold block">ผู้ให้บริการ AI (AI Provider)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-1.5-flash', hint: 'AIzaSy...' },
                  { id: 'openai', label: 'OpenAI (ChatGPT)', defaultModel: 'gpt-4o-mini', hint: 'sk-proj-...' },
                  { id: 'claude', label: 'Claude (Anthropic)', defaultModel: 'claude-3-5-sonnet-20241022', hint: 'sk-ant-...' },
                  { id: 'mistral', label: 'Mistral AI', defaultModel: 'pixtral-12b-2409', hint: 'apiKey...' },
                  { id: 'qwen', label: 'Qwen (Alibaba)', defaultModel: 'qwen-plus', hint: 'sk-...' },
                  { id: 'kimi', label: 'Kimi (Moonshot)', defaultModel: 'moonshot-v1-8k', hint: 'sk-...' },
                  { id: 'ollama', label: 'Local Ollama', defaultModel: 'llama3', hint: 'ไม่ต้องใช้ Key' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProvider(p.id);
                      setModel(p.defaultModel);
                    }}
                    className={`p-2 rounded-lg border text-center font-medium transition cursor-pointer ${
                      provider === p.id 
                        ? 'border-[#7b68ee] bg-[#7b68ee]/20 text-white font-bold shadow-sm' 
                        : 'border-[#383a3e] bg-[#18191b] text-gray-400 hover:text-white hover:border-[#4f5258]'
                    }`}
                  >
                    <div className="text-xs">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Name Input */}
            <div className="space-y-1">
              <label className="text-gray-300 font-medium">ชื่อโมเดล (Model Name)</label>
              <input 
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="เช่น gemini-1.5-flash, gpt-4o-mini, claude-3-5-sonnet-20241022, mistral-large-latest, qwen-plus, moonshot-v1-8k"
                className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-white outline-none focus:border-[#7b68ee]"
              />
            </div>

            {/* API Key Input */}
            {provider !== 'ollama' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 font-medium">
                    API Key ({provider === 'gemini' ? 'Google AI Studio' : provider === 'claude' ? 'Anthropic Console' : provider === 'mistral' ? 'Mistral Console' : provider === 'qwen' ? 'Alibaba DashScope' : provider === 'kimi' ? 'Moonshot Open Platform' : 'OpenAI Platform'})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-purple-400 hover:underline cursor-pointer"
                  >
                    {showKey ? 'ซ่อน Key' : 'แสดง Key'}
                  </button>
                </div>
                <input 
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    provider === 'gemini' ? 'AIzaSy...' :
                    provider === 'claude' ? 'sk-ant-api03-...' :
                    provider === 'mistral' ? '...' :
                    provider === 'qwen' ? 'sk-...' :
                    provider === 'kimi' ? 'sk-...' :
                    'sk-proj-...'
                  }
                  className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-white outline-none focus:border-[#7b68ee] font-mono text-[11px]"
                />
              </div>
            )}

            {/* Workspace & Team Domain Context */}
            <div className="space-y-1.5 pt-1 border-t border-[#333538]/60">
              <div className="flex items-center justify-between">
                <label className="text-gray-300 font-semibold flex items-center space-x-1.5">
                  <Sparkles size={14} className="text-purple-400" />
                  <span>บริบทองค์กรและมาตรฐานการทำงาน (Workspace Context)</span>
                </label>
                <span className="text-[10px] text-gray-400">ช่วยให้ AI ตอบได้ตรงสายงาน</span>
              </div>

              <p className="text-[11px] text-gray-400">
                ระบุประเภทธุรกิจ ข้อกำหนด แผนก หรือมาตรฐานของทีมคุณ เพื่อให้ AI ปรับปรุงข้อความ แตกซับทาสก์ และเข้าใจเนื้องานจริง:
              </p>

              {/* Context Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {CONTEXT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setWorkspaceContext(preset.context)}
                    className="px-2 py-1 rounded bg-[#18191b] hover:bg-purple-950/40 border border-[#383a3e] hover:border-purple-500/50 text-gray-300 hover:text-purple-200 text-[10px] transition cursor-pointer"
                    title="คลิกเพื่อใช้บริบทนี้"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={workspaceContext}
                onChange={(e) => setWorkspaceContext(e.target.value)}
                placeholder="ตัวอย่าง: เราเป็นทีม QA/IQA โรงงานอุตสาหกรรม มาตรฐาน ISO 9001:2015, FSC, มีการตรวจนับ Stockcard, รถขนส่ง, ประเมิน Supplier..."
                className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded-lg text-white outline-none focus:border-[#7b68ee] text-xs resize-none"
              />
            </div>

            {/* Security Note */}
            <div className="p-3 bg-[#18191b] border border-[#2e3034] rounded-lg flex items-start space-x-2 text-[11px] text-gray-400">
              <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                API Key จะถูกบันทึกลงในไฟล์ SQLite บนเครื่องคอมพิวเตอร์ของคุณเท่านั้น ไม่มีการส่งต่อไปยังเซิร์ฟเวอร์ภายนอกอื่นใด
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2">
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
