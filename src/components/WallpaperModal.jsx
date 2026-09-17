import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Upload, 
  Download, 
  Check, 
  Sparkles, 
  Monitor, 
  Sliders, 
  RotateCcw,
  CheckCircle2,
  Search,
  Loader2,
  Compass
} from 'lucide-react';

const CATEGORIES = [
  'All', 
  'Dark Minimalist', 
  'Cyber Neon', 
  'Nature & Landscape', 
  'Architecture & Desk', 
  'Abstract 3D',
  'AI Generated'
];

const QUICK_TAGS = [
  'Cyberpunk Tokyo', 
  'Dark Obsidian Minimal', 
  'Neon Galaxy Night', 
  'Nordic Pine Forest', 
  'Clean Minimalist Desk', 
  'Purple 3D Liquid', 
  'Deep Ocean Waves'
];

export default function WallpaperModal({
  isOpen,
  onClose,
  tasks = [],
  listName = 'Task Tracker'
}) {
  const [stocks, setStocks] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState('stock-dark-obsidian');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [position, setPosition] = useState('top-right'); // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  const [opacity, setOpacity] = useState(85);
  const [resolution, setResolution] = useState('1920x1080');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Online AI Generation states
  const [searchPrompt, setSearchPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch stock wallpapers on mount
  useEffect(() => {
    if (isOpen) {
      fetch('/api/wallpaper/stocks')
        .then(res => res.json())
        .then(data => {
          setStocks(data);
          if (data && data.length > 0 && !selectedStockId) {
            setSelectedStockId(data[0].id);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  // Render wallpaper onto HTML5 Canvas whenever dependencies change
  useEffect(() => {
    if (!isOpen) return;
    renderCanvas();
  }, [isOpen, selectedStockId, customBgUrl, position, opacity, resolution, tasks, stocks]);

  const drawGradientFallback = (ctx, width, height, currentStock) => {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, currentStock?.bgColor1 || '#141517');
    grad.addColorStop(1, currentStock?.bgColor2 || '#2a2b2d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Geometry ambient glow
    ctx.fillStyle = currentStock?.accent || '#7b68ee';
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.2, 450, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const [width, height] = resolution.split('x').map(Number);
    canvas.width = width;
    canvas.height = height;

    const currentStock = stocks.find(s => s.id === selectedStockId) || stocks[0] || {};
    const targetBgUrl = customBgUrl || currentStock?.imageUrl;

    if (targetBgUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw background image scaled to fill the entire canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Slight dark vignette overlay to guarantee readability of desktop widgets
        ctx.fillStyle = 'rgba(10, 11, 14, 0.22)';
        ctx.fillRect(0, 0, width, height);

        drawWidget(ctx, width, height, currentStock);
      };
      img.onerror = () => {
        // Graceful fallback
        drawGradientFallback(ctx, width, height, currentStock);
        drawWidget(ctx, width, height, currentStock);
      };
      img.src = targetBgUrl;
    } else {
      drawGradientFallback(ctx, width, height, currentStock);
      drawWidget(ctx, width, height, currentStock);
    }
  };

  const drawWidget = (ctx, width, height, currentStock) => {
    // Widget Dimensions
    const wWidth = 480;
    const wHeight = 560;
    const margin = 50;

    let wx = width - wWidth - margin;
    let wy = margin;

    if (position === 'top-left') {
      wx = margin;
      wy = margin;
    } else if (position === 'bottom-right') {
      wx = width - wWidth - margin;
      wy = height - wHeight - margin;
    } else if (position === 'bottom-left') {
      wx = margin;
      wy = height - wHeight - margin;
    }

    // Glassmorphic Card Container
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(wx, wy, wWidth, wHeight, 20);
    ctx.fillStyle = `rgba(20, 21, 24, ${opacity / 100})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header Content
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillText('Status+ Project Tracker', wx + 30, wy + 50);

    ctx.fillStyle = currentStock?.accent || '#7b68ee';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText(listName || 'Active Tasks', wx + 30, wy + 76);

    // Current Date
    const today = new Date().toLocaleDateString('th-TH', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText(today, wx + 30, wy + 102);

    // Stats Bar
    const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
    const percent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    // Progress Bar Background
    ctx.beginPath();
    ctx.roundRect(wx + 30, wy + 125, wWidth - 60, 8, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    // Progress Bar Fill
    if (percent > 0) {
      ctx.beginPath();
      ctx.roundRect(wx + 30, wy + 125, (wWidth - 60) * (percent / 100), 8, 4);
      ctx.fillStyle = '#26b26d';
      ctx.fill();
    }

    ctx.fillStyle = '#26b26d';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(`ความคืบหน้า ${percent}% (เสร็จสิ้น ${completedCount}/${tasks.length} รายการ)`, wx + 30, wy + 155);

    // Separator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(wx + 30, wy + 175);
    ctx.lineTo(wx + wWidth - 30, wy + 175);
    ctx.stroke();

    // Task Items List (Top 6 tasks)
    let itemY = wy + 210;
    const displayTasks = tasks.slice(0, 6);

    displayTasks.forEach(task => {
      // Status dot
      let dotColor = '#e2483d';
      if (task.status === 'COMPLETED') dotColor = '#26b26d';
      if (task.status === 'IN PROGRESS') dotColor = '#1e88e5';

      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(wx + 38, itemY - 5, 5, 0, Math.PI * 2);
      ctx.fill();

      // Task Name
      ctx.fillStyle = task.status === 'COMPLETED' ? '#6b7280' : '#f3f4f6';
      ctx.font = '14px "Segoe UI", sans-serif';
      const truncated = task.name.length > 32 ? task.name.slice(0, 30) + '...' : task.name;
      ctx.fillText(truncated, wx + 54, itemY);

      // Due date on right
      if (task.due_date) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px "Segoe UI", sans-serif';
        ctx.fillText(task.due_date.slice(5), wx + wWidth - 65, itemY);
      }

      itemY += 50;
    });

    ctx.restore();
  };

  // One-click Set Windows Wallpaper via API
  const handleApplyWallpaper = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsApplying(true);
    setApplySuccess(false);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch('/api/wallpaper/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl })
      });
      const data = await res.json();

      if (data.success) {
        setApplySuccess(true);
        setTimeout(() => setApplySuccess(false), 3500);
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error || 'ไม่สามารถตั้งค่าวอลเปเปอร์ได้'}`);
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อระบบตั้งค่าวอลเปเปอร์ได้');
    } finally {
      setIsApplying(false);
    }
  };

  // Download high-resolution PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `StatusPlus-Wallpaper-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Upload custom file
  const handleCustomUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('wallpaper', file);

    try {
      const res = await fetch('/api/wallpaper/upload-custom', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setCustomBgUrl(data.url);
        setSelectedStockId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate dynamic AI wallpaper from online prompt
  const handleGenerateAiWallpaper = async (promptToUse) => {
    const targetPrompt = promptToUse || searchPrompt;
    if (!targetPrompt || !targetPrompt.trim()) return;

    setIsGenerating(true);
    setGenerateError('');

    try {
      const res = await fetch('/api/wallpaper/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: targetPrompt.trim() })
      });
      const data = await res.json();

      if (data.success && data.imageUrl) {
        const newWallpaper = {
          id: `ai-${Date.now()}`,
          name: data.name || targetPrompt,
          category: 'AI Generated',
          imageUrl: data.imageUrl,
          thumbnail: data.thumbnail || data.imageUrl,
          accent: data.accent || '#a855f7'
        };

        setStocks(prev => [newWallpaper, ...prev]);
        setSelectedStockId(newWallpaper.id);
        setCustomBgUrl(null);
        setSelectedCategory('AI Generated');
        setSearchPrompt('');
      } else {
        setGenerateError(data.error || 'ไม่สามารถสร้างภาพ AI ได้');
      }
    } catch (err) {
      console.error(err);
      setGenerateError('เกิดข้อผิดพลาดในการเชื่อมต่อ AI Server');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  // Filter stocks by category
  const filteredStocks = selectedCategory === 'All' 
    ? stocks 
    : stocks.filter(s => s.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-5 select-none text-xs">
      <div className="bg-[#1e1f21] border border-[#383a3e] rounded-xl w-[1240px] max-w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#333538] flex items-center justify-between bg-[#18191b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-pink-600/20 text-pink-400 border border-pink-500/30">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Dynamic Windows Wallpaper Generator</h3>
              <p className="text-gray-400 text-[11px]">คลังภาพ Full HD 1080p และระบบ AI สร้างภาพสด พร้อมวิดเจ็ตแสดงงานเรียลไทม์</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#2a2b2d] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area: Left Controls & Right Live Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Settings Panel */}
          <div className="w-96 border-r border-[#333538] p-4 overflow-y-auto space-y-4 bg-[#18191b]">

            {/* AI Generator / Online Prompt Search */}
            <div className="space-y-2 p-3 bg-[#222427] border border-[#383a3e] rounded-lg">
              <label className="font-semibold text-gray-200 text-xs flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Sparkles size={13} className="text-purple-400" />
                  <span>สั่ง AI สร้างภาพวอลเปเปอร์ใหม่ (Online)</span>
                </span>
                {isGenerating && <Loader2 size={13} className="animate-spin text-purple-400" />}
              </label>

              <div className="flex space-x-1.5">
                <input 
                  type="text"
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateAiWallpaper(); }}
                  placeholder="เช่น Cyberpunk city rain, Neon galaxy..."
                  disabled={isGenerating}
                  className="flex-1 px-2.5 py-1.5 bg-[#18191b] border border-[#383a3e] rounded text-white text-xs outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  disabled={isGenerating || !searchPrompt.trim()}
                  onClick={() => handleGenerateAiWallpaper()}
                  className="px-3 py-1.5 bg-[#7b68ee] hover:bg-[#6a55e0] disabled:opacity-50 text-white font-medium rounded flex items-center space-x-1 text-xs transition cursor-pointer"
                >
                  <span>สร้าง</span>
                </button>
              </div>

              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap gap-1 pt-1">
                {QUICK_TAGS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => {
                      setSearchPrompt(tag);
                      handleGenerateAiWallpaper(tag);
                    }}
                    className="px-2 py-0.5 rounded bg-[#18191b] hover:bg-purple-950/40 border border-[#383a3e] hover:border-purple-500/40 text-gray-400 hover:text-purple-300 text-[10px] transition cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {generateError && (
                <div className="text-[11px] text-red-400 pt-1">
                  ⚠️ {generateError}
                </div>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300 text-xs flex items-center justify-between">
                <span>คลังภาพ Stock Wallpapers</span>
                <span className="text-gray-500 text-[10px]">({filteredStocks.length} ภาพ)</span>
              </label>

              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#7b68ee] text-white shadow-sm'
                        : 'bg-[#222427] text-gray-400 hover:text-white hover:bg-[#2c2e33]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Stock Wallpapers Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pt-1 pr-1">
                {filteredStocks.map(stk => (
                  <div
                    key={stk.id}
                    onClick={() => {
                      setSelectedStockId(stk.id);
                      setCustomBgUrl(null);
                    }}
                    className={`cursor-pointer rounded-md overflow-hidden border p-1 transition ${
                      selectedStockId === stk.id && !customBgUrl
                        ? 'border-[#7b68ee] ring-1 ring-[#7b68ee] bg-[#2a2b2d]'
                        : 'border-[#333538] hover:border-gray-500 bg-[#1e1f21]'
                    }`}
                  >
                    <div className="aspect-video w-full rounded overflow-hidden bg-black">
                      <img 
                        src={stk.thumbnail} 
                        alt={stk.name} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] text-gray-300 font-medium truncate block pt-1">
                      {stk.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Image Upload */}
            <div className="space-y-2 pt-2 border-t border-[#2a2b2d]">
              <label className="font-semibold text-gray-300 text-xs">อัปโหลดภาพของคุณเอง</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-[#222427] hover:bg-[#2c2e33] border border-dashed border-[#383a3e] rounded flex items-center justify-center space-x-2 text-gray-300 transition cursor-pointer"
              >
                <Upload size={14} />
                <span>เลือกรูปภาพจากเครื่อง...</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleCustomUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Placement & Opacity Controls */}
            <div className="space-y-3 pt-2 border-t border-[#2a2b2d]">
              <label className="font-semibold text-gray-300 text-xs flex items-center space-x-1">
                <Sliders size={13} />
                <span>ตำแหน่งและเอฟเฟกต์กล่องงาน</span>
              </label>

              {/* Position Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'top-left', label: 'ซ้ายบน' },
                  { id: 'top-right', label: 'ขวาบน' },
                  { id: 'bottom-left', label: 'ซ้ายล่าง' },
                  { id: 'bottom-right', label: 'ขวาล่าง' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPosition(p.id)}
                    className={`py-1 px-2 rounded text-xs transition cursor-pointer ${
                      position === p.id 
                        ? 'bg-[#7b68ee] text-white font-semibold' 
                        : 'bg-[#222427] text-gray-300 hover:bg-[#2a2b2d]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>ความทึบแสงของกล่อง (Opacity)</span>
                  <span>{opacity}%</span>
                </div>
                <input 
                  type="range"
                  min="30"
                  max="95"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#7b68ee]"
                />
              </div>

              {/* Resolution Picker */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400">ความละเอียดภาพ (Resolution)</label>
                <select 
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full p-1.5 bg-[#222427] border border-[#383a3e] rounded text-gray-200 outline-none"
                >
                  <option value="1920x1080">1920 x 1080 (Full HD 16:9)</option>
                  <option value="2560x1440">2560 x 1440 (2K QHD)</option>
                  <option value="3840x2160">3840 x 2160 (4K UHD)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Right Live Canvas Preview */}
          <div className="flex-1 bg-[#141517] p-6 flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* Live Canvas Element */}
            <div className="relative shadow-2xl rounded-lg overflow-hidden border border-[#333538] max-w-full max-h-[72vh] flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                className="w-full h-auto object-contain max-h-[70vh] rounded"
              />
            </div>

            {/* Bottom Floating Action Bar */}
            <div className="absolute bottom-5 flex items-center space-x-3 bg-[#1e1f21]/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-[#383a3e] shadow-2xl">
              <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-[#2a2b2e] hover:bg-[#34363a] text-gray-200 rounded-full flex items-center space-x-2 font-medium transition cursor-pointer"
              >
                <Download size={15} />
                <span>ดาวน์โหลดรูปภาพ (.PNG)</span>
              </button>

              <button 
                disabled={isApplying}
                onClick={handleApplyWallpaper}
                className="px-5 py-2 bg-[#26b26d] hover:bg-[#209a5d] text-white rounded-full flex items-center space-x-2 font-bold shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <RotateCcw size={15} className="animate-spin" />
                    <span>กำลังติดตั้งลง Windows...</span>
                  </>
                ) : applySuccess ? (
                  <>
                    <CheckCircle2 size={15} className="text-white" />
                    <span>ตั้งค่าเรียบร้อยแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Monitor size={15} />
                    <span>ตั้งเป็น Desktop Wallpaper ทันที</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
