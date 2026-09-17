#!/usr/bin/env node

/**
 * ClickUp Local Project Task Manager CLI for AI Agents
 * Allows AI agents to query tasks, create/update/delete tasks, run RAG semantic searches,
 * move/copy tasks cross-project, and generate summary reports.
 */

const path = require('path');
const fs = require('fs');

// Locate server db and services relative to this script
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const { db } = require(path.join(projectRoot, 'server', 'db.js'));
const { indexTask, semanticSearch } = require(path.join(projectRoot, 'server', 'ragService.js'));
const { setWindowsWallpaper, STOCK_WALLPAPERS } = require(path.join(projectRoot, 'server', 'wallpaperService.js'));
const { 
  createFullBackup, 
  listBackups, 
  restoreBackupData, 
  exportListToCSV, 
  importTasksFromCSV 
} = require(path.join(projectRoot, 'server', 'backupService.js'));

function parseArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    } else {
      parsed._.push(arg);
    }
  }
  return parsed;
}

function writeOutput(data, outputPath) {
  const json = JSON.stringify(data, null, 2);
  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), json, 'utf8');
    console.log(`Success! Output written to: ${outputPath}`);
  } else {
    console.log(json);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || command === 'help' || args.help) {
    console.log(`
ClickUp Local Project Task Manager CLI (project-task-manager)

Usage:
  node pm_cli.js <command> [options]

Commands:
  list-spaces                                     List all Spaces and Lists
  list-tasks [--list-id <id>] [--status <status>] List tasks with subtasks and fields
  add-task --list-id <id> --name <name> [...]     Create a new task (auto-indexed in RAG)
  edit-task --task-id <id> [...]                  Update task title, status, priority, or notes
  delete-task --task-id <id>                      Delete a task (removes from RAG)
  move-task --task-id <id> --target-list-id <id>  Move a task to another list/space
  copy-task --task-id <id> --target-list-id <id>  Duplicate a task to another list/space
  rag-search --query <query> [--limit <n>]        Perform semantic vector search in SQLite
  report [--list-id <id>] [--format md|json]      Generate executive project status report
  set-wallpaper [--stock-id <id>]                 Change Windows wallpaper to project tracker
  list-backups                                    List available snapshot backups in backups/
  create-backup [--note <text>]                   Create a new full system snapshot
  restore-backup --file <path> [--mode merge|replace] Restore database from backup JSON
  export-csv --list-id <id> [--output <file>]     Export tasks of a list to Excel CSV (UTF-8 BOM)
  import-csv --list-id <id> --file <path>         Import tasks from a CSV file

Options:
  --output <file>                                 Write result to JSON/MD/CSV file
`);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'list-spaces': {
        const spaces = db.prepare('SELECT * FROM spaces ORDER BY position ASC').all();
        const lists = db.prepare('SELECT * FROM lists ORDER BY position ASC').all();
        const result = spaces.map(s => ({
          ...s,
          lists: lists.filter(l => l.space_id === s.id).map(l => {
            const count = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE list_id = ?').get(l.id).c;
            return { ...l, taskCount: count };
          })
        }));
        writeOutput(result, args.output);
        break;
      }

      case 'list-tasks': {
        let query = 'SELECT * FROM tasks';
        const params = [];
        const conditions = [];

        if (args['list-id']) {
          conditions.push('list_id = ?');
          params.push(args['list-id']);
        }
        if (args.status) {
          conditions.push('status = ?');
          params.push(args.status);
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY position ASC, created_at DESC';

        const tasks = db.prepare(query).all(...params);
        const enriched = tasks.map(t => {
          const subtasks = db.prepare('SELECT title, completed FROM subtasks WHERE task_id = ?').all(t.id);
          const fields = db.prepare('SELECT field_id, value FROM task_field_values WHERE task_id = ?').all(t.id);
          return { ...t, subtasks, fieldValues: fields };
        });

        writeOutput(enriched, args.output);
        break;
      }

      case 'add-task': {
        if (!args['list-id'] || !args.name) {
          console.error('Error: --list-id and --name are required.');
          process.exit(1);
        }
        const taskId = `task-${Date.now()}`;
        db.prepare(`
          INSERT INTO tasks (id, list_id, name, description, status, priority, due_date, assignee)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          taskId,
          args['list-id'],
          args.name,
          args.description || '',
          args.status || 'NOT STARTED',
          args.priority || 'Normal',
          args['due-date'] || null,
          args.assignee || 'JM'
        );

        indexTask(taskId);
        writeOutput({ success: true, taskId, name: args.name }, args.output);
        break;
      }

      case 'edit-task': {
        if (!args['task-id']) {
          console.error('Error: --task-id is required.');
          process.exit(1);
        }
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args['task-id']);
        if (!task) {
          console.error(`Task ${args['task-id']} not found.`);
          process.exit(1);
        }

        db.prepare(`
          UPDATE tasks 
          SET name = COALESCE(?, name),
              description = COALESCE(?, description),
              status = COALESCE(?, status),
              priority = COALESCE(?, priority),
              due_date = COALESCE(?, due_date),
              assignee = COALESCE(?, assignee),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          args.name !== undefined ? args.name : null,
          args.description !== undefined ? args.description : null,
          args.status !== undefined ? args.status : null,
          args.priority !== undefined ? args.priority : null,
          args['due-date'] !== undefined ? args['due-date'] : null,
          args.assignee !== undefined ? args.assignee : null,
          args['task-id']
        );

        indexTask(args['task-id']);
        writeOutput({ success: true, taskId: args['task-id'] }, args.output);
        break;
      }

      case 'delete-task': {
        if (!args['task-id']) {
          console.error('Error: --task-id is required.');
          process.exit(1);
        }
        db.prepare('DELETE FROM tasks WHERE id = ?').run(args['task-id']);
        db.prepare('DELETE FROM task_embeddings WHERE task_id = ?').run(args['task-id']);
        writeOutput({ success: true, deletedTaskId: args['task-id'] }, args.output);
        break;
      }

      case 'move-task': {
        if (!args['task-id'] || !args['target-list-id']) {
          console.error('Error: --task-id and --target-list-id are required.');
          process.exit(1);
        }
        db.prepare('UPDATE tasks SET list_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(args['target-list-id'], args['task-id']);
        indexTask(args['task-id']);
        writeOutput({ success: true, taskId: args['task-id'], newListId: args['target-list-id'] }, args.output);
        break;
      }

      case 'copy-task': {
        if (!args['task-id'] || !args['target-list-id']) {
          console.error('Error: --task-id and --target-list-id are required.');
          process.exit(1);
        }
        const orig = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args['task-id']);
        if (!orig) {
          console.error(`Task ${args['task-id']} not found.`);
          process.exit(1);
        }
        const newId = `task-${Date.now()}`;
        db.prepare(`
          INSERT INTO tasks (id, list_id, name, description, status, priority, due_date, assignee)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newId,
          args['target-list-id'],
          `${orig.name} (Copy)`,
          orig.description,
          orig.status,
          orig.priority,
          orig.due_date,
          orig.assignee
        );

        // Copy subtasks
        const subs = db.prepare('SELECT title, completed, position FROM subtasks WHERE task_id = ?').all(args['task-id']);
        const insertSub = db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position) VALUES (?, ?, ?, ?, ?)');
        subs.forEach((s, i) => insertSub.run(`sub-${Date.now()}-${i}`, newId, s.title, s.completed, s.position));

        indexTask(newId);
        writeOutput({ success: true, newTaskId: newId }, args.output);
        break;
      }

      case 'rag-search': {
        if (!args.query) {
          console.error('Error: --query is required.');
          process.exit(1);
        }
        const limit = args.limit ? parseInt(args.limit) : 5;
        const results = semanticSearch(args.query, limit);
        writeOutput(results, args.output);
        break;
      }

      case 'report': {
        const listId = args['list-id'] || 'list-iqa26';
        const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(listId) || { name: 'All Tasks' };
        const tasks = db.prepare('SELECT * FROM tasks WHERE list_id = ?').all(listId);

        const completed = tasks.filter(t => t.status === 'COMPLETED');
        const inProgress = tasks.filter(t => t.status === 'IN PROGRESS');
        const notStarted = tasks.filter(t => t.status === 'NOT STARTED');

        if (args.format === 'markdown' || args.format === 'md') {
          let md = `# Executive Status Report: ${list.name}\n\n`;
          md += `Generated: ${new Date().toLocaleString('th-TH')}\n\n`;
          md += `## Metrics\n- Total Tasks: ${tasks.length}\n- Completed: ${completed.length} (${tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0}%)\n- In Progress: ${inProgress.length}\n- Not Started: ${notStarted.length}\n\n`;
          md += `## Task Breakdown\n`;
          tasks.forEach((t, i) => {
            md += `${i + 1}. [${t.status}] **${t.name}** (Priority: ${t.priority}, Due: ${t.due_date || 'None'}, Assignee: ${t.assignee || 'None'})\n`;
          });

          if (args.output) {
            fs.writeFileSync(path.resolve(args.output), md, 'utf8');
            console.log(`Report written to: ${args.output}`);
          } else {
            console.log(md);
          }
        } else {
          writeOutput({
            listName: list.name,
            totalTasks: tasks.length,
            completedCount: completed.length,
            inProgressCount: inProgress.length,
            notStartedCount: notStarted.length,
            tasks
          }, args.output);
        }
        break;
      }

      case 'list-backups': {
        const backups = listBackups();
        writeOutput(backups, args.output);
        break;
      }

      case 'create-backup': {
        const note = args.note || 'manual';
        const res = createFullBackup(note);
        if (args.output && res.backup) {
          fs.writeFileSync(path.resolve(args.output), JSON.stringify(res.backup, null, 2), 'utf8');
        }
        writeOutput({ success: true, filename: res.filename, summary: res.backup?.summary }, args.output ? null : null);
        break;
      }

      case 'restore-backup': {
        if (!args.file) {
          console.error('Error: --file is required (path to backup JSON file).');
          process.exit(1);
        }
        const filePath = path.resolve(args.file);
        if (!fs.existsSync(filePath)) {
          console.error(`Backup file not found: ${filePath}`);
          process.exit(1);
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const backupData = JSON.parse(raw);
        const mode = args.mode || 'merge'; // 'merge' | 'replace'
        const res = restoreBackupData(backupData, mode);
        writeOutput(res, args.output);
        break;
      }

      case 'export-csv': {
        const listId = args['list-id'] || 'list-iqa26';
        const csvContent = exportListToCSV(listId);
        if (args.output) {
          fs.writeFileSync(path.resolve(args.output), csvContent, 'utf8');
          console.log(`CSV written to: ${args.output}`);
        } else {
          process.stdout.write(csvContent);
        }
        break;
      }

      case 'import-csv': {
        const listId = args['list-id'] || 'list-iqa26';
        if (!args.file) {
          console.error('Error: --file is required (path to CSV file).');
          process.exit(1);
        }
        const filePath = path.resolve(args.file);
        if (!fs.existsSync(filePath)) {
          console.error(`CSV file not found: ${filePath}`);
          process.exit(1);
        }
        const res = importTasksFromCSV(listId, filePath);
        writeOutput(res, args.output);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (err) {
    console.error('CLI Execution Error:', err.message);
    process.exit(1);
  }
}

main();
