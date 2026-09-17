#!/usr/bin/env node
/**
 * Status+ Model Context Protocol (MCP) Server
 * Standard JSON-RPC 2.0 Stdio Transport for Claude Desktop, Cursor, Antigravity, and AI Agents
 */

// Route all general logging to stderr so stdout is purely for JSON-RPC 2.0 protocol
console.log = (...args) => {
  process.stderr.write(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
};

const readline = require('readline');
const path = require('path');
const fs = require('fs');

const {
  takeScreenshot,
  clickMouse,
  typeInput,
  listWindows,
  activateWindow,
  launchStatusPlusApp,
  focusStatusPlusApp,
  quitStatusPlusApp,
  cleanupTempFiles,
  getTempFilesStatus
} = require('./desktopController');

// Direct DB & Tool fallbacks for Offline Mode
const { db, logMcpActivity } = require('../server/db');
const { executeTool } = require('../server/aiTools');
const { semanticSearch } = require('../server/ragService');

const LOCAL_API_URL = 'http://localhost:3001';

/**
 * Hybrid Helper: Call Local Express API if online, or fallback to direct DB/tools
 */
async function callApiOrFallback(endpoint, options = {}, fallbackFn = null) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${LOCAL_API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Server is not running or timeout -> Fallback seamlessly
  }

  if (fallbackFn) {
    return await fallbackFn();
  }
  throw new Error(`API ${endpoint} is offline and no direct fallback available.`);
}

/**
 * Tool Specifications for MCP Protocol
 */
