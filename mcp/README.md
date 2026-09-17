# Status+ Model Context Protocol (MCP) Server

MCP Server มาตรฐานสำหรับโปรแกรม **Status+** ที่เปิดให้โมเดล AI ภายนอก (เช่น **Claude Desktop, Cursor, Antigravity, Cline, Windsurf, AutoGen, CrewAI**) สามารถเชื่อมต่อเข้ามาควบคุมระบบได้อย่างอิสระ ทั้งการจัดการงาน (Tasks), การค้นหาข้อมูลอัจฉริยะ (Semantic RAG), การสั่งเปิด-ปิดโปรแกรม (App Lifecycle) และการควบคุมหน้าจอ Windows (Desktop Control)

---

## 🌟 คุณสมบัติเด่น (Features)

1. **Hybrid Architecture:**
   * เชื่อมต่อผ่าน Local REST API (`http://localhost:3001`) แบบเรียลไทม์เมื่อโปรแกรมเปิดอยู่ (อัปเดตหน้าจอทันที)
   * สลับไปอ่าน-เขียน SQLite Database (`server/db.js`) โดยตรงอัตโนมัติหากโปรแกรมปิดอยู่ (พร้อมอัปเดต Vector Embeddings)
2. **App Lifecycle & Window Management:**
   * สั่งเปิดโปรแกรม Status+ (`status_app_launch`)
   * สั่งโฟกัสหน้าต่างดึงขึ้นมาอยู่ด้านหน้าสุด (`status_app_focus`)
   * สั่งปิดโปรแกรมอย่างปลอดภัย (`status_app_quit`)
3. **Native Windows Desktop Control:**
   * ถ่ายภาพหน้าจอส่งกลับเป็น Base64 Image ให้โมเดล AI วิเคราะห์สายตา (`status_desktop_screenshot`)
   * คลิกเมาส์ซ้าย, ขวา, ดับเบิ้ลคลิกตามพิกัด X, Y (`status_desktop_click`)
   * พิมพ์ข้อความและส่งคีย์ลัด Hotkeys เช่น `^k` สำหรับ Ctrl+K (`status_desktop_type`)
   * ตรวจสอบรายชื่อหน้าต่างโปรแกรมที่เปิดอยู่บน Windows (`status_desktop_list_windows`)
   * สลับโฟกัสไปยังโปรแกรมใดๆ บน Windows (`status_desktop_activate_window`)
4. **Project & Task Management:**
   * สรุปภาพรวมและ KPI ความสำเร็จของโปรเจกต์ (`status_get_overview`)
   * เพิ่ม, แก้ไข, ลบงาน พร้อมระบบความปลอดภัย (`status_create_task`, `status_update_task`, `status_delete_task`)
   * จัดการ Checklist งานย่อย (`status_add_subtasks`, `status_toggle_subtask`)
   * ค้นหางานด้วย Semantic Vector Search (RAG) (`status_search_tasks_semantic`)
   * ตรวจสอบ Spaces และ Lists ในระบบ (`status_list_spaces_and_lists`)

---

## 🚀 วิธีตั้งค่าใน Claude Desktop / Cursor / Antigravity

### 1. Claude Desktop
นำเนื้อหาใน `mcp/claude_desktop_config.example.json` ไปใส่ในไฟล์:
* Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "status-plus": {
      "command": "node",
      "args": [
        "d:\\DEV\\Project Management\\mcp\\server.js"
      ]
    }
  }
}
```

### 2. ทดสอบรันเซิร์ฟเวอร์แบบแมนนวล
```powershell
npm run mcp
```
หรือ
```powershell
node mcp/server.js
```

---

## 🔴 กฎระเบียบสำหรับ AI ภายนอก (Mandatory AI Audit Rule)

ตามกฎระเบียบของระบบ Status+:
> **เมื่อโมเดล AI ภายนอกปฏิบัติภารกิจเสร็จสิ้น จะต้องเรียกใช้คำสั่ง `status_submit_execution_report` เสมอ เพื่อส่งรายงานการปฏิบัติงาน**

**พารามิเตอร์ของรายงาน:**
* `client_name`: ชื่อ AI เช่น `Claude 3.5 Sonnet`, `Cursor Agent`, `Antigravity`
* `summary_of_work`: สรุปสิ่งที่เข้ามาทำในระบบอย่างละเอียด เช่น สร้างงานใหม่, อัปเดตสถานะ, หรือวิเคราะห์หน้าจอ
* `tasks_modified`: รายชื่อ Task ID หรือชื่องานที่สร้างหรือแก้ไข (Array of strings)
* `notes`: หมายเหตุ, ข้อเสนอแนะ หรือปัญหาที่พบ
* `status`: `completed` (สำเร็จสมบูรณ์) / `partial` (สำเร็จบางส่วน) / `failed` (ล้มเหลว)

**การตรวจสอบบันทึก:**
ผู้ใช้งานสามารถเปิดดูรายงานสรุปและประวัติการเรียกใช้คำสั่งของ AI ทั้งหมดได้ทันทีที่:
👉 **เมนู Settings (ไอคอนฟันเฟือง) > แท็บ "ประวัติ & รายงาน AI ภายนอก (MCP Logs)"**

