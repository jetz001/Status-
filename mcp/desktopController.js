const { exec, execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = path.resolve(__dirname, '..');

/**
 * Execute a PowerShell script asynchronously with Base64 encoding
 */
function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr.trim() || err.message));
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * 1. TAKE SCREENSHOT
 * Captures full desktop or primary display, returns base64 and saves file
 */
async function takeScreenshot(options = {}) {
  const { outputPath } = options;
  const tempFile = outputPath || path.join(PROJECT_DIR, 'data', `screenshot-${Date.now()}.png`);
  
  const dataDir = path.dirname(tempFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $savePath = "${tempFile.replace(/\\/g, '\\\\')}"
    $bitmap.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Output "OK"
  `;

  await runPowerShell(psScript);

  if (fs.existsSync(tempFile)) {
    const fileBuffer = fs.readFileSync(tempFile);
    const base64 = fileBuffer.toString('base64');
    return {
      success: true,
      filePath: tempFile,
      base64Image: `data:image/png;base64,${base64}`,
      message: `บันทึกภาพหน้าจอเรียบร้อย: ${tempFile}`
    };
  } else {
    throw new Error('Screenshot file was not created.');
  }
}

/**
 * 2. MOUSE CLICK & MOVE
 * Moves cursor to (x, y) and performs left/right/double click
 */
async function clickMouse(options = {}) {
  const { x, y, button = 'left' } = options;
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('x and y coordinates are required as numbers.');
  }

  let downFlag = 0x02; // MOUSEEVENTF_LEFTDOWN
  let upFlag = 0x04;   // MOUSEEVENTF_LEFTUP
  let isDouble = button === 'double';

  if (button === 'right') {
    downFlag = 0x08; // MOUSEEVENTF_RIGHTDOWN
    upFlag = 0x10;   // MOUSEEVENTF_RIGHTUP
  }

  const psScript = `
    $cSource = @"
    using System;
    using System.Runtime.InteropServices;
    public class MouseSim {
      [DllImport("user32.dll")]
      public static extern bool SetCursorPos(int X, int Y);
      [DllImport("user32.dll")]
      public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    }
"@
    Add-Type -TypeDefinition $cSource -ErrorAction SilentlyContinue

    [MouseSim]::SetCursorPos(${Math.round(x)}, ${Math.round(y)})
    Start-Sleep -Milliseconds 50
    [MouseSim]::mouse_event(${downFlag}, 0, 0, 0, 0)
    [MouseSim]::mouse_event(${upFlag}, 0, 0, 0, 0)
    ${isDouble ? `
      Start-Sleep -Milliseconds 80
      [MouseSim]::mouse_event(${downFlag}, 0, 0, 0, 0)
      [MouseSim]::mouse_event(${upFlag}, 0, 0, 0, 0)
    ` : ''}
    Write-Output "OK"
  `;

  await runPowerShell(psScript);
  return {
    success: true,
    x,
    y,
    button,
    message: `คลิกเมาส์ (${button}) ที่พิกัด (${x}, ${y}) เรียบร้อย`
  };
}

/**
 * 3. KEYBOARD TYPE & HOTKEYS
 * Types string or sends hotkeys (e.g. ^k for Ctrl+K, {ENTER}, {ESC})
 */
async function typeInput(options = {}) {
  const { text, isHotkey = false } = options;
  if (!text) throw new Error('text is required to type.');

  let sendText = text;
  if (!isHotkey) {
    sendText = text
      .replace(/[\+\^\%\~\(\)\{\}\[\]]/g, '{$&}')
      .replace(/\n/g, '{ENTER}');
  }

  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait("${sendText.replace(/"/g, '""')}")
    Write-Output "OK"
  `;

  await runPowerShell(psScript);
  return {
    success: true,
    sent: text,
    isHotkey,
    message: isHotkey ? `ส่งคีย์ลัด '${text}' เรียบร้อย` : `พิมพ์ข้อความเรียบร้อย`
  };
}

/**
 * 4. LIST WINDOWS
 * Returns active visible desktop windows with their Titles and Process IDs using Win32 EnumWindows
 */
async function listWindows(filter = '') {
  const psScript = `
    $cSource = @"
    using System;
    using System.Collections.Generic;
    using System.Runtime.InteropServices;
    using System.Text;

    public class WinLister {
      [DllImport("user32.dll")]
      private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
      [DllImport("user32.dll")]
      private static extern int GetWindowText(IntPtr hWnd, StringBuilder strText, int maxCount);
      [DllImport("user32.dll")]
      private static extern int GetWindowTextLength(IntPtr hWnd);
      [DllImport("user32.dll")]
      private static extern bool IsWindowVisible(IntPtr hWnd);
      [DllImport("user32.dll")]
      public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

      private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

      public class Item {
        public long handle;
        public string title;
        public uint pid;
      }

      public static List<Item> GetWindows() {
        List<Item> res = new List<Item>();
        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
          if (IsWindowVisible(hWnd)) {
            int len = GetWindowTextLength(hWnd);
            if (len > 0) {
              StringBuilder sb = new StringBuilder(len + 1);
              GetWindowText(hWnd, sb, sb.Capacity);
              string t = sb.ToString();
              if (!string.IsNullOrWhiteSpace(t)) {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                res.Add(new Item { handle = hWnd.ToInt64(), title = t, pid = pid });
              }
            }
          }
          return true;
        }, IntPtr.Zero);
        return res;
      }
    }
"@
    Add-Type -TypeDefinition $cSource -ErrorAction SilentlyContinue
    [WinLister]::GetWindows() | ConvertTo-Json -Compress
  `;

  const output = await runPowerShell(psScript);
  let list = [];
  try {
    const parsed = JSON.parse(output);
    list = Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    list = [];
  }

  if (filter) {
    const q = filter.toLowerCase();
    list = list.filter(w => w.title && w.title.toLowerCase().includes(q));
  }

  return {
    success: true,
    count: list.length,
    windows: list.map(w => ({
      pid: w.pid,
      handle: w.handle,
      title: w.title
    }))
  };
}

/**
 * 5. ACTIVATE / FOCUS WINDOW
 * Brings a specific window to foreground by title match
 */
async function activateWindow(title) {
  if (!title) throw new Error('Window title or keyword is required.');

  const psScript = `
    $cSource = @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;

    public class WinActivator {
      [DllImport("user32.dll")]
      private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
      [DllImport("user32.dll")]
      private static extern int GetWindowText(IntPtr hWnd, StringBuilder strText, int maxCount);
      [DllImport("user32.dll")]
      private static extern int GetWindowTextLength(IntPtr hWnd);
      [DllImport("user32.dll")]
      private static extern bool IsWindowVisible(IntPtr hWnd);
      [DllImport("user32.dll")]
      public static extern bool SetForegroundWindow(IntPtr hWnd);
      [DllImport("user32.dll")]
      public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

      private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

      public static string Activate(string target) {
        IntPtr found = IntPtr.Zero;
        string foundTitle = "";

        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
          if (IsWindowVisible(hWnd)) {
            int len = GetWindowTextLength(hWnd);
            if (len > 0) {
              StringBuilder sb = new StringBuilder(len + 1);
              GetWindowText(hWnd, sb, sb.Capacity);
              string t = sb.ToString();
              if (t.IndexOf(target, StringComparison.OrdinalIgnoreCase) >= 0) {
                found = hWnd;
                foundTitle = t;
                return false; // stop
              }
            }
          }
          return true;
        }, IntPtr.Zero);

        if (found != IntPtr.Zero) {
          ShowWindowAsync(found, 9); // SW_RESTORE
          SetForegroundWindow(found);
          return "FOUND:" + foundTitle;
        }
        return "NOT_FOUND";
      }
    }
"@
    Add-Type -TypeDefinition $cSource -ErrorAction SilentlyContinue
    [WinActivator]::Activate("${title.replace(/"/g, '""')}")
  `;

  const res = await runPowerShell(psScript);
  if (res.startsWith('FOUND:')) {
    return {
      success: true,
      foundTitle: res.replace('FOUND:', ''),
      message: `สลับโฟกัสไปยังหน้าต่าง "${res.replace('FOUND:', '')}" เรียบร้อยแล้ว`
    };
  } else {
    throw new Error(`ไม่พบหน้าต่างที่ตรงกับชื่อ "${title}" บนระบบ`);
  }
}

/**
 * 6. APP LIFECYCLE: LAUNCH STATUS+
 */
async function launchStatusPlusApp() {
  try {
    const windows = await listWindows('Status+');
    if (windows.windows.length > 0) {
      await activateWindow('Status+');
      return {
        success: true,
        alreadyRunning: true,
        message: 'โปรแกรม Status+ เปิดทำงานอยู่แล้ว ได้ทำการดึงหน้าต่างขึ้นมาด้านหน้าให้เรียบร้อยครับ'
      };
    }
  } catch (e) {}

  const child = spawn('npm.cmd', ['start'], {
    cwd: PROJECT_DIR,
    detached: true,
    stdio: 'ignore',
    shell: true
  });
  child.unref();

  return {
    success: true,
    pid: child.pid,
    message: 'ส่งคำสั่งเปิดโปรแกรม Status+ เรียบร้อยแล้ว (กำลังโหลดขึ้นมาในพื้นหลัง)'
  };
}

/**
 * 7. APP LIFECYCLE: FOCUS STATUS+
 */
async function focusStatusPlusApp() {
  return await activateWindow('Status+');
}

/**
 * 8. APP LIFECYCLE: QUIT STATUS+
 */
async function quitStatusPlusApp(options = {}) {
  const { force = false } = options;

  const psScript = `
    $electronProcs = Get-Process -Name "electron" -ErrorAction SilentlyContinue
    if ($electronProcs) {
      if (${force ? '$true' : '$false'}) {
        $electronProcs | Stop-Process -Force
      } else {
        $electronProcs | ForEach-Object { $_.CloseMainWindow() }
        Start-Sleep -Seconds 1
        Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
      }
      Write-Output "CLOSED"
    } else {
      Write-Output "NOT_RUNNING"
    }
  `;

  const res = await runPowerShell(psScript);
  return {
    success: true,
    force,
    message: res === 'CLOSED' ? 'ปิดโปรแกรม Status+ เรียบร้อยแล้ว' : 'โปรแกรม Status+ ไม่ได้กำลังเปิดอยู่'
  };
}

module.exports = {
  takeScreenshot,
  clickMouse,
  typeInput,
  listWindows,
  activateWindow,
  launchStatusPlusApp,
  focusStatusPlusApp,
  quitStatusPlusApp
};