const TOOLS = [
  // 1. App Lifecycle
  {
    name: 'status_app_launch',
    description: 'เปิดโปรแกรม Status+ Project Manager บน Windows (เริ่มต้น Express backend, Vite, และหน้าต่าง Electron)',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['start', 'dev'], description: 'โหมดการเปิด (ค่าเริ่มต้น start)' }
      }
    }
  },
  {
    name: 'status_app_focus',
    description: 'ดึงหน้าต่างโปรแกรม Status+ ขึ้นมาอยู่ด้านหน้าสุดของหน้าจอ (Foreground Focus)',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'status_app_quit',
    description: 'ปิดโปรแกรม Status+ บน Windows อย่างปลอดภัย (หรือสั่ง Force Kill)',
    inputSchema: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'บังคับปิดทันทีหรือไม่ (ค่าเริ่มต้น false ปิดอย่างนุ่มนวล)' }
      }
    }
  },

  // 2. Windows Desktop Control
  {
    name: 'status_desktop_screenshot',
    description: 'ถ่ายภาพหน้าจอ Windows ปัจจุบัน ส่งคืนเป็นภาพ Base64 และบันทึกเป็นไฟล์ ให้ AI สามารถมองเห็นหน้าจอและวิเคราะห์สิ่งที่แสดงอยู่ได้',
    inputSchema: {
      type: 'object',
      properties: {
        outputPath: { type: 'string', description: 'พาธที่ต้องการบันทึกไฟล์ภาพ (ไม่ระบุจะบันทึกลงโฟลเดอร์ data ให้อัตโนมัติ)' }
      }
    }
  },
  {
    name: 'status_desktop_click',
    description: 'สั่งจำลองการคลิกเมาส์ที่พิกัด X, Y บนหน้าจอ Windows (รองรับคลิกซ้าย, คลิกขวา, ดับเบิ้ลคลิก)',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'พิกัดแนวนอน X (พิกเซล)' },
        y: { type: 'number', description: 'พิกัดแนวตั้ง Y (พิกเซล)' },
        button: { type: 'string', enum: ['left', 'right', 'double'], description: 'ประเภทการคลิก (ค่าเริ่มต้น left)' }
      },
      required: ['x', 'y']
    }
  },
  {
    name: 'status_desktop_type',
    description: 'พิมพ์ข้อความ หรือส่งปุ่มลัดคีย์บอร์ด (Hotkeys เช่น ^k สำหรับ Ctrl+K, {ENTER}, {ESC}) บน Windows',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'ข้อความหรือรหัสคีย์ที่ต้องการส่ง' },
        isHotkey: { type: 'boolean', description: 'ส่งเป็นคีย์ลัดพิเศษหรือไม่ (เช่น true สำหรับ ^k, {ENTER})' }
      },
      required: ['text']
    }
  },
  {
    name: 'status_desktop_list_windows',
    description: 'ตรวจสอบรายชื่อหน้าต่างโปรแกรมที่กำลังเปิดทำงานอยู่ทั้งหมดบน Windows พร้อม Process ID และ Title',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'คำค้นหากรองชื่อโปรแกรมหรือหน้าต่าง' }
      }
    }
  },
  {
    name: 'status_desktop_activate_window',
    description: 'สลับโฟกัสหน้าจอไปยังหน้าต่างโปรแกรมใดๆ บน Windows ตามชื่อ Title หรือคำค้นหา',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'ชื่อหรือคำสำคัญของหน้าต่างที่ต้องการสลับไป' }
      },
      required: ['title']
    }
  },

  // 3. Status+ Tasks & Project Management
  {
    name: 'status_get_overview',
    description: 'ดึงสรุปภาพรวมโครงการ (Project Overview & KPI Metrics) เช่น จำนวนงานทั้งหมด, งานที่เสร็จแล้ว (COMPLETED), กำลังทำ (IN PROGRESS), ยังไม่เริ่ม (NOT STARTED), และอัตราความสำเร็จ %',
    inputSchema: {
      type: 'object',
      properties: {
        list_id: { type: 'string', description: 'รหัสลิสต์ที่ต้องการสรุป (ไม่ใส่จะสรุปภาพรวมทุกโครงการ)' }
      }
    }
  },
  {
    name: 'status_list_tasks',
    description: 'ดึงรายการงานในระบบ Status+ สามารถเลือกดูตาม listId, สถานะ, หรือค้นหาชื่องาน',
    inputSchema: {
      type: 'object',
      properties: {
        list_id: { type: 'string', description: 'รหัสลิสต์ที่ต้องการดู (ระบุ "all" เพื่อดูงานทุกโปรเจกต์)' },
        status: { type: 'string', enum: ['COMPLETED', 'IN PROGRESS', 'NOT STARTED'], description: 'กรองตามสถานะงาน' },
        priority: { type: 'string', enum: ['Urgent', 'High', 'Normal', 'Low'], description: 'กรองตามระดับความสำคัญ' }
      }
    }
  },
  {
    name: 'status_get_task',
    description: 'ดึงข้อมูลรายละเอียดเชิงลึกของงานชิ้นใดชิ้นหนึ่ง รวมถึง Checklist งานย่อย (Subtasks), รูปภาพแนบ, และฟิลด์กำหนดเอง',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'รหัสประจำตัวงาน (Task ID)' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'status_create_task',
    description: 'สร้างงานใหม่ใน Status+ พร้อมระบุชื่องาน, รายละเอียด, กำหนดส่ง, ระดับความสำคัญ, และรายการ Checklist ย่อย',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'ชื่องานที่ต้องการสร้าง' },
        description: { type: 'string', description: 'คำอธิบายหรือขอบเขตงาน' },
        list_id: { type: 'string', description: 'รหัสลิสต์ที่ต้องการให้งานนี้อยู่ (ไม่ใส่จะใส่ลงลิสต์แรก)' },
        priority: { type: 'string', enum: ['Urgent', 'High', 'Normal', 'Low'], description: 'ความสำคัญ (ค่าเริ่มต้น Normal)' },
        due_date: { type: 'string', description: 'วันกำหนดส่งในรูปแบบ YYYY-MM-DD' },
        subtasks: { type: 'array', items: { type: 'string' }, description: 'รายการ Checklist ย่อย เช่น ["ข้อ 1", "ข้อ 2"]' }
      },
      required: ['name']
    }
  },
  {
    name: 'status_update_task',
    description: 'ปรับปรุงแก้ไขข้อมูลงาน เช่น เปลี่ยนสถานะงาน (COMPLETED, IN PROGRESS, NOT STARTED), เปลี่ยนวันกำหนดส่ง, เปลี่ยนชื่อ หรือผู้รับผิดชอบ',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'รหัสประจำตัวงาน หรือชื่องาน' },
        name: { type: 'string', description: 'เปลี่ยนชื่องานใหม่' },
        status: { type: 'string', enum: ['COMPLETED', 'IN PROGRESS', 'NOT STARTED'], description: 'สถานะงานใหม่' },
        priority: { type: 'string', enum: ['Urgent', 'High', 'Normal', 'Low'], description: 'ระดับความสำคัญใหม่' },
        due_date: { type: 'string', description: 'วันกำหนดส่งใหม่ (YYYY-MM-DD)' },
        description: { type: 'string', description: 'รายละเอียดงานใหม่' },
        assignee: { type: 'string', description: 'ผู้รับผิดชอบงาน' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'status_delete_task',
    description: 'ลบงานออกจากระบบ Status+ (ต้องส่ง confirmed: true เพื่อความปลอดภัย)',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'รหัสงาน หรือชื่องานที่ต้องการลบ' },
        confirmed: { type: 'boolean', description: 'ต้องระบุ true เพื่อยืนยันการลบจริง' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'status_add_subtasks',
    description: 'เพิ่มรายการ Checklist ย่อยเข้าไปในงานที่มีอยู่แล้ว',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'รหัสงาน หรือชื่องาน' },
        subtasks: { type: 'array', items: { type: 'string' }, description: 'รายการข้อย่อย Checklist ที่ต้องการเพิ่ม' }
      },
      required: ['task_id', 'subtasks']
    }
  },
  {
    name: 'status_toggle_subtask',
    description: 'ทำเครื่องหมายเสร็จสิ้น หรือยังไม่เสร็จ สำหรับข้อย่อย Checklist ในงาน',
    inputSchema: {
      type: 'object',
      properties: {
        subtask_id: { type: 'string', description: 'รหัสข้อย่อย Checklist' },
        completed: { type: 'boolean', description: 'true = เสร็จสิ้น, false = ยังไม่เสร็จ' }
      },
      required: ['subtask_id', 'completed']
    }
  },
  {
    name: 'status_search_tasks_semantic',
    description: 'ค้นหางานในระบบ Status+ ด้วย Semantic Vector Search (RAG) เข้าใจความหมายของข้อความแม้ใช้คำไม่ตรงกัน',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'ข้อความหรือคำถามที่ต้องการค้นหา' },
        limit: { type: 'number', description: 'จำนวนผลลัพธ์ที่ต้องการ (ค่าเริ่มต้น 5)' }
      },
      required: ['query']
    }
  },
  {
    name: 'status_list_spaces_and_lists',
    description: 'ดึงโครงสร้าง Spaces (แผนก/หมวดหมู่) และ Lists (โฟลเดอร์โครงการ) ทั้งหมดในระบบ Status+',
    inputSchema: { type: 'object', properties: {} }
  },

  // 4. Mandatory Audit & Execution Reporting
  {
    name: 'status_submit_execution_report',
    description: '🔴 กฎบังคับ (MANDATORY RULE): AI ภายนอกทุกตัวที่เข้ามาปฏิบัติการในระบบ Status+ จะต้องเรียกใช้เครื่องมือนี้เพื่อส่งรายงานสรุปผลการทำงานทุกครั้งหลังจากทำงานเสร็จสิ้น เพื่อบันทึกประวัติการใช้งานให้ผู้ใช้ตรวจสอบได้ที่เมนู Settings (การตั้งค่า) > ประวัติ AI ภายนอก (ระบบจะล้างไฟล์ภาพหน้าจอชั่วคราวที่ใช้ในการวิเคราะห์ข้อมูลให้อัตโนมัติ)',
    inputSchema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'ชื่อหรือโมเดลของ AI (เช่น Claude 3.5 Sonnet, Cursor Agent, Antigravity)' },
        summary_of_work: { type: 'string', description: 'สรุปเนื้องานที่ AI ได้เข้ามาดำเนินการในระบบอย่างละเอียด เช่น สร้างงานใหม่ ปรับสถานะงาน ฯลฯ' },
        tasks_modified: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'รายชื่องาน หรือรหัส Task ID ที่มีการสร้าง แก้ไข เปลี่ยนสถานะ หรือลบ (ถ้ามี)' 
        },
        notes: { type: 'string', description: 'หมายเหตุ ปัญหาที่พบ หรือข้อเสนอแนะเพิ่มเติมสำหรับผู้ใช้งาน' },
        status: { 
          type: 'string', 
          enum: ['completed', 'partial', 'failed'], 
          description: 'ผลลัพธ์การทำงาน (completed = สำเร็จสมบูรณ์, partial = สำเร็จบางส่วน, failed = ล้มเหลว)' 
        }
      },
      required: ['summary_of_work']
    }
  },

  // 5. Temp Files & Cache Management
  {
    name: 'status_clean_temp_files',
    description: 'ล้างไฟล์ชั่วคราว ภาพแคปหน้าจอ (Screenshots) ที่ใช้ในการวิเคราะห์ข้อมูล และแคชที่ไม่จำเป็นทั้งหมด เพื่อคืนพื้นที่ฮาร์ดดิสก์และป้องกันการบวมของข้อมูล (Disk Bloat)',
    inputSchema: {
      type: 'object',
      properties: {
        keep_recent: { type: 'boolean', description: 'เก็บภาพล่าสุดไว้ 1 ภาพหรือไม่ (ค่าเริ่มต้น false ล้างทั้งหมด)' }
      }
    }
  }
];

