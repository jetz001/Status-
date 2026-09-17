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
  // Chat State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'สวัสดีครับ! ผมคือ AI Project Assistant มีอะไรให้ผมช่วยเหลือในการวางแผน วิเคราะห์ สรุปสถานะ หรือค้นหาข้อมูลในระบบ ClickUp ไหมครับ?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const messagesEndRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

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
    <>
      {/* Backdrop overlay: click outside to close */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-40 transition-opacity"
        title="คลิกด้านนอกเพื่อปิด AI Assistant"
      />

      <div className="fixed inset-y-0 right-0 w-[460px] max-w-full bg-[#18191b] border-l border-[#333538] shadow-2xl z-50 flex flex-col text-xs select-none">
        {/* Header */}
        <div className="p-3.5 border-b border-[#2e3034] flex items-center justify-between bg-[#141517]">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles size={15} />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs flex items-center space-x-1.5">
                <span>AI Project Assistant</span>
              </h3>
              <span className="text-[10px] text-gray-400">ผู้ช่วยอัจฉริยะวิเคราะห์และสรุปงาน</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d] transition cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* AI Chat Body */}
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
                      <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                        📌 งานที่เกี่ยวข้อง:
                      </span>
                      {m.sources.map(src => (
                        <div 
                          key={src.taskId}
                          onClick={() => onSelectTaskById && onSelectTaskById(src.taskId)}
                          className="p-1.5 bg-[#18191b] rounded border border-[#2e3034] hover:border-cyan-500 cursor-pointer flex items-center justify-between text-[11px] group transition"
                        >
                          <span className="truncate text-cyan-300 group-hover:text-cyan-200 font-medium">{src.name}</span>
                          <span className="text-[9px] text-gray-500 flex items-center space-x-0.5">
                            <span>เปิดดู</span>
                            <ArrowRight size={10} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 text-[10px] font-bold shadow-sm">
                    U
                  </div>
                )}
              </div>
            ))}

            {isAiReplying && (
              <div className="flex space-x-2 items-center text-cyan-300 text-xs italic">
                <Sparkles size={13} className="animate-spin text-cyan-400" />
                <span>AI กำลังประมวลผลข้อมูลและคิดคำตอบ...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 border-t border-[#2e3034] bg-[#161719] flex space-x-1.5 overflow-x-auto text-[11px]">
            <button 
              type="button"
              onClick={() => handleSendMessage('สรุปภาพรวมและสถานะงานทั้งหมดในระบบ')}
              className="px-2.5 py-1 bg-[#222427] hover:bg-[#2c2e33] text-gray-300 rounded whitespace-nowrap transition cursor-pointer"
            >
              📊 สรุปงานทั้งหมด
            </button>
            <button 
              type="button"
              onClick={() => handleSendMessage('งานไหนใกล้ถึงกำหนดส่ง หรือมีความสำคัญระดับ Urgent?')}
              className="px-2.5 py-1 bg-[#222427] hover:bg-[#2c2e33] text-gray-300 rounded whitespace-nowrap transition cursor-pointer"
            >
              ⏰ งานด่วน Due Soon
            </button>
            <button 
              type="button"
              onClick={() => handleSendMessage('ช่วยวิเคราะห์งานที่ค้างอยู่ และแนะนำสิ่งที่ควรทำก่อน')}
              className="px-2.5 py-1 bg-[#222427] hover:bg-[#2c2e33] text-gray-300 rounded whitespace-nowrap transition cursor-pointer"
            >
              💡 แนะนำงานค้าง
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
              className="flex-1 bg-[#141517] px-3.5 py-2 rounded-md border border-[#333538] text-white text-xs outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={isAiReplying || !inputMessage.trim()}
              className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-md transition shadow-sm cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
