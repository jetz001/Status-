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
 * Curated preset stock wallpapers (12 high-resolution HD 1080p offline wallpapers)
 */
const STOCK_WALLPAPERS = [
  // 1. Dark Minimalist
  {
    id: 'stock-dark-obsidian',
    name: 'Dark Obsidian Glass',
    category: 'Dark Minimalist',
    imageUrl: '/wallpapers/dark-obsidian.jpg',
    thumbnail: '/wallpapers/dark-obsidian.jpg',
    accent: '#7b68ee'
  },
  {
    id: 'stock-dark-polygon',
    name: 'Geometric Polygonal Mesh',
    category: 'Dark Minimalist',
    imageUrl: '/wallpapers/dark-polygon.jpg',
    thumbnail: '/wallpapers/dark-polygon.jpg',
    accent: '#3b82f6'
  },
  // 2. Cyber & Neon
  {
    id: 'stock-cyber-city',
    name: 'Tokyo Cyberpunk Rain',
    category: 'Cyber Neon',
    imageUrl: '/wallpapers/cyber-neon-city.jpg',
    thumbnail: '/wallpapers/cyber-neon-city.jpg',
    accent: '#06b6d4'
  },
  {
    id: 'stock-neon-horizon',
    name: 'Neon Violet Horizon',
    category: 'Cyber Neon',
    imageUrl: '/wallpapers/neon-horizon.jpg',
    thumbnail: '/wallpapers/neon-horizon.jpg',
    accent: '#ec4899'
  },
  // 3. Deep Nature & Mountains
  {
    id: 'stock-midnight-mountain',
    name: 'Deep Midnight Mountain',
    category: 'Nature & Landscape',
    imageUrl: '/wallpapers/midnight-mountain.jpg',
    thumbnail: '/wallpapers/midnight-mountain.jpg',
    accent: '#38bdf8'
  },
  {
    id: 'stock-pine-forest',
    name: 'Nordic Pine Forest Mist',
    category: 'Nature & Landscape',
    imageUrl: '/wallpapers/pine-forest-mist.jpg',
    thumbnail: '/wallpapers/pine-forest-mist.jpg',
    accent: '#10b981'
  },
  {
    id: 'stock-milky-way',
    name: 'Milky Way Starry Night',
    category: 'Nature & Landscape',
    imageUrl: '/wallpapers/milky-way-galaxy.jpg',
    thumbnail: '/wallpapers/milky-way-galaxy.jpg',
    accent: '#818cf8'
  },
  // 4. Architecture & Workspace
  {
    id: 'stock-minimalist-desk',
    name: 'Clean Workspace Studio',
    category: 'Architecture & Desk',
    imageUrl: '/wallpapers/minimalist-desk.jpg',
    thumbnail: '/wallpapers/minimalist-desk.jpg',
    accent: '#f59e0b'
  },
  {
    id: 'stock-modern-architecture',
    name: 'Modern Geometric Architecture',
    category: 'Architecture & Desk',
    imageUrl: '/wallpapers/modern-architecture.jpg',
    thumbnail: '/wallpapers/modern-architecture.jpg',
    accent: '#64748b'
  },
  // 5. Abstract 3D
  {
    id: 'stock-purple-spheres',
    name: '3D Purple Liquid Spheres',
    category: 'Abstract 3D',
    imageUrl: '/wallpapers/purple-liquid-spheres.jpg',
    thumbnail: '/wallpapers/purple-liquid-spheres.jpg',
    accent: '#a855f7'
  },
  {
    id: 'stock-silk-flow',
    name: 'Silk Flow Gradient Wave',
    category: 'Abstract 3D',
    imageUrl: '/wallpapers/silk-gradient-flow.jpg',
    thumbnail: '/wallpapers/silk-gradient-flow.jpg',
    accent: '#ec4899'
  },
  {
    id: 'stock-cyber-sunset',
    name: 'Cyber Sunset Horizon',
    category: 'Abstract 3D',
    imageUrl: '/wallpapers/cyber-sunset.jpg',
    thumbnail: '/wallpapers/cyber-sunset.jpg',
    accent: '#f97316'
  }
];

module.exports = {
  setWindowsWallpaper,
  saveWallpaperDataUrl,
  STOCK_WALLPAPERS,
  WALLPAPER_DIR
};
