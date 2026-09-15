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
  CheckCircle2
} from 'lucide-react';

export default function WallpaperModal({
  isOpen,
  onClose,
  tasks,
  listName
}) {
  const [stocks, setStocks] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState('stock-clickup-dark');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [position, setPosition] = useState('top-right'); // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  const [blur, setBlur] = useState(12);
  const [opacity, setOpacity] = useState(85);
  const [resolution, setResolution] = useState('1920x1080');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch stock wallpapers on mount
  useEffect(() => {
    if (isOpen) {
      fetch('/api/wallpaper/stocks')
        .then(res => res.json())
        .then(data => setStocks(data))
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  // Render wallpaper onto HTML5 Canvas whenever dependencies change
  useEffect(() => {
    if (!isOpen) return;
    renderCanvas();
  }, [isOpen, selectedStockId, customBgUrl, position, blur, opacity, resolution, tasks]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const [width, height] = resolution.split('x').map(Number);
    canvas.width = width;
    canvas.height = height;

    const currentStock = stocks.find(s => s.id === selectedStockId) || stocks[0];

    // 1. Draw Background
    if (customBgUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        drawWidget(ctx, width, height, currentStock);
      };
      img.src = customBgUrl;
      return;
    } else {
      // Draw Gradient stock
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, currentStock?.bgColor1 || '#141517');
      grad.addColorStop(1, currentStock?.bgColor2 || '#2a2b2d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle geometry / ambient glow
      ctx.fillStyle = currentStock?.accent || '#7b68ee';
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.2, 400, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

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
    ctx.fillStyle = `rgba(24, 25, 27, ${opacity / 100})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header Content
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillText('Project Tracker', wx + 30, wy + 50);

    ctx.fillStyle = currentStock?.accent || '#7b68ee';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText(listName || 'IQA26 Tasks', wx + 30, wy + 76);

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
    const inProgressCount = tasks.filter(t => t.status === 'IN PROGRESS').length;
    const notStartedCount = tasks.filter(t => t.status === 'NOT STARTED').length;
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
    ctx.fillText(`เสร็จแล้ว ${percent}% (${completedCount}/${tasks.length})`, wx + 30, wy + 155);

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
        setTimeout(() => setApplySuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเปลี่ยนวอลเปเปอร์ได้: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  // Download PNG file
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `project-wallpaper-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  // Upload custom background
  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomBgUrl(event.target.result);
      setSelectedStockId(null);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#1e1f21] border border-[#383a3e] rounded-xl w-[1050px] max-w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#333538] flex items-center justify-between bg-[#18191b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-pink-600/20 text-pink-400 border border-pink-500/30">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Dynamic Windows Wallpaper Generator</h3>
              <p className="text-gray-400 text-[11px]">สร้างและเปลี่ยนวอลเปเปอร์บนหน้าจอ Windows เพื่อติดตามงานแบบเรียลไทม์</p>
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
          <div className="w-80 border-r border-[#333538] p-4 overflow-y-auto space-y-5 bg-[#18191b]">
            {/* 1. Stock Wallpapers */}
            <div className="space-y-2">
              <label className="font-semibold text-gray-300 text-xs flex items-center justify-between">
                <span>คลังภาพ Stock Wallpapers</span>
                <span className="text-gray-500 text-[10px]">({stocks.length} แบบ)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {stocks.map(stk => (
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
                    <div className="aspect-video w-full rounded overflow-hidden">
                      <img src={stk.thumbnail} alt={stk.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-gray-300 font-medium truncate block pt-1">
                      {stk.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Custom Image Upload */}
            <div className="space-y-2 pt-2 border-t border-[#2a2b2d]">
              <label className="font-semibold text-gray-300 text-xs">อัปโหลดภาพของคุณเอง</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-[#222427] hover:bg-[#2c2e33] border border-dashed border-[#383a3e] rounded flex items-center justify-center space-x-2 text-gray-300 transition"
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

            {/* 3. Placement & Blur Controls */}
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
                    className={`py-1 px-2 rounded text-xs transition ${
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
                <label className="text-[11px] text-gray-400">ขนาดหน้าจอ Resolution</label>
                <select 
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full p-1.5 bg-[#222427] border border-[#383a3e] rounded text-white text-xs outline-none"
                >
                  <option value="1920x1080">Full HD (1920 x 1080)</option>
                  <option value="2560x1440">2K QHD (2560 x 1440)</option>
                  <option value="3840x2160">4K UHD (3840 x 2160)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Live Preview Canvas */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[#141517] overflow-hidden">
            <div className="relative border border-[#333538] rounded-lg shadow-2xl overflow-hidden max-w-full max-h-[55vh] aspect-video flex items-center justify-center bg-black">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-gray-500 text-[11px] mt-2">
              ภาพตัวอย่าง Live Preview ตามสเกลหน้าจอจริง {resolution}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#333538] bg-[#18191b] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {applySuccess && (
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs animate-bounce">
                <CheckCircle2 size={16} />
                <span>เปลี่ยนวอลเปเปอร์ Windows สำเร็จแล้ว!</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={handleDownloadImage}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#222427] hover:bg-[#2c2e33] border border-[#383a3e] rounded-md text-gray-200 font-medium transition"
            >
              <Download size={14} />
              <span>ดาวน์โหลด PNG</span>
            </button>

            <button 
              onClick={handleApplyWallpaper}
              disabled={isApplying}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-md shadow-lg transition"
            >
              <Monitor size={15} />
              <span>{isApplying ? 'กำลังปรับเปลี่ยน...' : 'ตั้งเป็นวอลเปเปอร์ Windows ทันที'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
