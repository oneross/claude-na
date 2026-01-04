# claude-na: Implementation Plan v2

## 1. Core Behavior (Updated)

### 1.1 Local TODO.md Task Selection Precedence

```
For each file, scan in this order:

1. ✅ Checkbox with @na tag       - [ ] Fix auth bug @na
2. ✅ Bare list item with @na     - Fix auth bug @na  
3. ✅ First unchecked checkbox    - [ ] Fix auth bug
4. ➡️ If none found → move to parent directory

Stop when ANY actionable item is found at current precedence level.
Count remaining items at same or lower precedence for "+ X more".
```

**Example file:**
```markdown
## Auth Module

- [ ] Write tests for edge cases
- [ ] Fix null check in validateToken @na
- Refactor to use new JWT library @na
- [x] Add logging (done)
```

**Result:** "Fix null check in validateToken" (checkbox + @na wins) + 2 more

### 1.2 Todoist Filtering (Enhanced)

```yaml
todoist:
  filter:
    # Label filters
    exclude_labels: ["noapi", "someday", "waiting"]
    include_labels: []                    # empty = all
    require_all_labels: false             # true = AND, false = OR
    
    # Project filters (multiple supported)
    exclude_projects: ["Someday/Maybe", "Archive"]
    include_projects: []                  # empty = all
    
    # Date filters
    date_filter:
      mode: "actionable"                  # "all" | "due_today" | "overdue" | "actionable"
      
      # "actionable" mode settings:
      # - Excludes tasks with due datetime in the future (today at 10am excluded until 10am)
      # - Excludes tasks with start_date in the future
      # - Includes overdue tasks
      # - Includes tasks due today with no specific time
      # - Includes tasks due today where time has passed
      
      respect_start_date: true            # filter out tasks where start_date > now
      include_no_date: true               # include tasks with no due date
      
  sort:
    - field: "priority"
      order: "desc"
    - field: "due_date"
      order: "asc"
      nulls: "last"                       # "first" | "last"
    - field: "created_at"
      order: "asc"
```

### 1.3 Completion Behavior

```yaml
completion:
  mode: "confirm"                         # "confirm" | "auto" | "explicit"
  
  # "confirm"  - After task completion detected, ask "Mark as done? [y/n]"
  # "auto"     - Automatically mark done when Claude completes related work
  # "explicit" - Only mark done via /claude-na:done command
```

### 1.4 Refresh Frequency

```yaml
refresh:
  local:
    trigger: "chat_turn"                  # "chat_turn" | "interval" | "file_change"
    interval_seconds: null                # only if trigger = "interval"
    
  todoist:
    interval_seconds: 600                 # 10 minutes
    on_startup: true                      # fetch immediately on plugin load
    on_command: true                      # fetch on /claude-na:next
```

---

## 2. Updated Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          claude-na                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Event Handler                          │   │
│  │  - chat_turn event → refresh local                        │   │
│  │  - timer (10min) → refresh todoist                        │   │
│  │  - startup → refresh both                                 │   │
│  └─────────────────────────┬────────────────────────────────┘   │
│                            │                                     │
│         ┌──────────────────┴──────────────────┐                 │
│         ▼                                      ▼                 │
│  ┌─────────────────┐                  ┌─────────────────┐       │
│  │  Local Scanner  │                  │ Todoist Client  │       │
│  │                 │                  │                 │       │
│  │ Precedence:     │                  │ Filters:        │       │
│  │ 1. [ ] + @na    │                  │ - labels        │       │
│  │ 2. - item @na   │                  │ - projects[]    │       │
│  │ 3. [ ] first    │                  │ - date mode     │       │
│  │ 4. recurse up   │                  │ - start_date    │       │
│  │                 │                  │                 │       │
│  │ Returns:        │                  │ Cache:          │       │
│  │ - task          │                  │ - TTL: 600s     │       │
│  │ - source file   │                  │ - in-memory     │       │
│  │ - remaining     │                  │                 │       │
│  └────────┬────────┘                  └────────┬────────┘       │
│           │                                    │                 │
│           └──────────────┬─────────────────────┘                │
│                          ▼                                       │
│                 ┌─────────────────┐                             │
│                 │    Renderer     │                             │
│                 │                 │                             │
│                 │ 📍 Task +2 more │                             │
│                 │ 📋 Task [p1·today]                            │
│                 └────────┬────────┘                             │
│                          │                                       │
│                          ▼                                       │
│                 ┌─────────────────┐                             │
│                 │  Completion     │                             │
│                 │  Handler        │                             │
│                 │                 │                             │
│                 │ mode: confirm   │                             │
│                 │ mode: auto      │                             │
│                 │ mode: explicit  │                             │
│                 └─────────────────┘                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Updated Configuration Schema

