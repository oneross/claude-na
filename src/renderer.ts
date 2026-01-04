import type { LocalScanResult, TodoistTask, DisplayConfig, StatuslineContext, EnvironmentInfo } from './types.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  // Foreground
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  // Bright
  brightRed: '\x1b[91m',
  brightYellow: '\x1b[93m',
};

/**
 * Truncate text to maxLength, adding ellipsis if needed.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Format system time as HH:MM.
 */
function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format session duration from start time.
 */
function formatDuration(startTime: string | undefined): string {
  if (!startTime) return '--';

  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
}

/**
 * Render context usage bar with color coding.
 * Returns: ██████░░░░ 58%
 */
function renderContextBar(context: StatuslineContext['contextWindow']): string {
  if (!context || !context.max) {
    return `${colors.dim}──────────${colors.reset}`;
  }

  const percent = Math.round((context.used / context.max) * 100);
  const filledCount = Math.round(percent / 10);
  const emptyCount = 10 - filledCount;

  // Color based on usage
  let barColor: string;
  if (percent <= 50) {
    barColor = colors.green;
  } else if (percent <= 75) {
    barColor = colors.yellow;
  } else if (percent <= 90) {
    barColor = colors.brightYellow;
  } else {
    barColor = colors.red;
  }

  const filled = '█'.repeat(filledCount);
  const empty = '░'.repeat(emptyCount);

  return `${barColor}${filled}${colors.dim}${empty}${colors.reset} ${percent}%`;
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
    const days = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
    return `${colors.red}${days === 1 ? 'yesterday' : `${days}d ago`}${colors.reset}`;
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

  const days = Math.floor((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 7) {
    return dueDate.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Render location string (directory + branch + venv).
 */
function renderLocation(env: EnvironmentInfo, verbose: boolean): string {
  if (verbose) {
    // Verbose: ~/projects/claude-na │ main │ .venv
    const parts: string[] = [];
    parts.push(`${colors.cyan}${env.fullPath}${colors.reset}`);
    if (env.gitBranch) {
      parts.push(`${colors.magenta}${env.gitBranch}${colors.reset}`);
    }
    if (env.venv) {
      parts.push(`${colors.dim}${env.venv}${colors.reset}`);
    }
    return parts.join(' │ ');
  } else {
    // Compact: claude-na:main (.venv)
    let loc = `${colors.cyan}${env.directory}${colors.reset}`;
    if (env.gitBranch) {
      loc += `:${colors.magenta}${env.gitBranch}${colors.reset}`;
    }
    if (env.venv) {
      loc += ` ${colors.dim}(${env.venv})${colors.reset}`;
    }
    return loc;
  }
}

/**
 * Render local task.
 */
function renderLocalTask(
  result: LocalScanResult | null,
  config: DisplayConfig,
  verbose: boolean
): string | null {
  if (!result?.task) return null;

  let text = truncate(result.task, config.maxTaskLength);

  if (config.showRemainingCount && result.remaining > 0) {
    text += ` ${colors.dim}+${result.remaining}${colors.reset}`;
  }

  if (verbose && config.showSource && result.source) {
    text += ` ${colors.dim}(${result.source}:${result.line})${colors.reset}`;
  }

  return `${config.icons.local} ${text}`;
}

/**
 * Render Todoist task.
 */
function renderTodoistTask(
  task: TodoistTask | null,
  config: DisplayConfig,
  verbose: boolean
): string | null {
  if (!task) return null;

  let text = truncate(task.content, config.maxTaskLength);

  if (verbose) {
    const meta: string[] = [];
    if (task.priority > 1) {
      const displayPriority = 5 - task.priority;
      const pColor = displayPriority === 1 ? colors.red : colors.yellow;
      meta.push(`${pColor}p${displayPriority}${colors.reset}`);
    }
    if (task.due) {
      meta.push(formatDue(task.due));
    }
    if (meta.length > 0) {
      text += ` ${colors.dim}[${meta.join('·')}]${colors.reset}`;
    }
  }

  // In compact mode, dim the Todoist task to prioritize local
  const prefix = verbose ? config.icons.todoist : `${colors.dim}${config.icons.todoist}`;
  const suffix = verbose ? '' : colors.reset;

  return `${prefix} ${text}${suffix}`;
}

export interface RenderOptions {
  localResult: LocalScanResult | null;
  todoistTask: TodoistTask | null;
  context: StatuslineContext;
  env: EnvironmentInfo;
  config: DisplayConfig;
}

/**
 * Render the complete statusline.
 */
export function renderStatusline(options: RenderOptions): string {
  const { localResult, todoistTask, context, env, config } = options;
  const verbose = config.mode === 'verbose';
  const sep = ` ${colors.dim}│${colors.reset} `;

  // Build header parts: time | context | duration | location
  const headerParts: string[] = [];

  if (config.showTime) {
    headerParts.push(`${colors.gray}${formatTime()}${colors.reset}`);
  }

  if (config.showContext) {
    headerParts.push(renderContextBar(context.contextWindow));
  }

  if (config.showDuration) {
    headerParts.push(formatDuration(context.session?.startTime));
  }

  if (config.showLocation) {
    headerParts.push(renderLocation(env, verbose));
  }

  // Build task parts
  const localStr = renderLocalTask(localResult, config, verbose);
  const todoistStr = renderTodoistTask(todoistTask, config, verbose);

  if (verbose) {
    // Verbose: 2 lines
    // Line 1: time | context | duration | location
    // Line 2: tasks
    const line1 = headerParts.join(sep);

    const taskParts: string[] = [];
    if (config.priority === 'local') {
      if (localStr) taskParts.push(localStr);
      if (todoistStr) taskParts.push(todoistStr);
    } else {
      if (todoistStr) taskParts.push(todoistStr);
      if (localStr) taskParts.push(localStr);
    }

    const line2 = taskParts.length > 0
      ? taskParts.join(sep)
      : `${colors.dim}✓ No pending actions${colors.reset}`;

    return `${line1}\n${line2}`;
  } else {
    // Compact: 1 line
    // time | context | duration | location | task
    const allParts = [...headerParts];

    // In compact mode, prefer local task, show todoist only if no local
    if (localStr) {
      allParts.push(localStr);
      // Optionally append dimmed todoist
      if (todoistStr) {
        allParts.push(todoistStr);
      }
    } else if (todoistStr) {
      allParts.push(todoistStr);
    } else {
      allParts.push(`${colors.dim}✓${colors.reset}`);
    }

    return allParts.join(sep);
  }
}

// Legacy export for backwards compatibility
export function renderStatuslineLegacy(
  localResult: LocalScanResult | null,
  todoistTask: TodoistTask | null,
  config: DisplayConfig
): string {
  // Minimal render without context/env for legacy callers
  const options: RenderOptions = {
    localResult,
    todoistTask,
    context: {},
    env: {
      gitBranch: null,
      venv: null,
      directory: '',
      fullPath: '',
    },
    config: {
      ...config,
      showTime: false,
      showContext: false,
      showDuration: false,
      showLocation: false,
    },
  };
  return renderStatusline(options);
}
