// Task types for local TODO.md parsing
export type TaskType = 'checkbox_na' | 'bare_na' | 'checkbox' | 'bare';

export interface ParsedTask {
  text: string;
  line: number;
  type: TaskType;
  precedence: number; // 1 = highest (checkbox + @na)
}

export interface LocalParseResult {
  primary: ParsedTask | null;
  remaining: number;
  file: string;
}

export interface LocalScanResult {
  task: string | null;
  source: string; // relative path for display
  absolutePath: string;
  line: number;
  remaining: number;
  type: TaskType | '';
}

// Todoist types
export interface TodoistDue {
  date: string; // "2025-01-04"
  datetime?: string; // "2025-01-04T10:00:00"
  timezone?: string;
  isRecurring?: boolean;
  string?: string; // Human readable like "every day"
}

export interface TodoistTask {
  id: string;
  content: string;
  description?: string;
  priority: number; // 1=p4, 4=p1 in API
  due: TodoistDue | null;
  labels: string[];
  projectId: string;
  projectName?: string;
  createdAt: string;
  order: number;
}

// Configuration types
export interface ParsingConfig {
  naTag: string;
  checkboxPattern: string;
  bareItemPattern: string;
}

export interface RecursionConfig {
  stopAtHome: boolean;
  stopAtGitRoot: boolean;
  maxDepth: number;
}

export interface LocalConfig {
  filenames: string[];
  parsing: ParsingConfig;
  recursion: RecursionConfig;
}

export interface DateFilterConfig {
  mode: 'all' | 'due_today' | 'overdue' | 'actionable';
  respectDueTime: boolean;
  respectStartDate: boolean;
  includeNoDate: boolean;
  includeOverdue: boolean;
  deferDetection: DeferDetectionConfig;
}

export interface DeferDetectionConfig {
  enabled: boolean;
  sources: DeferSource[];
}

export interface DeferSource {
  type: 'label_prefix' | 'description_prefix';
  prefix: string;
}

export interface TodoistFilterConfig {
  excludeLabels: string[];
  includeLabels: string[];
  requireAllIncludeLabels: boolean;
  includeProjects: string[];
  excludeProjects: string[];
  dateFilter: DateFilterConfig;
}

export interface TodoistSortField {
  field: 'priority' | 'due_date' | 'created_at';
  order: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export interface TodoistConfig {
  enabled: boolean;
  apiTokenEnv: string;
  filter: TodoistFilterConfig;
  sort: TodoistSortField[];
}

export interface RefreshConfig {
  local: {
    trigger: 'chat_turn' | 'interval' | 'file_change';
    intervalSeconds?: number;
  };
  todoist: {
    intervalSeconds: number;
    onStartup: boolean;
    onCommand: boolean;
  };
}

export interface CompletionAutoDetection {
  patterns: string[];
}

export interface CompletionConfig {
  mode: 'confirm' | 'auto' | 'explicit';
  autoDetection: CompletionAutoDetection;
}

export interface DisplayIcons {
  local: string;
  todoist: string;
}

export interface DisplayConfig {
  format: 'compact' | 'detailed';
  maxTaskLength: number;
  showRemainingCount: boolean;
  showSource: boolean;
  icons: DisplayIcons;
  separator: string;
  priority: 'local' | 'todoist';
}

export interface Config {
  local: LocalConfig;
  todoist: TodoistConfig;
  refresh: RefreshConfig;
  completion: CompletionConfig;
  display: DisplayConfig;
}

// Statusline context from Claude Code
export interface StatuslineContext {
  model?: {
    id: string;
    displayName: string;
  };
  cwd?: string;
  session?: {
    id: string;
    startTime: string;
  };
  cost?: {
    totalTokens: number;
    costUSD: number;
  };
  contextWindow?: {
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  };
}

// Completion action
export interface CompletionAction {
  type: 'complete' | 'prompt';
  message?: string;
  target?: 'local' | 'todoist';
}

// Add task options
export interface AddTaskOptions {
  position: 'top' | 'bottom';
  target: 'local' | 'todoist';
  projectId?: string; // for Todoist
}