```yaml
# ~/.config/claude-na/config.yaml

#──────────────────────────────────────────────────────────────────
# LOCAL FILE SCANNING
#──────────────────────────────────────────────────────────────────
local:
  filenames: ["TODO.md", "TASKS.md"]      # check in order
  
  parsing:
    # Precedence order (highest to lowest):
    # 1. Checkbox with @na:    - [ ] task @na
    # 2. Bare item with @na:   - task @na
    # 3. First checkbox:       - [ ] task
    # 4. Recurse to parent if none found
    
    na_tag: "@na"                         # tag that elevates priority
    checkbox_pattern: "- [ ]"             # unchecked checkbox
    bare_item_pattern: "^\\s*-\\s+"       # list item without checkbox
    
  recursion:
    stop_at_home: true
    stop_at_git_root: false
    max_depth: 20                         # safety limit

#──────────────────────────────────────────────────────────────────
# TODOIST INTEGRATION  
#──────────────────────────────────────────────────────────────────
todoist:
  enabled: true
  api_token_env: "TODOIST_API_TOKEN"
  
  filter:
    # Labels
    exclude_labels: ["noapi", "someday", "waiting"]
    include_labels: []
    require_all_include_labels: false
    
    # Projects (multiple supported)
    include_projects: []                  # empty = all
    exclude_projects: ["Someday/Maybe"]
    
    # Date filtering
    date_filter:
      mode: "actionable"
      # Modes:
      #   "all"        - no date filtering
      #   "due_today"  - due today or overdue only
      #   "overdue"    - overdue only  
      #   "actionable" - smart filtering (see below)
      
      # Actionable mode behavior:
      respect_due_time: true              # exclude "today 10am" until 10am
      respect_start_date: true            # exclude if start_date > now
      include_no_date: true               # include undated tasks
      include_overdue: true               # include past-due tasks
      
  sort:
    - field: "priority"                   # 1=p4, 4=p1 in API
      order: "desc"
    - field: "due_date"
      order: "asc"  
      nulls: "last"
    - field: "created_at"
      order: "asc"

#──────────────────────────────────────────────────────────────────
# REFRESH TIMING
#──────────────────────────────────────────────────────────────────
refresh:
  local:
    trigger: "chat_turn"                  # refresh after each Claude response
    
  todoist:
    interval_seconds: 600                 # 10 minutes
    on_startup: true
    on_command: true                      # /claude-na:next forces refresh

#──────────────────────────────────────────────────────────────────
# COMPLETION BEHAVIOR
#──────────────────────────────────────────────────────────────────
completion:
  mode: "confirm"
  # Options:
  #   "confirm"  - prompt before marking done
  #   "auto"     - mark done automatically when work detected
  #   "explicit" - only via /claude-na:done
  
  # Auto mode detection (when mode = "auto"):
  auto_detection:
    # Patterns in Claude's response that suggest task completion:
    patterns:
      - "I've (completed|finished|done|fixed)"
      - "The (task|issue|bug|feature) (is|has been) (complete|fixed|done)"
      - "Successfully (implemented|resolved|addressed)"

#──────────────────────────────────────────────────────────────────
# DISPLAY
#──────────────────────────────────────────────────────────────────
display:
  format: "compact"
  max_task_length: 50
  show_remaining_count: true              # " + 3 more"
  show_source: true
  
  icons:
    local: "📍"
    todoist: "📋"
    
  separator: " │ "
  
  # Priority display
  priority: "local"                       # which shows first: "local" | "todoist"
```

---

## 4. Component Specifications (Updated)

### 4.1 Local Parser with Precedence (`src/local/parser.ts`)

