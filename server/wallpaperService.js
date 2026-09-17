const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const WALLPAPER_DIR = path.join(__dirname, '..', 'uploads', 'wallpapers');
if (!fs.existsSync(WALLPAPER_DIR)) {
  fs.mkdirSync(WALLPAPER_DIR, { recursive: true });
}

/**
 * Sets the desktop wallpaper on Windows using modern IDesktopWallpaper COM API
 * (supports PNG, JPG, multi-monitor, high-DPI fill) with fallback to SystemParametersInfo
 */
function setWindowsWallpaper(imagePath) {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(imagePath);
    if (!fs.existsSync(absolutePath)) {
      return reject(new Error(`Wallpaper image file not found: ${absolutePath}`));
    }

    // Escape single quotes for PowerShell single-quoted literal string
    const safePath = absolutePath.replace(/'/g, "''");

    const psCommand = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[ComImport]
[Guid("B92B56A9-8B55-4E14-9A89-0199BBB6F93B")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDesktopWallpaper
{
    void SetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.LPWStr)] string wallpaper);
    [return: MarshalAs(UnmanagedType.LPWStr)]
    string GetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID);
    [return: MarshalAs(UnmanagedType.LPWStr)]
    string GetMonitorDevicePathAt(uint monitorIndex);
    uint GetMonitorDevicePathCount();
    void GetMonitorRECT([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [Out] IntPtr rect);
    void SetBackgroundColor(uint color);
    uint GetBackgroundColor();
    void SetPosition(uint position);
    uint GetPosition();
    void SetSlideshow([MarshalAs(UnmanagedType.Interface)] IntPtr items);
    IntPtr GetSlideshow();
    void SetSlideshowOptions(uint options, uint slideshowTick);
    void GetSlideshowOptions(out uint options, out uint slideshowTick);
    void AdvanceSlideshow([MarshalAs(UnmanagedType.LPWStr)] string monitorID, uint direction);
    uint GetStatus();
    void Enable(bool enable);
}

[ComImport]
[Guid("C2CF3110-460E-4FC1-B9D0-8A1C0C9CC4BD")]
public class DesktopWallpaperCoClass {}

public class WallpaperManager
{
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);

    public static void SetWallpaper(string path)
    {
        try {
            var wallpaper = (IDesktopWallpaper)new DesktopWallpaperCoClass();
            wallpaper.SetPosition(4); // 4 = DWPO_FILL
            wallpaper.SetWallpaper(null, path); // null = all monitors
        } catch {
            // Fallback for older Windows
            SystemParametersInfo(0x0014, 0, path, 0x01 | 0x02);
        }
    }
}
"@
Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name WallpaperStyle -Value "10"
Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name TileWallpaper -Value "0"
[WallpaperManager]::SetWallpaper('${safePath}')
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
