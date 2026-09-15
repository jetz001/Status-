# ClickUp Local Project Management (Electron + Web + SQLite + RAG Vector DB)

โปรแกรมบริหารจัดการงานและโครงการสไตล์ **ClickUp** (ธีมมืด Dark Mode สวยงามเหมือนต้นฉบับ) ทำงานในเครื่องคอมพิวเตอร์แบบ Local ออฟไลน์ 100% บันทึกข้อมูลลงใน SQLite พร้อมระบบ **RAG Vector Database**, ระบบ **เปลี่ยนวอลเปเปอร์ Windows ตามงาน (Desktop Task Wallpaper)**, ระบบ **พิมพ์และบันทึกรายงาน PDF ผ่านเบราว์เซอร์**, **AI Chat & Smart Assist Buttons**, และ **Agent Skill (`project-task-manager`)** สำหรับ AI ผู้ช่วยตัวอื่น

---

## คุณสมบัติเด่น (Features)

1. **สถาปัตยกรรม Dual-Mode**:
   - รันเป็นเว็บแอปพลิเคชันบนเบราว์เซอร์ (Chrome, Edge, Brave) ที่ `http://localhost:5173`
   - รันเป็นแอปเดสก์ท็อป **Electron** ได้ในคำสั่งเดียว
2. **มุมมองการทำงานเสมือนจริงแบบ ClickUp**:
   - **List View**: ตารางแบ่งกลุ่มตามสถานะงาน (COMPLETED, IN PROGRESS, NOT STARTED) พร้อมคอลัมน์มาตรฐานและ Custom Columns ที่เพิ่มได้เอง
   - **Board View (Kanban)**: กระดานการ์ดพร้อมระบบ Drag & Drop ย้ายสถานะงาน มีภาพ Thumbnail และตัวนับซับทาสก์
   - **Timeline View (Gantt Chart)**: แถบแกนเวลา Start Date - Due Date บ่งบอกสีตามสถานะงานและเส้น Today
3. **ระบบจัดการงานครบวงจร (Full Task Management)**:
   - ปุ่ม **แก้ไข (Edit)** และ **ลบ (Delete)** พร้อมหน้าต่างยืนยัน (Confirm Dialog)
   - ฟังก์ชัน **ย้ายงาน (Move)** หรือ **คัดลอกงาน (Duplicate/Copy)** ข้าม Space และ List
   - รายการตรวจสอบขั้นตอนย่อย (Subtasks Checklist) พร้อมแถบเปอร์เซ็นต์ความคืบหน้า
   - รองรับรูปภาพแนบเต็มรูปแบบ: **วางรูป Ctrl+V**, ลากวาง Drag & Drop, และหน้าต่างขยายดูรูปขนาดเต็ม (Lightbox)
4. **พิมพ์เอกสารและส่งออก PDF ผ่านเบราว์เซอร์ (Print & PDF)**:
   - ปริ้นสรุปหน้ารวมโปรเจกต์ (Project Overview Report)
   - ปริ้นใบทาสก์งานเดี่ยว (Single Task Sheet / Job Order)
5. **สร้างรูปและเปลี่ยนวอลเปเปอร์ Windows ตามงาน (Dynamic Windows Wallpaper Generator)**:
   - คลังภาพ Stock Wallpaper สวยงามหลากหลายหมวดหมู่ (Dark Slate, Cyber Neon, Nature, Abstract)
   - รองรับการอัปโหลดภาพวอลเปเปอร์ของตนเอง (Custom Upload)
   - จัดวางตำแหน่งกล่องงานได้อิสระ (ขวาบน, ซ้ายบน, ขวาล่าง, ซ้ายล่าง) พร้อมตัวปรับความโปร่งแสง/เบลอ (Glassmorphism)
   - ปุ่ม **'ตั้งเป็นวอลเปเปอร์ Windows ทันที'** คลิกเดียวเปลี่ยนพื้นหลังจอ Windows ผ่าน PowerShell API
6. **ระบบแจ้งเตือน (Notifications)**:
   - **Windows Native Toast Notification**: แจ้งเตือนเด้งมุมจอขวาล่างเมื่องานใกล้ถึงกำหนด (Due Soon) หรือเกินกำหนด (Overdue)
   - **In-App Notification Center**: กล่องกระดิ่งแจ้งเตือนบนแถบ Header พร้อมตัวเลขนับงาน
7. **โมดูล AI Assistant & RAG Vector Database**:
   - ระบบ **Semantic Vector Search (Cosine Similarity)** ค้นหาความหมายของงานได้ออฟไลน์
   - หน้าต่าง **AI Sidebar**: สนทนากับ AI สรุปงานหรือปรึกษางานโดยเชื่อมกับข้อมูล RAG
   - **✨ AI Polish Text**: ปรับแต่งภาษาและตรวจคำผิด
   - **✨ AI Auto-Generate Subtasks**: แตกทาสก์หลักเป็นขั้นตอนซับทาสก์ย่อยให้อัตโนมัติ
   - **✨ AI Smart Auto-Fill**: ช่วยประเมิน Priority และ Defect Severity ให้อัตโนมัติ
   - รองรับ API Key ทั้ง **Google Gemini, OpenAI (ChatGPT), และ Local Ollama**
8. **AI Agent Skill (`project-task-manager`)**:
   - พร้อมไฟล์ `SKILL.md` และสคริปต์ CLI `pm_cli.js` เพื่อให้ AI ตัวอื่นเข้ามาจัดการงานและรัน RAG ได้ทันที

---

## วิธีเปิดใช้งานโปรแกรม (Getting Started)

### 1. รันในโหมด Web Browser (Chrome / Edge):
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:5173`

### 2. รันในโหมด Electron Desktop App:
```bash
npm start
```

---

## การใช้งานคำสั่ง CLI สำหรับ AI หรือ Terminal (`pm_cli.js`)

```bash
# 1. ดูรายการ Spaces และ Lists ทั้งหมด
node .agents/skills/project-task-manager/scripts/pm_cli.js list-spaces

# 2. ดูรายการทาสก์ในลิสต์
node .agents/skills/project-task-manager/scripts/pm_cli.js list-tasks --list-id list-iqa26

# 3. ค้นหาเชิงความหมายด้วย RAG Vector Search
node .agents/skills/project-task-manager/scripts/pm_cli.js rag-search --query "ตรวจสอบ Supplier" --limit 3

# 4. เพิ่มงานใหม่
node .agents/skills/project-task-manager/scripts/pm_cli.js add-task --list-id list-iqa26 --name "ตรวจสอบคู่ค้า Q3" --priority "High"

# 5. แก้ไขงาน / อัปเดตสถานะ
node .agents/skills/project-task-manager/scripts/pm_cli.js edit-task --task-id task-1 --status "COMPLETED"

# 6. ลบงาน
node .agents/skills/project-task-manager/scripts/pm_cli.js delete-task --task-id task-1

# 7. ย้ายงาน หรือ คัดลอกงานข้ามลิสต์
node .agents/skills/project-task-manager/scripts/pm_cli.js move-task --task-id task-2 --target-list-id list-routine
node .agents/skills/project-task-manager/scripts/pm_cli.js copy-task --task-id task-3 --target-list-id list-safety

# 8. สร้างรายงานสรุปสถานะโครงการ
node .agents/skills/project-task-manager/scripts/pm_cli.js report --list-id list-iqa26 --format md
```