```typescript
interface ParsedTask {
  text: string;
  line: number;
  type: 'checkbox_na' | 'bare_na' | 'checkbox' | 'bare';
  precedence: number;  // 1 = highest
}

interface ParseResult {
  primary: ParsedTask | null;
  remaining: number;
  file: string;
}

function parseFile(filepath: string, config: ParsingConfig): ParseResult {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];
  
  const naTag = config.na_tag;  // @na
  const checkboxRegex = /^(\s*)-\s*\[\s*\]\s*(.+)$/;
  const bareItemRegex = /^(\s*)-\s+(?!\[[ x]\])(.+)$/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasNa = line.includes(naTag);
    
    // Check for checkbox
    const checkboxMatch = line.match(checkboxRegex);
    if (checkboxMatch) {
      const text = checkboxMatch[2].replace(naTag, '').trim();
      tasks.push({
        text,
        line: i + 1,
        type: hasNa ? 'checkbox_na' : 'checkbox',
        precedence: hasNa ? 1 : 3
      });
      continue;
    }
    
    // Check for bare list item (only if has @na, or as fallback)
    const bareMatch = line.match(bareItemRegex);
    if (bareMatch && hasNa) {
      const text = bareMatch[2].replace(naTag, '').trim();
      tasks.push({
        text,
        line: i + 1,
        type: 'bare_na',
        precedence: 2
      });
    }
  }
  
  if (tasks.length === 0) {
    return { primary: null, remaining: 0, file: filepath };
  }
  
  // Sort by precedence (lowest number = highest priority)
  tasks.sort((a, b) => a.precedence - b.precedence);
  
  // Get best task and count others at same or lower precedence
  const primary = tasks[0];
  const remaining = tasks.length - 1;
  
  return { primary, remaining, file: filepath };
}
```

### 4.2 Reverse-Recursive Scanner (`src/local/scanner.ts`)

```typescript
interface ScanResult {
  task: string | null;
  source: string;           // relative path for display
  absolutePath: string;
  line: number;
  remaining: number;
  type: string;
}

function scanForNextAction(startDir: string, config: LocalConfig): ScanResult {
  let currentDir = path.resolve(startDir);
  const homeDir = os.homedir();
  let depth = 0;
  
  while (depth < config.recursion.max_depth) {
    for (const filename of config.filenames) {
      const filepath = path.join(currentDir, filename);
      
      if (fs.existsSync(filepath)) {
        const result = parseFile(filepath, config.parsing);
        
        if (result.primary) {
          return {
            task: result.primary.text,
            source: path.relative(startDir, filepath) || filename,
            absolutePath: filepath,
            line: result.primary.line,
            remaining: result.remaining,
            type: result.primary.type
          };
        }
        // File exists but no actionable items → continue to parent
      }
    }
    
    // Stop conditions
    if (currentDir === homeDir && config.recursion.stop_at_home) break;
    if (config.recursion.stop_at_git_root) {
      if (fs.existsSync(path.join(currentDir, '.git'))) break;
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    
    currentDir = parentDir;
    depth++;
  }
  
  return {
    task: null,
    source: '',
    absolutePath: '',
    line: 0,
    remaining: 0,
    type: ''
  };
}
```

### 4.3 Todoist Date Filtering (`src/todoist/filter.ts`)

```typescript
interface TodoistTask {
  id: string;
  content: string;
  priority: number;
  due: {
    date: string;           // "2025-01-04"
    datetime?: string;      // "2025-01-04T10:00:00"
    timezone?: string;
  } | null;
  labels: string[];
  projectId: string;
  projectName?: string;
  createdAt: string;
  
  // Todoist's "start date" feature (if using duration)
  duration?: {
    amount: number;
    unit: string;
  };
}

function isTaskActionable(task: TodoistTask, config: DateFilterConfig): boolean {
  const now = new Date();
  
  // No due date handling
  if (!task.due) {
    return config.include_no_date;
  }
  
  const dueDate = task.due.datetime 
    ? new Date(task.due.datetime)
    : new Date(task.due.date + 'T23:59:59');
  
  // Overdue check
  if (dueDate < now) {
    return config.include_overdue;
  }
  
  // Future date check (not today)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  if (dueDate >= todayEnd) {
    // Due in the future (not today)
    return false;
  }
  
  // Due today - check specific time
  if (task.due.datetime && config.respect_due_time) {
    // Has specific time - only actionable if that time has passed
    return dueDate <= now;
  }
  
  // Due today with no specific time = actionable
  return true;
}

function filterTasks(tasks: TodoistTask[], config: TodoistFilterConfig): TodoistTask[] {
  return tasks.filter(task => {
    // Label exclusions
    if (config.exclude_labels.some(l => task.labels.includes(l))) {
      return false;
    }
    
    // Label inclusions (if specified)
    if (config.include_labels.length > 0) {
      const hasRequired = config.require_all_include_labels
        ? config.include_labels.every(l => task.labels.includes(l))
        : config.include_labels.some(l => task.labels.includes(l));
      if (!hasRequired) return false;
    }
    
    // Project exclusions
    if (config.exclude_projects.includes(task.projectName || '')) {
      return false;
    }
    
    // Project inclusions (if specified)
    if (config.include_projects.length > 0) {
      if (!config.include_projects.includes(task.projectName || '')) {
        return false;
      }
    }
    
    // Date filtering
    if (config.date_filter.mode === 'all') {
      return true;
    }
    
    if (config.date_filter.mode === 'actionable') {
      return isTaskActionable(task, config.date_filter);
    }
    
    // Other modes: due_today, overdue
    // ... implement as needed
    
    return true;
  });
}
```

