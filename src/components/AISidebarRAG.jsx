import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Search, 
  Bot, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ExternalLink 
} from 'lucide-react';

export default function AISidebarRAG({
  isOpen,
  onClose,
  onSelectTaskById
}) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'สวัสดีครับ! ผมคือ AI Project Assistant มีอะไรให้ผมช่วยเหลือในการจัดการงาน ติดตามความคืบหน้า หรือค้นหาข้อมูลในระบบ ClickUp Local ไหมครับ?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Semantic Vector Search
  const handleSemanticSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/rag/search?q=${encodeURIComponent(searchQuery.trim())}&limit=6`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Chat Send
  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim()) return;

    const newMsgs = [...messages, { role: 'user', content: query.trim() }];
    setMessages(newMsgs);
    setInputMessage('');
    setIsAiReplying(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs })
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'ขออภัยครับ ไม่สามารถติดต่อโมเดล AI ได้ในขณะนี้',
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI API กรุณาตรวจสอบการตั้งค่าในหน้า Settings ครับ'
        }
      ]);
    } finally {
      setIsAiReplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[460px] max-w-full bg-[#18191b] border-l border-[#333538] shadow-2xl z-50 flex flex-col text-xs select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[#2e3034] flex items-center justify-between bg-[#141517]">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Sparkles size={14} />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs">AI Project Hub & RAG</h3>
            <span className="text-[10px] text-gray-400">Semantic Search & Intelligent Assistant</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d] transition"
        >
          <X size={17} />
        </button>
      </div>

      {/* Tabs Switcher: Chat vs Vector Search */}
      <div className="flex border-b border-[#2e3034] bg-[#1a1b1e]">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 font-medium text-xs border-b-2 transition ${
            activeTab === 'chat' 
              ? 'border-[#7b68ee] text-white bg-[#222427]' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          AI Chat (คุยกับ AI)
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 font-medium text-xs border-b-2 transition ${
            activeTab === 'search' 
              ? 'border-[#7b68ee] text-white bg-[#222427]' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Vector Search (ค้นหาความหมาย)
        </button>
      </div>

      {/* TAB 1: AI Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex space-x-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}
                <div className={`p-3 rounded-lg max-w-[85%] space-y-2 leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-[#7b68ee] text-white' 
                    : 'bg-[#222427] text-gray-200 border border-[#333538]'
                }`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Sources Cards if any */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="pt-2 border-t border-[#383a3e] space-y-1">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        ทาสก์ที่เกี่ยวข้องจาก RAG:
                      </span>
                      {m.sources.map(src => (
                        <div 
                          key={src.taskId}
                          onClick={() => onSelectTaskById(src.taskId)}
                          className="p-1.5 bg-[#18191b] rounded border border-[#2e3034] hover:border-purple-500 cursor-pointer flex items-center justify-between text-[11px] group transition"
                        >
                          <span className="truncate text-purple-300 group-hover:text-purple-200">{src.name}</span>
                          <span className="text-[9px] text-gray-500">{(src.score * 100).toFixed(0)}% match</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 text-[10px] font-bold">
                    U
                  </div>
                )}
              </div>
            ))}

            {isAiReplying && (
              <div className="flex space-x-2 items-center text-gray-400 text-xs italic">
                <Sparkles size={13} className="animate-spin text-purple-400" />
                <span>AI กำลังค้นหาข้อมูลและคิดคำตอบ...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 border-t border-[#2e3034] bg-[#161719] flex space-x-1.5 overflow-x-auto text-[11px]">
            <button 
              onClick={() => handleSendMessage('สรุปสถานะงานทั้งหมดในโปรเจกต์')}
              className="px-2.5 py-1 bg-[#222427] hover:bg-[#2c2e33] text-gray-300 rounded whitespace-nowrap transition"
            >
              📊 สรุปงานทั้งหมด
            </button>
            <button 
              onClick={() => handleSendMessage('มีงานไหนบ้างที่เกี่ยวข้องกับ Supplier')}
              className="px-2.5 py-1 bg-[#222427] hover:bg-[#2c2e33] text-gray-300 rounded whitespace-nowrap transition"
            >
              🏢 งาน Supplier
            </button>
            <button 
              onClick={() => handleSendMessage('งานไหนใกล้ถึงกำหนดส่ง หรือมีความสำคัญระดับ Urgent?')}
              className="px-2.5 py-1 bg-[#222427] hover:bg-[#2c2e33] text-gray-300 rounded whitespace-nowrap transition"
            >
              ⏰ งานด่วน Due Soon
            </button>
          </div>

          {/* Chat Input Box */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="p-3 border-t border-[#2e3034] bg-[#18191b] flex items-center space-x-2"
          >
            <input 
              type="text"
              placeholder="ถามคำถาม สั่งสรุปงาน หรือปรึกษา AI..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-[#141517] px-3.5 py-2 rounded-md border border-[#333538] text-white text-xs outline-none focus:border-[#7b68ee]"
            />
            <button
              type="submit"
              disabled={isAiReplying || !inputMessage.trim()}
              className="p-2 bg-[#7b68ee] hover:bg-[#6a55e0] disabled:opacity-50 text-white rounded-md transition shadow-sm"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Vector Semantic Search */}
      {activeTab === 'search' && (
        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
          {/* Search Form */}
          <form onSubmit={handleSemanticSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="ค้นหาด้วยความหมาย เช่น 'ประเมินคู่ค้า', 'KPI'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-2 bg-[#141517] border border-[#333538] rounded-md text-white text-xs outline-none focus:border-[#7b68ee]"
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 bg-[#7b68ee] hover:bg-[#6a55e0] text-white font-semibold rounded-md text-xs transition"
            >
              {isSearching ? 'ค้นหา...' : 'Search'}
            </button>
          </form>

          {/* Results List */}
          <div className="space-y-2.5">
            {searchResults.length > 0 ? (
              searchResults.map(res => (
                <div 
                  key={res.taskId}
                  onClick={() => onSelectTaskById(res.taskId)}
                  className="p-3 bg-[#222427] hover:bg-[#282a2e] border border-[#333538] hover:border-purple-500 rounded-md cursor-pointer transition space-y-2 group"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-white text-xs group-hover:text-purple-300 transition">
                      {res.name}
                    </h4>
                    <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded text-[10px] font-bold border border-purple-500/30">
                      Score: {(res.score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                    <span className="px-1.5 py-0.2 bg-[#18191b] rounded">{res.status}</span>
                    <span>•</span>
                    <span>ความสำคัญ: {res.priority}</span>
                    {res.dueDate && (
                      <>
                        <span>•</span>
                        <span>ครบกำหนด: {res.dueDate}</span>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-300 line-clamp-2 bg-[#18191b] p-2 rounded">
                    {res.textChunk}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-10 space-y-2">
                <Sparkles size={24} className="mx-auto text-purple-400/50" />
                <p>พิมพ์คำค้นหาเพื่อดึงงานที่มีความหมายใกล้เคียงที่สุดจาก SQLite Vector Database</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
