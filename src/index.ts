/**
 * claude-na: Next Action HUD for Claude Code
 *
 * Main entry point exposing the core API for programmatic use.
 */

export { loadConfig, getDefaultConfig, validateConfig } from './config.js';
export { parseFile, addTaskToFile, completeTaskInFile, scanForNextAction, findOrCreateTodoPath } from './local/index.js';
export { TodoistClient, filterTasks, sortTasks, isTaskActionable, getTaskDeferDate } from './todoist/index.js';
export { renderStatusline } from './renderer.js';
export * from './types.js';