### 4.4 Completion Handler (`src/completion/handler.ts`)

```typescript
type CompletionMode = 'confirm' | 'auto' | 'explicit';

interface CompletionContext {
  mode: CompletionMode;
  currentLocalTask: ScanResult | null;
  currentTodoistTask: TodoistTask | null;
  lastClaudeResponse: string;
}

class CompletionHandler {
  constructor(private config: CompletionConfig) {}
  
  async handleChatTurn(ctx: CompletionContext): Promise<CompletionAction | null> {
    if (this.config.mode === 'explicit') {
      return null;  // Do nothing, wait for /claude-na:done
    }
    
    if (this.config.mode === 'auto') {
      const completed = this.detectCompletion(ctx.lastClaudeResponse);
      if (completed) {
        // Auto-complete without asking
        return this.buildCompletionAction(ctx);
      }
      return null;
    }
    
    if (this.config.mode === 'confirm') {
      const completed = this.detectCompletion(ctx.lastClaudeResponse);
      if (completed) {
        // Return a prompt action
        return {
          type: 'prompt',
          message: `Task appears complete. Mark "${ctx.currentLocalTask?.task || ctx.currentTodoistTask?.content}" as done? [y/n]`
        };
      }
      return null;
    }
    
    return null;
  }
  
  private detectCompletion(response: string): boolean {
    const patterns = this.config.auto_detection.patterns;
    return patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(response);
    });
  }
  
  async completeLocal(task: ScanResult): Promise<void> {
    const content = fs.readFileSync(task.absolutePath, 'utf-8');
    const lines = content.split('\n');
    
    // Replace unchecked with checked
    const line = lines[task.line - 1];
    lines[task.line - 1] = line
      .replace('- [ ]', '- [x]')
      .replace('@na', '@done');
    
    fs.writeFileSync(task.absolutePath, lines.join('\n'));
  }
  
  async completeTodoist(task: TodoistTask): Promise<void> {
    const token = process.env[this.config.api_token_env];
    await fetch(`https://api.todoist.com/rest/v2/tasks/${task.id}/close`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
}
```

### 4.5 Event Handler / Main Loop (`src/index.ts`)

```typescript
class ClaudeNa {
  private localResult: ScanResult | null = null;
  private todoistResult: TodoistTask | null = null;
  private todoistLastFetch: number = 0;
  private config: Config;
  private completionHandler: CompletionHandler;
  
  constructor() {
    this.config = loadConfig();
    this.completionHandler = new CompletionHandler(this.config.completion);
  }
  
  async onStartup(): Promise<void> {
    await this.refreshLocal();
    if (this.config.refresh.todoist.on_startup) {
      await this.refreshTodoist();
    }
  }
  
  async onChatTurn(claudeResponse: string): Promise<string> {
    // Always refresh local
    await this.refreshLocal();
    
    // Refresh Todoist if interval elapsed
    const now = Date.now();
    const elapsed = now - this.todoistLastFetch;
    if (elapsed > this.config.refresh.todoist.interval_seconds * 1000) {
      await this.refreshTodoist();
    }
    
    // Check for completion
    const completionAction = await this.completionHandler.handleChatTurn({
      mode: this.config.completion.mode,
      currentLocalTask: this.localResult,
      currentTodoistTask: this.todoistResult,
      lastClaudeResponse: claudeResponse
    });
    
    // Render statusline
    return this.render(completionAction);
  }
  
  private async refreshLocal(): Promise<void> {
    this.localResult = scanForNextAction(process.cwd(), this.config.local);
  }
  
  private async refreshTodoist(): Promise<void> {
    if (!this.config.todoist.enabled) return;
    
    const client = new TodoistClient(this.config.todoist);
    this.todoistResult = await client.getFilteredTask();
    this.todoistLastFetch = Date.now();
  }
  
