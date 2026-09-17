---
name: project-task-manager
description: >
  Manage local ClickUp-style project tasks, execute semantic RAG searches across project documentation and tasks in SQLite, add/edit/delete/move/copy tasks cross-project, and generate status reports.
---

# Project Task Manager (ClickUp Local + RAG Vector Database)

## Overview
This skill enables AI agents to inspect, manage, and query tasks and project data inside the local ClickUp Project Management desktop application. Data is stored locally in SQLite (`project_management.db`) with automatic vector embeddings in `task_embeddings`.

## Dependencies
- Node.js (v20+ with built-in `node:sqlite`)
- Local SQLite database: `project_management.db`

## Quick Start

Run the CLI tool from the repository root:

```bash
# List all Spaces and Lists
node .agents/skills/project-task-manager/scripts/pm_cli.js list-spaces

# Semantic RAG Search across tasks and notes
node .agents/skills/project-task-manager/scripts/pm_cli.js rag-search --query "Supplier 2026"

# Generate project report
node .agents/skills/project-task-manager/scripts/pm_cli.js report --format markdown
```

## Utility Scripts (`pm_cli.js`)

All commands write structured JSON or Markdown to `--output <file>` or stdout.

### 1. `list-tasks`
Lists all tasks for a specific list, including subtasks and custom field values.
```bash
node .agents/skills/project-task-manager/scripts/pm_cli.js list-tasks --list-id list-iqa26 [--status "IN PROGRESS"] [--output tasks.json]
```

### 2. `add-task`
Adds a new task and automatically indexes it into the local RAG vector store.
```bash
node .agents/skills/project-task-manager/scripts/pm_cli.js add-task --list-id list-iqa26 --name "ตรวจสอบคู่ค้า Q3" --priority "High" --status "NOT STARTED"
```

### 3. `edit-task`
Updates task title, status, priority, description, or due date.
```bash
node .agents/skills/project-task-manager/scripts/pm_cli.js edit-task --task-id task-1 --status "COMPLETED"
```

### 4. `delete-task`
Deletes a task and removes its vector embeddings.
```bash
node .agents/skills/project-task-manager/scripts/pm_cli.js delete-task --task-id task-10
```

### 5. `move-task` & `copy-task`
Moves or duplicates a task across projects/spaces.
```bash
# Move task
node .agents/skills/project-task-manager/scripts/pm_cli.js move-task --task-id task-1 --target-list-id list-routine

# Copy task (with subtasks)
node .agents/skills/project-task-manager/scripts/pm_cli.js copy-task --task-id task-2 --target-list-id list-safety
```

### 6. `rag-search`
Performs semantic vector search using Cosine Similarity over tasks, descriptions, and checklists.
```bash
node .agents/skills/project-task-manager/scripts/pm_cli.js rag-search --query "ความเสี่ยงและ Feasibility" --limit 3
```

### 7. `report`
Generates an executive project report in Markdown or JSON format.
```bash
node .agents/skills/project-task-manager/scripts/pm_cli.js report --list-id list-iqa26 --format md
```

### 8. `list-backups` & `create-backup`
Inspect existing rolling snapshots or take a manual full system snapshot.
```bash
# List all 7-day rolling backups
node .agents/skills/project-task-manager/scripts/pm_cli.js list-backups

# Create manual snapshot
node .agents/skills/project-task-manager/scripts/pm_cli.js create-backup --note "before-sprint-close"
```

### 9. `restore-backup`
Restore database state from a backup JSON file with merge or full replace mode.
```bash
node .agents/skills/project-task-manager/scripts/pm_cli.js restore-backup --file backups/backup-auto-daily-2026-09-17.json --mode merge
```

### 10. `export-csv` & `import-csv`
Export tasks to Excel-compatible CSV (UTF-8 BOM) or import tasks from a spreadsheet.
```bash
# Export
node .agents/skills/project-task-manager/scripts/pm_cli.js export-csv --list-id list-iqa26 --output tasks_iqa.csv

# Import
node .agents/skills/project-task-manager/scripts/pm_cli.js import-csv --list-id list-iqa26 --file external_tasks.csv
```

## Common Mistakes
1. **Missing `--list-id`**: When adding a task or exporting CSV, always specify `--list-id` (e.g. `list-iqa26`). Run `list-spaces` first if you don't know the list ID.
2. **Not saving output**: For large project lists, pass `--output report.json` or `--output data.csv` to prevent terminal output truncation.
3. **Restore Mode**: Default restore mode is `merge` (safe, non-destructive). Use `--mode replace` only when you explicitly want a complete overwrite.
