const dc = require('./desktopController');

async function test() {
  console.log('--- TESTING DESKTOP CONTROLLER ---');

  try {
    const dc = require('./desktopController');
    const script = 'Get-Process | Where-Object { $_.ProcessName -match "electron|node" } | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json -Compress';
    const enc = Buffer.from(script, 'utf16le').toString('base64');
    const { execSync } = require('child_process');
    const out = execSync('powershell -NoProfile -EncodedCommand ' + enc);
    console.log('1. Active processes:', out.toString());
  } catch (e) {
    console.error('test error:', e.message);
  }

  try {
    const ss = await dc.takeScreenshot();
    console.log('2. Screenshot created:', ss.filePath, 'Has base64:', !!ss.base64Image);
  } catch (e) {
    console.error('takeScreenshot error:', e.message);
  }

  console.log('--- TEST COMPLETE ---');
}

test();
