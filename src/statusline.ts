#!/usr/bin/env node
/**
 * Statusline script for Claude Code integration.
 *
 * Receives JSON context via stdin, outputs formatted statusline to stdout.
 * Called by Claude Code every ~300ms.
 */

import { loadConfig } from './config.js';
import { scanForNextAction } from './local/index.js';
import { TodoistClient } from './todoist/index.js';
import { renderStatusline } from './renderer.js';
import { getEnvironmentInfo } from './env.js';
import type { StatuslineContext, LocalScanResult, TodoistTask } from './types.js';

// Persistent state across invocations
let todoistClient: TodoistClient | null = null;
let lastTodoistFetch = 0;
let cachedTodoistTask: TodoistTask | null = null;

async function main() {
  const config = loadConfig();

  // Read JSON context from stdin (may be empty)
  let context: StatuslineContext = {};
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf-8').trim();
    if (input) {
      context = JSON.parse(input);
    }
  } catch {
    // Ignore parse errors, proceed with empty context
  }

  // Get working directory from context or fallback to cwd
  const cwd = context.cwd || process.cwd();

  // Get environment info (git branch, venv, etc.)
  const env = getEnvironmentInfo(cwd);

  // Scan local TODO.md
  const localResult: LocalScanResult = scanForNextAction(cwd, config.local);

  // Get Todoist task (with caching)
  let todoistTask: TodoistTask | null = null;

  if (config.todoist.enabled) {
    if (!todoistClient) {
      todoistClient = new TodoistClient(config.todoist);
    }

    const now = Date.now();
    const ttlMs = config.refresh.todoist.intervalSeconds * 1000;

    if (now - lastTodoistFetch > ttlMs) {
      todoistTask = await todoistClient.getTopTask(true);
      lastTodoistFetch = now;
      cachedTodoistTask = todoistTask;
    } else {
      todoistTask = cachedTodoistTask;
    }
  }

  // Render and output
  const output = renderStatusline({
    localResult,
    todoistTask,
    context,
    env,
    config: config.display,
  });
  process.stdout.write(output);
}

main().catch((err) => {
  // On error, output a minimal status
  process.stdout.write(`\x1b[31m⚠ claude-na error\x1b[0m`);
  console.error(err);
  process.exit(1);
});
