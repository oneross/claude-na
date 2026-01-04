#!/usr/bin/env node
/**
 * claude-na CLI
 *
 * Commands:
 *   na              Show next action
 *   na "task"       Set explicit next action (adds with @na tag)
 *   aa "task"       Add action to bottom of list
 *   aa! "task"      Add action to top of list (priority)
 *   done            Complete current task
 *   skip            Skip current task (remove @na, show next)
 *   config          Show current config
 *   refresh         Force refresh from Todoist
 */

import { loadConfig } from './config.js';
import { scanForNextAction, findOrCreateTodoPath, addTaskToFile, completeTaskInFile, parseFile } from './local/index.js';
import { TodoistClient } from './todoist/index.js';
import { renderStatusline } from './renderer.js';
import * as fs from 'node:fs';

const args = process.argv.slice(2);
const command = args[0] || 'na';

async function main() {
  const config = loadConfig();
  const cwd = process.cwd();

  switch (command) {
    case 'na': {
      // If argument provided, set as next action
      const taskText = args.slice(1).join(' ').trim();
      if (taskText) {
        const todoPath = findOrCreateTodoPath(cwd, config.local);
        addTaskToFile(todoPath, taskText, 'top', true); // Add with @na
        console.log(`📍 Added next action: ${taskText}`);
        console.log(`   → ${todoPath}`);
        return;
      }

      // Otherwise show current next action
      const localResult = scanForNextAction(cwd, config.local);
      let todoistTask = null;

      if (config.todoist.enabled) {
        const client = new TodoistClient(config.todoist);
        todoistTask = await client.getTopTask(true);
      }

      const output = renderStatusline(localResult, todoistTask, config.display);
      console.log(output);
      break;
    }

    case 'aa':
    case 'aa!': {
      const isTop = command === 'aa!';
      const taskText = args.slice(1).join(' ').trim();

      if (!taskText) {
        console.error('Usage: aa "task description"');
        console.error('       aa! "task description"  (add to top)');
        process.exit(1);
      }

      const todoPath = findOrCreateTodoPath(cwd, config.local);
      addTaskToFile(todoPath, taskText, isTop ? 'top' : 'bottom', false);
      console.log(`${isTop ? '📍' : '📋'} Added: ${taskText}`);
      console.log(`   → ${todoPath}`);
      break;
    }

    case 'done': {
      const target = args[1]; // 'local' or 'todoist' or undefined

      if (!target || target === 'local') {
        const localResult = scanForNextAction(cwd, config.local);
        if (localResult.task && localResult.absolutePath) {
          completeTaskInFile(localResult.absolutePath, localResult.line);
          console.log(`✅ Completed: ${localResult.task}`);
        } else if (!target) {
          console.log('No local task to complete');
        }
      }

      if (target === 'todoist' || (!target && config.todoist.enabled)) {
        const client = new TodoistClient(config.todoist);
        const task = await client.getTopTask();
        if (task) {
          const success = await client.completeTask(task.id);
          if (success) {
            console.log(`✅ Completed (Todoist): ${task.content}`);
          } else {
            console.error('Failed to complete Todoist task');
          }
        } else if (target === 'todoist') {
          console.log('No Todoist task to complete');
        }
      }
      break;
    }

    case 'skip': {
      const localResult = scanForNextAction(cwd, config.local);
      if (!localResult.task || !localResult.absolutePath) {
        console.log('No task to skip');
        break;
      }

      // Remove @na tag from current task
      const content = fs.readFileSync(localResult.absolutePath, 'utf-8');
      const lines = content.split('\n');
      const idx = localResult.line - 1;

      if (lines[idx]) {
        lines[idx] = lines[idx].replace(/@na\b/g, '').trimEnd();
        fs.writeFileSync(localResult.absolutePath, lines.join('\n'));
        console.log(`⏭ Skipped: ${localResult.task}`);

        // Show next task
        const nextResult = scanForNextAction(cwd, config.local);
        if (nextResult.task) {
          console.log(`📍 Next: ${nextResult.task}`);
        }
      }
      break;
    }

    case 'refresh': {
      console.log('Refreshing...');

      const localResult = scanForNextAction(cwd, config.local);
      let todoistTask = null;

      if (config.todoist.enabled) {
        const client = new TodoistClient(config.todoist);
        todoistTask = await client.getTopTask(true); // Force refresh
      }

      const output = renderStatusline(localResult, todoistTask, config.display);
      console.log(output);
      break;
    }

    case 'config': {
      console.log(JSON.stringify(config, null, 2));
      break;
    }

    case 'list': {
      // Show all tasks from local TODO.md
      const localResult = scanForNextAction(cwd, config.local);
      if (localResult.absolutePath) {
        const result = parseFile(localResult.absolutePath, config.local.parsing);
        console.log(`📍 ${localResult.source}`);
        if (result.primary) {
          console.log(`  1. ${result.primary.text} (${result.primary.type})`);
          console.log(`  + ${result.remaining} more`);
        }
      } else {
        console.log('No TODO.md found');
      }
      break;
    }

    case 'help':
    default: {
      console.log(`
claude-na - Next Action HUD for Claude Code

Commands:
  na              Show current next action
  na "task"       Set task as next action (adds @na tag)
  aa "task"       Add action to bottom of list
  aa! "task"      Add action to top of list
  done [local|todoist]  Complete current task
  skip            Skip current local task
  refresh         Force refresh from Todoist
  list            List all tasks from TODO.md
  config          Show current configuration
  help            Show this help

Examples:
  claude-na na "Fix authentication bug"
  claude-na aa "Write unit tests"
  claude-na done local
      `);
      break;
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
