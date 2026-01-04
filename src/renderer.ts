import type { LocalScanResult, TodoistTask, DisplayConfig } from './types.js';

/**
 * Truncate text to maxLength, adding ellipsis if needed.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Format a due date for display.
 */
function formatDue(due: TodoistTask['due']): string {
  if (!due) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const dueDate = new Date(due.date);

  if (dueDate < today) {
    // Overdue
    const days = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
    return days === 1 ? 'yesterday' : `${days}d ago`;
  }

  if (dueDate.getTime() === today.getTime()) {
    if (due.datetime) {
      const time = new Date(due.datetime);
      return time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return 'today';
  }

  if (dueDate.getTime() === tomorrow.getTime()) {
    return 'tomorrow';
  }

  // Future date
  const days = Math.floor((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 7) {
    return dueDate.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Render the statusline output.
 */
export function renderStatusline(
  localResult: LocalScanResult | null,
  todoistTask: TodoistTask | null,
  config: DisplayConfig
): string {
  const parts: string[] = [];

  // Local task
  if (localResult?.task) {
    let text = truncate(localResult.task, config.maxTaskLength);

    if (config.showRemainingCount && localResult.remaining > 0) {
      text += ` +${localResult.remaining}`;
    }

    if (config.showSource && localResult.source) {
      // Shorten source path for display
      const shortSource = localResult.source.replace(/^\.\.\//, '↑');
      text += ` \x1b[2m[${shortSource}]\x1b[0m`;
    }

    parts.push(`${config.icons.local} ${text}`);
  }

  // Todoist task
  if (todoistTask) {
    let text = truncate(todoistTask.content, config.maxTaskLength);
    const meta: string[] = [];

    // Priority (4 = p1, 3 = p2, 2 = p3, 1 = p4 in API)
    if (todoistTask.priority > 1) {
      const displayPriority = 5 - todoistTask.priority;
      meta.push(`p${displayPriority}`);
    }

    // Due date
    if (todoistTask.due) {
      meta.push(formatDue(todoistTask.due));
    }

    if (meta.length > 0) {
      text += ` \x1b[2m[${meta.join('·')}]\x1b[0m`;
    }

    parts.push(`${config.icons.todoist} ${text}`);
  }

  if (parts.length === 0) {
    return '\x1b[2m✓ No pending actions\x1b[0m';
  }

  // Reorder based on priority setting
  if (config.priority === 'todoist' && parts.length === 2) {
    parts.reverse();
  }

  return parts.join(config.separator);
}