  private render(completionAction: CompletionAction | null): string {
    const parts: string[] = [];
    const cfg = this.config.display;
    
    // Local task
    if (this.localResult?.task) {
      let text = truncate(this.localResult.task, cfg.max_task_length);
      if (cfg.show_remaining_count && this.localResult.remaining > 0) {
        text += ` + ${this.localResult.remaining} more`;
      }
      if (cfg.show_source) {
        text += ` [${this.localResult.source}]`;
      }
      parts.push(`${cfg.icons.local} ${text}`);
    }
    
    // Todoist task
    if (this.todoistResult) {
      let text = truncate(this.todoistResult.content, cfg.max_task_length);
      const meta: string[] = [];
      if (this.todoistResult.priority > 1) {
        meta.push(`p${5 - this.todoistResult.priority}`);
      }
      if (this.todoistResult.due) {
        meta.push(formatDue(this.todoistResult.due));
      }
      if (meta.length) text += ` [${meta.join(' · ')}]`;
      parts.push(`${cfg.icons.todoist} ${text}`);
    }
    
    let output = parts.length > 0 
      ? parts.join(cfg.separator)
      : '✓ No pending actions';
    
    // Append completion prompt if needed
    if (completionAction?.type === 'prompt') {
      output += `\n${completionAction.message}`;
    }
    
    return output;
  }
}
```

---

## 5. Todoist "Start Date" / Defer Support

Todoist doesn't have a native "start date" but you can simulate with:

1. **Label convention:** `@defer:2025-01-10` → filter out until that date
2. **Description prefix:** Tasks starting with `[START:2025-01-10]` 
3. **Due date as proxy:** Some people use "due date" as "do date"

Add to config:

```yaml
todoist:
  filter:
    date_filter:
      # Custom defer/start date support
      defer_detection:
        enabled: true
        sources:
          - type: "label_prefix"
            prefix: "defer:"           # @defer:2025-01-10
          - type: "description_prefix"
            prefix: "[START:"          # [START:2025-01-10] in description
```

```typescript
function getTaskDeferDate(task: TodoistTask, config: DeferConfig): Date | null {
  if (!config.enabled) return null;
  
  for (const source of config.sources) {
    if (source.type === 'label_prefix') {
      const deferLabel = task.labels.find(l => l.startsWith(source.prefix));
      if (deferLabel) {
        const dateStr = deferLabel.replace(source.prefix, '');
        return new Date(dateStr);
      }
    }
    
    if (source.type === 'description_prefix' && task.description) {
      const match = task.description.match(new RegExp(`\\${source.prefix}(\\d{4}-\\d{2}-\\d{2})\\]`));
      if (match) {
        return new Date(match[1]);
      }
    }
  }
  
  return null;
}

function isTaskActionable(task: TodoistTask, config: DateFilterConfig): boolean {
  // Check defer date first
  const deferDate = getTaskDeferDate(task, config.defer_detection);
  if (deferDate && deferDate > new Date()) {
    return false;  // Not yet actionable
  }
  
  // ... rest of existing logic
}
```

---

## 6. Updated Implementation Phases

### Phase 1: Local MVP (4 hours)
- [ ] Precedence-based parser (checkbox+@na → bare+@na → checkbox → recurse)
- [ ] Reverse-recursive scanner
- [ ] Remaining count ("+ X more")
- [ ] Config loader
- [ ] Basic statusline output
- [ ] Claude Code plugin manifest

### Phase 2: Todoist Integration (4 hours)
- [ ] API client with caching (10 min TTL)
- [ ] Multi-project filtering
- [ ] Label filtering (include/exclude)
- [ ] Date filtering with time-aware logic
- [ ] Defer/start date detection
- [ ] Sort chain

### Phase 3: Event Loop & Refresh (2 hours)
- [ ] Chat turn event handling
- [ ] Timer-based Todoist refresh
- [ ] Startup initialization

### Phase 4: Completion Handling (2 hours)
- [ ] Confirm mode (detect + prompt)
- [ ] Auto mode (detect + complete)
- [ ] Explicit mode (command only)
- [ ] Local file modification
- [ ] Todoist API completion

### Phase 5: Commands (2 hours)
- [ ] `/claude-na:next` - force refresh and display
- [ ] `/claude-na:add local|todoist <task>`
- [ ] `/claude-na:done [local|todoist]`
- [ ] `/claude-na:config`
- [ ] `/claude-na:skip` - temporarily hide current task

### Phase 6: Polish (2 hours)
- [ ] Error handling
- [ ] Offline mode (Todoist unavailable)
- [ ] Config validation
- [ ] Documentation

---

## 7. Final Questions

1. **Defer label format preference?** `@defer:2025-01-10` or something else?
- yes, YYYY-MM-DD

2. **Should "+ X more" count only same-file tasks, or recursively count all parent TODO.md files too?**
- same file only

3. **If both local and Todoist have tasks, and local gets completed, should Todoist task auto-promote to primary display?**
- no, always one of local, one of todoist

4. **Plugin name:** `claude-na` works, or prefer something else?
- that works!