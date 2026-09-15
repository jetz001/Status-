const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const WALLPAPER_DIR = path.join(__dirname, '..', 'uploads', 'wallpapers');
if (!fs.existsSync(WALLPAPER_DIR)) {
  fs.mkdirSync(WALLPAPER_DIR, { recursive: true });
}

/**
 * Sets the desktop wallpaper on Windows using PowerShell SystemParametersInfo API
 */
function setWindowsWallpaper(imagePath) {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(imagePath);
    if (!fs.existsSync(absolutePath)) {
      return reject(new Error(`Wallpaper image file not found: ${absolutePath}`));
    }

    // Escape backslashes for PowerShell string
    const safePath = absolutePath.replace(/\\/g, '\\\\');

    const psCommand = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
[Wallpaper]::SystemParametersInfo(0x0014, 0, "${safePath}", 0x01 -bor 0x02)
`;

    // Encode to base64 for safe powershell -EncodedCommand execution
    const encoded = Buffer.from(psCommand, 'utf16le').toString('base64');
    const fullCmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;

    exec(fullCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to set Windows wallpaper:', error);
        return reject(error);
      }
      console.log('Successfully set Windows desktop wallpaper to:', absolutePath);
      resolve({ success: true, path: absolutePath });
    });
  });
}

/**
 * Saves a base64 image data URL to disk
 */
function saveWallpaperDataUrl(dataUrl, filename = 'current_wallpaper.png') {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const targetPath = path.join(WALLPAPER_DIR, filename);
  fs.writeFileSync(targetPath, buffer);
  return targetPath;
}

/**
 * Curated preset stock wallpapers (SVG data URLs / gradients so they are 100% offline and look stunning!)
 */
const STOCK_WALLPAPERS = [
  {
    id: 'stock-clickup-dark',
    name: 'ClickUp Slate Studio',
    category: 'Dark Minimalist',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23141517"/><stop offset="50%" stop-color="%231e1f21"/><stop offset="100%" stop-color="%232a2b2d"/></linearGradient></defs><rect width="300" height="180" fill="url(%23g1)"/><circle cx="240" cy="50" r="80" fill="%237b68ee" opacity="0.15"/><path d="M0 140 Q150 90 300 130" stroke="%237b68ee" stroke-width="2" fill="none" opacity="0.3"/></svg>',
    bgType: 'gradient',
    bgColor1: '#141517',
    bgColor2: '#2a2b2d',
    accent: '#7b68ee'
  },
  {
    id: 'stock-cyber-neon',
    name: 'Cyber Neon Purple',
    category: 'Sci-Fi / Cyber',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%230b0b14"/><stop offset="100%" stop-color="%231a102f"/></linearGradient></defs><rect width="300" height="180" fill="url(%23g2)"/><circle cx="60" cy="120" r="100" fill="%23ec4899" opacity="0.2"/><circle cx="250" cy="40" r="90" fill="%2306b6d4" opacity="0.2"/><line x1="0" y1="160" x2="300" y2="160" stroke="%23a855f7" stroke-width="2" opacity="0.4"/></svg>',
    bgType: 'gradient',
    bgColor1: '#0b0b14',
    bgColor2: '#1a102f',
    accent: '#06b6d4'
  },
  {
    id: 'stock-nature-peaks',
    name: 'Deep Midnight Mountain',
    category: 'Nature & Landscape',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%231e293b"/></linearGradient></defs><rect width="300" height="180" fill="url(%23g3)"/><polygon points="0,180 80,80 160,180" fill="%23334155" opacity="0.6"/><polygon points="100,180 200,60 300,180" fill="%23475569" opacity="0.8"/><circle cx="230" cy="45" r="18" fill="%23f8fafc" opacity="0.7"/></svg>',
    bgType: 'gradient',
    bgColor1: '#0f172a',
    bgColor2: '#1e293b',
    accent: '#38bdf8'
  },
  {
    id: 'stock-warm-obsidian',
    name: 'Warm Productivity Glow',
    category: 'Abstract Gradients',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%231c1917"/><stop offset="100%" stop-color="%23292524"/></linearGradient></defs><rect width="300" height="180" fill="url(%23g4)"/><circle cx="260" cy="150" r="110" fill="%23f59e0b" opacity="0.2"/><circle cx="40" cy="30" r="70" fill="%23ef4444" opacity="0.15"/></svg>',
    bgType: 'gradient',
    bgColor1: '#1c1917',
    bgColor2: '#292524',
    accent: '#f59e0b'
  }
];

module.exports = {
  setWindowsWallpaper,
  saveWallpaperDataUrl,
  STOCK_WALLPAPERS,
  WALLPAPER_DIR
};
