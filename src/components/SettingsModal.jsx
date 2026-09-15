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
      <div className="bg-[#222427] border border-[#383a3e] rounded-xl w-[480px] max-w-full shadow-2xl p-5 space-y-5">
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
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini' },
                { id: 'openai', label: 'OpenAI (ChatGPT)' },
                { id: 'ollama', label: 'Local Ollama' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProvider(p.id);
                    if (p.id === 'gemini') setModel('gemini-1.5-flash');
                    if (p.id === 'openai') setModel('gpt-4o-mini');
                    if (p.id === 'ollama') setModel('llama3');
                  }}
                  className={`p-2 rounded border text-center font-medium transition ${
                    provider === p.id 
                      ? 'border-[#7b68ee] bg-[#7b68ee]/20 text-white font-bold' 
                      : 'border-[#383a3e] bg-[#18191b] text-gray-400 hover:text-white'
                  }`}
                >
                  {p.label}
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
              placeholder="gemini-1.5-flash หรือ gpt-4o-mini"
              className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded text-white outline-none focus:border-[#7b68ee]"
            />
          </div>

          {/* API Key Input */}
          {provider !== 'ollama' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-gray-300 font-medium">API Key</label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[11px] text-purple-400 hover:underline"
                >
                  {showKey ? 'ซ่อน Key' : 'แสดง Key'}
                </button>
              </div>
              <input 
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                className="w-full p-2 bg-[#18191b] border border-[#383a3e] rounded text-white outline-none focus:border-[#7b68ee] font-mono text-[11px]"
              />
            </div>
          )}

          {/* Security Note */}
          <div className="p-3 bg-[#18191b] border border-[#2e3034] rounded-md flex items-start space-x-2 text-[11px] text-gray-400">
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
