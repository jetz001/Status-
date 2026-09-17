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
  const [position, setPosition] = useState('center-right'); // 'center-right', 'center', 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  const [opacity, setOpacity] = useState(90);
  const [resolution, setResolution] = useState('1920x1080');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Task Scope & Sizing options
  const [taskSource, setTaskSource] = useState('all'); // 'all' | 'current'
  const [allTasks, setAllTasks] = useState([]);
  const [onlyPending, setOnlyPending] = useState(true);
  const [scalePercent, setScalePercent] = useState(125); // 75% - 200%
  const [maxTasksCount, setMaxTasksCount] = useState(8); // 6, 8, 10, 12

  // Online AI Generation states
  const [searchPrompt, setSearchPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch stock wallpapers and all tasks on mount
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

      fetch('/api/tasks/all')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllTasks(data);
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  // Render wallpaper onto HTML5 Canvas whenever dependencies change
  useEffect(() => {
    if (!isOpen) return;
    renderCanvas();
  }, [
    isOpen, 
    selectedStockId, 
    customBgUrl, 
    position, 
    opacity, 
    resolution, 
    tasks, 
    allTasks, 
    taskSource, 
    onlyPending, 
    scalePercent, 
    maxTasksCount, 
    stocks
  ]);

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
    // 1. Source Tasks Filtering
    const sourcePool = taskSource === 'all' ? (allTasks.length > 0 ? allTasks : tasks) : tasks;
    const filteredTasks = sourcePool.filter(t => {
      if (onlyPending) return t.status !== 'COMPLETED';
      return true;
    });

    const displayTasks = filteredTasks.slice(0, maxTasksCount);

    // 2. Scaling calculation
    // Base reference is Full HD 1920x1080
    const resFactor = Math.max(1.0, width / 1920);
    const userScale = scalePercent / 100;
    const totalScale = resFactor * userScale;

    // Dimensions
    const baseCardWidth = 540;
    const wWidth = Math.round(baseCardWidth * totalScale);
    const itemHeight = Math.round(48 * totalScale);
    const headerHeight = Math.round(180 * totalScale);
    const bottomPadding = Math.round(25 * totalScale);
    const wHeight = headerHeight + (Math.max(1, displayTasks.length) * itemHeight) + bottomPadding;

    const marginX = Math.round(60 * resFactor);
    const marginY = Math.round(60 * resFactor);
    const topAvoidMargin = Math.round(95 * resFactor); // Clears the Windows desktop icon row

    let wx = width - wWidth - marginX;
    let wy = marginY + topAvoidMargin;

    if (position === 'center-right') {
      wx = width - wWidth - marginX;
      wy = Math.max(marginY, Math.round((height - wHeight) / 2));
    } else if (position === 'center') {
      wx = Math.round((width - wWidth) / 2);
      wy = Math.max(marginY, Math.round((height - wHeight) / 2));
    } else if (position === 'top-left') {
      wx = marginX;
      wy = marginY + topAvoidMargin;
    } else if (position === 'top-right') {
      wx = width - wWidth - marginX;
      wy = marginY + topAvoidMargin;
    } else if (position === 'bottom-right') {
      wx = width - wWidth - marginX;
      wy = height - wHeight - marginY;
    } else if (position === 'bottom-left') {
      wx = marginX;
      wy = height - wHeight - marginY;
    }

    const padX = Math.round(32 * totalScale);

    // 3. Draw Glassmorphic Card Container with shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = Math.round(35 * totalScale);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(10 * totalScale);

    ctx.beginPath();
    ctx.roundRect(wx, wy, wWidth, wHeight, Math.round(24 * totalScale));
    ctx.fillStyle = `rgba(16, 18, 22, ${opacity / 100})`;
    ctx.fill();

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(1.5, Math.round(2 * resFactor));
    ctx.stroke();

    // 4. Header Content
    // App Title
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(24 * totalScale)}px "Segoe UI", sans-serif`;
    ctx.fillText('Status+ Project Tracker', wx + padX, wy + Math.round(48 * totalScale));

    // Scope Subtitle / Project Name
    const displayScope = taskSource === 'all' 
      ? `🌐 ทาสก์รวมทุกโปรเจกต์ (${sourcePool.length} งาน)`
      : `📁 ${listName || 'โปรเจกต์ปัจจุบัน'}`;
    ctx.fillStyle = currentStock?.accent || '#7b68ee';
    ctx.font = `bold ${Math.round(15 * totalScale)}px "Segoe UI", sans-serif`;
    ctx.fillText(displayScope, wx + padX, wy + Math.round(76 * totalScale));

    // Current Date
    const today = new Date().toLocaleDateString('th-TH', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    ctx.fillStyle = '#9ca3af';
    ctx.font = `${Math.round(13 * totalScale)}px "Segoe UI", sans-serif`;
    ctx.fillText(today, wx + padX, wy + Math.round(102 * totalScale));

    // Stats Bar
    const completedCount = sourcePool.filter(t => t.status === 'COMPLETED').length;
    const percent = sourcePool.length > 0 ? Math.round((completedCount / sourcePool.length) * 100) : 0;
    const barY = wy + Math.round(122 * totalScale);
    const barHeight = Math.round(8 * totalScale);
    const barWidth = wWidth - (padX * 2);

    // Progress Bar Background
    ctx.beginPath();
    ctx.roundRect(wx + padX, barY, barWidth, barHeight, Math.round(4 * totalScale));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();

    // Progress Bar Fill
    if (percent > 0) {
      ctx.beginPath();
      ctx.roundRect(wx + padX, barY, barWidth * (percent / 100), barHeight, Math.round(4 * totalScale));
      ctx.fillStyle = '#26b26d';
      ctx.fill();
    }

    ctx.fillStyle = '#26b26d';
    ctx.font = `bold ${Math.round(13 * totalScale)}px "Segoe UI", sans-serif`;
    const filterNote = onlyPending ? ' (แสดงเฉพาะงานค้าง)' : '';
    ctx.fillText(`ความคืบหน้า ${percent}% (เสร็จแล้ว ${completedCount}/${sourcePool.length} งาน)${filterNote}`, wx + padX, barY + Math.round(25 * totalScale));

    // Separator line
    const sepY = wy + Math.round(168 * totalScale);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = Math.max(1, Math.round(1 * totalScale));
    ctx.beginPath();
    ctx.moveTo(wx + padX, sepY);
    ctx.lineTo(wx + wWidth - padX, sepY);
    ctx.stroke();

    // 5. Task Items List
    let itemY = wy + Math.round(208 * totalScale);

    if (displayTasks.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `italic ${Math.round(14 * totalScale)}px "Segoe UI", sans-serif`;
      ctx.fillText('✨ ไม่มีงานค้างในรายการที่เลือก ยอดเยี่ยมมาก!', wx + padX, itemY + Math.round(10 * totalScale));
    } else {
      displayTasks.forEach((task) => {
        // Status dot
        let dotColor = '#ef4444'; // Red for not started
        if (task.status === 'COMPLETED') dotColor = '#26b26d';
        if (task.status === 'IN PROGRESS') dotColor = '#3b82f6';

        const dotRadius = Math.round(5.5 * totalScale);
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(wx + padX + dotRadius, itemY - Math.round(4 * totalScale), dotRadius, 0, Math.PI * 2);
        ctx.fill();

        let textStartX = wx + padX + (dotRadius * 2) + Math.round(10 * totalScale);

        // Project / List Pill Badge if viewing All Projects
        if (taskSource === 'all' && (task.list_name || task.space_name)) {
          const badgeText = task.list_name || task.space_name;
          ctx.font = `bold ${Math.round(10 * totalScale)}px "Segoe UI", sans-serif`;
          const badgeMetrics = ctx.measureText(badgeText);
          const badgeWidth = badgeMetrics.width + Math.round(12 * totalScale);
          const badgeHeight = Math.round(18 * totalScale);
          const badgeY = itemY - Math.round(15 * totalScale);

          ctx.beginPath();
          ctx.roundRect(textStartX, badgeY, badgeWidth, badgeHeight, Math.round(9 * totalScale));
          ctx.fillStyle = task.list_color ? `${task.list_color}44` : 'rgba(123, 104, 238, 0.3)';
          ctx.fill();
          ctx.strokeStyle = task.list_color || '#7b68ee';
          ctx.lineWidth = Math.max(1, Math.round(1 * totalScale));
          ctx.stroke();

          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(badgeText, textStartX + Math.round(6 * totalScale), itemY - Math.round(2 * totalScale));

          textStartX += badgeWidth + Math.round(8 * totalScale);
        }

        // Task Name
        ctx.fillStyle = task.status === 'COMPLETED' ? '#9ca3af' : '#ffffff';
        ctx.font = `${task.status === 'COMPLETED' ? 'normal' : '600'} ${Math.round(14 * totalScale)}px "Segoe UI", sans-serif`;
        
        // Measure remaining width for task title
        const maxTitleWidth = (wx + wWidth - padX) - textStartX - (task.due_date ? Math.round(75 * totalScale) : 0);
        let title = task.name;
        if (ctx.measureText(title).width > maxTitleWidth) {
          while (title.length > 3 && ctx.measureText(title + '...').width > maxTitleWidth) {
            title = title.slice(0, -1);
          }
          title += '...';
        }
        ctx.fillText(title, textStartX, itemY);

        // Due date on far right
        if (task.due_date) {
          ctx.fillStyle = '#9ca3af';
          ctx.font = `bold ${Math.round(11 * totalScale)}px "Segoe UI", sans-serif`;
          const dateStr = task.due_date.length >= 10 ? task.due_date.slice(5) : task.due_date;
          ctx.fillText(dateStr, wx + wWidth - padX - Math.round(55 * totalScale), itemY);
        }

        itemY += itemHeight;
      });
    }

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

            {/* 1. Task Source & Filter Controls */}
            <div className="space-y-2.5 pt-2 border-t border-[#2a2b2d]">
              <label className="font-semibold text-gray-300 text-xs flex items-center justify-between">
                <span>ขอบเขตข้อมูลงาน (Task Scope)</span>
                <span className="text-purple-400 text-[10px] font-bold">
                  {taskSource === 'all' ? `${allTasks.length} งานทั้งหมด` : `${tasks.length} งานในลิสต์`}
                </span>
              </label>

              {/* Source Toggle */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTaskSource('all')}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition cursor-pointer flex items-center justify-center space-x-1 ${
                    taskSource === 'all'
                      ? 'bg-purple-600 text-white font-bold shadow-sm'
                      : 'bg-[#222427] text-gray-400 hover:text-white hover:bg-[#2c2e33]'
                  }`}
                >
                  <span>🌐 ทุกโปรเจกต์</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskSource('current')}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition cursor-pointer flex items-center justify-center space-x-1 ${
                    taskSource === 'current'
                      ? 'bg-purple-600 text-white font-bold shadow-sm'
                      : 'bg-[#222427] text-gray-400 hover:text-white hover:bg-[#2c2e33]'
                  }`}
                >
                  <span>📁 เฉพาะลิสต์นี้</span>
                </button>
              </div>

              {/* Only Pending Filter */}
              <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer pt-0.5 select-none">
                <input 
                  type="checkbox"
                  checked={onlyPending}
                  onChange={(e) => setOnlyPending(e.target.checked)}
                  className="rounded accent-purple-500 cursor-pointer w-3.5 h-3.5"
                />
                <span>ซ่อนงานที่เสร็จแล้ว (แสดงเฉพาะงานค้าง)</span>
              </label>

              {/* Max Tasks Count */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-gray-400">จำนวนงานที่แสดง:</span>
                <div className="flex space-x-1">
                  {[6, 8, 10, 12].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setMaxTasksCount(cnt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                        maxTasksCount === cnt
                          ? 'bg-[#7b68ee] text-white'
                          : 'bg-[#222427] text-gray-400 hover:bg-[#2a2b2d]'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Text & Card Scale Control */}
            <div className="space-y-2 pt-2 border-t border-[#2a2b2d]">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-gray-300 flex items-center space-x-1">
                  <Sliders size={13} className="text-purple-400" />
                  <span>ขนาดตัวอักษรและการ์ด (Scale)</span>
                </label>
                <span className="font-bold text-purple-300 text-[11px]">{scalePercent}%</span>
              </div>
              <input 
                type="range"
                min="75"
                max="200"
                step="5"
                value={scalePercent}
                onChange={(e) => setScalePercent(Number(e.target.value))}
                className="w-full accent-[#7b68ee] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>75% (กะทัดรัด)</span>
                <span>125% (แนะนำ)</span>
                <span>200% (ใหญ่พิเศษ)</span>
              </div>
            </div>

            {/* 3. Placement & Opacity Controls */}
            <div className="space-y-3 pt-2 border-t border-[#2a2b2d]">
              <label className="font-semibold text-gray-300 text-xs flex items-center space-x-1">
                <Compass size={13} className="text-purple-400" />
                <span>ตำแหน่งการวางกล่องงาน</span>
              </label>

              {/* Position Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'center-right', label: 'กลางขวา (แนะนำหลบไอคอน)' },
                  { id: 'center', label: 'กึ่งกลางจอ' },
                  { id: 'top-right', label: 'ขวาบน' },
                  { id: 'bottom-right', label: 'ขวาล่าง' },
                  { id: 'top-left', label: 'ซ้ายบน' },
                  { id: 'bottom-left', label: 'ซ้ายล่าง' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPosition(p.id)}
                    className={`py-1.5 px-2 rounded text-[11px] transition cursor-pointer text-center ${
                      position === p.id 
                        ? 'bg-[#7b68ee] text-white font-bold shadow-sm' 
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
                  <span>ความทึบแสงของการ์ด (Opacity)</span>
                  <span className="font-bold text-gray-200">{opacity}%</span>
                </div>
                <input 
                  type="range"
                  min="40"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#7b68ee] cursor-pointer"
                />
              </div>

              {/* Resolution Picker */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400">ความละเอียดภาพ (Resolution)</label>
                <select 
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full p-1.5 bg-[#222427] border border-[#383a3e] rounded text-gray-200 outline-none text-xs"
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
