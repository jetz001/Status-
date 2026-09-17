import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Check, Sparkles, Server } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose
}) {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [isSaved, setIsSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.ai_provider) setProvider(data.ai_provider);
          if (data.ai_api_key) setApiKey(data.ai_api_key);
          if (data.ai_model) setModel(data.ai_model);
        })
        .catch(err => console.error(err));
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
          ai_model: model
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 select-none text-xs">
      <div className="bg-[#222427] border border-[#383a3e] rounded-xl w-[540px] max-w-full shadow-2xl p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#333538] pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Key size={16} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">การตั้งค่า AI Provider & API Key</h3>
              <p className="text-[11px] text-gray-400">สำหรับเปิดใช้งานระบบ RAG AI Assistant และปุ่มผู้ช่วยอัจฉริยะ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* AI Provider Radio */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-semibold block">ผู้ให้บริการ AI (AI Provider)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-1.5-flash', hint: 'AIzaSy...' },
                { id: 'openai', label: 'OpenAI (ChatGPT)', defaultModel: 'gpt-4o-mini', hint: 'sk-proj-...' },
                { id: 'claude', label: 'Claude (Anthropic)', defaultModel: 'claude-3-5-sonnet-20241022', hint: 'sk-ant-...' },
                { id: 'mistral', label: 'Mistral AI', defaultModel: 'mistral-large-latest', hint: 'apiKey...' },
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
                className="px-3.5 py-1.5 rounded text-gray-300 hover:bg-[#333538]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-semibold rounded shadow transition"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