/**
 * Handle Tool Execution
 */
async function handleToolCall(name, args) {
  switch (name) {
    // 1. App Lifecycle
    case 'status_app_launch':
      return await launchStatusPlusApp();
    case 'status_app_focus':
      return await focusStatusPlusApp();
    case 'status_app_quit':
      return await quitStatusPlusApp(args);

    // 2. Desktop Control
    case 'status_desktop_screenshot':
      return await takeScreenshot(args);
    case 'status_desktop_click':
      return await clickMouse(args);
    case 'status_desktop_type':
      return await typeInput(args);
    case 'status_desktop_list_windows':
      return await listWindows(args?.filter);
    case 'status_desktop_activate_window':
      return await activateWindow(args.title);

    // 3. Status+ Tasks & Management
    case 'status_get_overview':
      return await executeTool('get_project_overview', args);

    case 'status_list_tasks': {
      const listId = args?.list_id || 'all';
      return await callApiOrFallback(
        listId === 'all' ? '/api/tasks/all' : `/api/tasks?listId=${listId}`,
        { method: 'GET' },
        async () => {
          let query = 'SELECT * FROM tasks';
          const params = [];
          if (listId && listId !== 'all') {
            query += ' WHERE list_id = ?';
            params.push(listId);
          }
          if (args?.status) {
            query += (params.length ? ' AND' : ' WHERE') + ' status = ?';
            params.push(args.status);
          }
          if (args?.priority) {
            query += (params.length ? ' AND' : ' WHERE') + ' priority = ?';
            params.push(args.priority);
          }
          query += ' ORDER BY due_date ASC, created_at DESC';
          return db.prepare(query).all(...params);
        }
      );
    }

    case 'status_get_task': {
      return await callApiOrFallback(
        `/api/tasks/${args.task_id}`,
        { method: 'GET' },
        async () => {
          const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.task_id);
          if (!task) throw new Error(`ไม่พบงาน ID ${args.task_id}`);
          const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC').all(args.task_id);
          const attachments = db.prepare('SELECT * FROM attachments WHERE task_id = ?').all(args.task_id);
          return { ...task, subtasks, attachments };
        }
      );
    }

    case 'status_create_task':
      return await executeTool('create_task', args);

    case 'status_update_task':
      return await executeTool('update_task', args);

    case 'status_delete_task': {
      if (!args.confirmed) {
        return {
          requiresConfirmation: true,
          message: `⚠️ คำเตือน: คุณต้องการลบงาน "${args.task_id}" จริงหรือไม่? กรุณาส่งพารามิเตอร์ confirmed: true เพื่อยืนยันการลบอย่างปลอดภัย`
        };
      }
      return await executeTool('delete_task', { name: args.task_id, confirmed: true });
    }

    case 'status_add_subtasks':
      return await executeTool('create_subtasks', { task_name: args.task_id, subtasks: args.subtasks });

    case 'status_toggle_subtask': {
      return await callApiOrFallback(
        `/api/subtasks/${args.subtask_id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ completed: args.completed })
        },
        async () => {
          db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(args.completed ? 1 : 0, args.subtask_id);
          return { success: true, message: `อัปเดตข้อย่อย Checklist ${args.subtask_id} เป็น ${args.completed ? 'เสร็จสิ้น' : 'ยังไม่เสร็จ'}` };
        }
      );
    }

    case 'status_search_tasks_semantic': {
      const results = semanticSearch(args.query, args.limit || 5);
      return {
        query: args.query,
        count: results.length,
        results
      };
    }

    case 'status_list_spaces_and_lists': {
      return await callApiOrFallback(
        '/api/spaces',
        { method: 'GET' },
        async () => {
          const spaces = db.prepare('SELECT * FROM spaces ORDER BY position ASC').all();
          const lists = db.prepare('SELECT * FROM lists ORDER BY position ASC').all();
          return spaces.map(s => ({
            ...s,
            lists: lists.filter(l => l.space_id === s.id)
          }));
        }
      );
    }

    case 'status_submit_execution_report': {
      const clientName = args.client_name || 'External AI Agent';
      const summary = args.summary_of_work || '';
      const tasksModified = args.tasks_modified || [];
      const notes = args.notes || '';
      const execStatus = args.status || 'completed';

      logMcpActivity({
        client_name: clientName,
        action_type: 'execution_report',
        tool_name: 'status_submit_execution_report',
        input_params: args,
        result_summary: `ส่งรายงานสรุปงาน: ${summary.slice(0, 120)}`,
        report_text: JSON.stringify({
          client_name: clientName,
          summary,
          tasks_modified: tasksModified,
          notes,
          status: execStatus,
          timestamp: new Date().toISOString()
        }),
        status: execStatus === 'failed' ? 'error' : 'success'
      });

      // Auto-purge temporary analysis screenshots and temp files upon session finish
      let cleanupRes = null;
      try {
        cleanupRes = cleanupTempFiles();
      } catch (e) {}

      return {
        success: true,
        message: `✅ ได้รับและบันทึกรายงานสรุปผลการทำงานของ ${clientName} เรียบร้อยแล้ว (ล้างไฟล์แคชและภาพหน้าจอชั่วคราวแล้ว ${cleanupRes?.deletedCount || 0} ไฟล์)`,
        stored_in: 'Settings > บันทึกการทำงาน AI ภายนอก (MCP Logs)',
        timestamp: new Date().toISOString(),
        tasks_recorded: tasksModified.length,
        temp_files_cleaned: cleanupRes?.deletedCount || 0,
        freed_disk_space: cleanupRes?.freedFormatted || '0 B'
      };
    }

    case 'status_clean_temp_files':
      return cleanupTempFiles({ keepRecent: args?.keep_recent === true });

    default:
      throw new Error(`ไม่พบเครื่องมือ "${name}" ในระบบ Status+ MCP Server`);
  }
}

/**
 * Standard MCP JSON-RPC Stdio Server Loop
 */
function startMcpServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  const sendJson = (response) => {
    process.stdout.write(JSON.stringify(response) + '\n');
  };

  rl.on('line', async (line) => {
    if (!line || !line.trim()) return;

    let req;
    try {
      req = JSON.parse(line);
    } catch (e) {
      return sendJson({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      });
    }

    const { id, method, params } = req;

    // 1. Initialize
    if (method === 'initialize') {
      return sendJson({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'status-plus-mcp',
            version: '1.0.0',
            description: 'Status+ MCP Server with Desktop Control, Semantic RAG & Mandatory Audit Reporting'
          },
          instructions: 'MANDATORY RULE: External AI agents accessing Status+ MUST execute "status_submit_execution_report" upon task completion to document all actions, modifications, and findings. These reports are displayed in the user\'s Settings modal.'
        }
      });
    }

    // 2. Initialized Notification
    if (method === 'notifications/initialized') {
      return; // No response required for notifications
    }

    // 3. Ping
    if (method === 'ping') {
      return sendJson({ jsonrpc: '2.0', id, result: {} });
    }

    // 4. List Tools
    if (method === 'tools/list') {
      return sendJson({
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS
        }
      });
    }

    // 5. Call Tool
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      try {
        const result = await handleToolCall(toolName, toolArgs);

        // Auto-log tool execution (if not report submission which logs itself)
        if (toolName !== 'status_submit_execution_report') {
          let summary = 'OK';
          if (typeof result === 'object' && result !== null) {
            summary = result.message || (result.name ? `งาน: ${result.name}` : (Array.isArray(result) ? `พบข้อมูล ${result.length} รายการ` : 'สำเร็จ'));
          } else if (typeof result === 'string') {
            summary = result.slice(0, 100);
          }

          logMcpActivity({
            client_name: toolArgs?.client_name || 'External AI Agent',
            action_type: 'tool_execution',
            tool_name: toolName,
            input_params: toolArgs,
            result_summary: summary,
            status: 'success'
          });
        }

        return sendJson({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
              }
            ]
          }
        });
      } catch (err) {
        // Log tool error
        logMcpActivity({
          client_name: toolArgs?.client_name || 'External AI Agent',
          action_type: 'tool_execution',
          tool_name: toolName,
          input_params: toolArgs,
          result_summary: err.message,
          status: 'error'
        });

        return sendJson({
          jsonrpc: '2.0',
          id,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error executing tool "${toolName}": ${err.message}`
              }
            ]
          }
        });
      }
    }

    // Unknown method
    sendJson({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method "${method}" not found` }
    });
  });

  process.stderr.write('[Status+ MCP Server] Running on stdio transport...\n');
}

// Start if executed directly
if (require.main === module) {
  startMcpServer();
}

module.exports = {
  TOOLS,
  handleToolCall,
  startMcpServer
};
