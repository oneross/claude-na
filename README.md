# claude-na

**Next Action HUD for Claude Code** — always know what to work on next.

A Claude Code plugin that displays your highest-priority task in the statusline, pulling from local `TODO.md` files and Todoist.

```
📍 Fix auth bug +2 [TODO.md] │ 📋 Review PR [p1·today]
```

## Why?

When you're deep in a coding session with Claude, it's easy to lose track of what you're supposed to be doing. claude-na keeps your next action visible at all times, applying GTD principles to your AI-assisted workflow.

## Features

- **Local TODO.md scanning** — finds tasks in current directory and walks up the tree
- **Smart precedence** — `@na` tagged items take priority over regular checkboxes
- **Todoist integration** — syncs with your Todoist inbox with smart filtering
- **Actionable filtering** — hides deferred tasks, respects due times, excludes "someday" labels
- **Quick commands** — add, complete, and skip tasks without leaving Claude

## Quick Start

### Install

```bash
# Clone and install
git clone https://github.com/oneross/claude-na
cd claude-na
npm install && npm run build && npm link

# Configure Claude Code statusline
claude config set statusLine.type command
claude config set statusLine.command claude-na-statusline
```

### Add Todoist (optional)

```bash
export TODOIST_API_TOKEN="your-token"
```

## Commands

| Command | Description |
|---------|-------------|
| `/na` | Show current next action |
| `/na "task"` | Set a new next action (adds with @na tag) |
| `/aa "task"` | Add action to bottom of TODO.md |
| `/aa! "task"` | Add action to top (priority) |
| `/done` | Complete current task |
| `/skip` | Skip current task, show next |
| `/refresh` | Force refresh from all sources |

## How It Works

### Local Task Precedence

When scanning `TODO.md`, tasks are prioritized:

1. `- [ ] task @na` — Checkbox with @na tag (highest)
2. `- task @na` — Bare list item with @na tag
3. `- [ ] task` — First unchecked checkbox
4. *(recurse to parent directory)*

```markdown
## Tasks

- [ ] Write tests for edge cases
- [ ] Fix null check in validateToken @na   ← This wins
- Refactor JWT library @na
- [x] Add logging (done)
```

**Result:** "Fix null check in validateToken" + 2 more

### Todoist Filtering

By default, claude-na shows only actionable tasks:

- Excludes labels: `noapi`, `someday`, `waiting`
- Excludes projects: `Someday/Maybe`
- Respects due times (task at 10am hidden until 10am)
- Supports defer dates via `@defer:YYYY-MM-DD` labels

## Configuration

Create `~/.config/claude-na/config.yaml`:

```yaml
local:
  filenames: ["TODO.md", "TASKS.md"]
  parsing:
    na_tag: "@na"
  recursion:
    stop_at_home: true
    stop_at_git_root: false

todoist:
  enabled: true
  filter:
    exclude_labels: ["noapi", "someday", "waiting"]
    exclude_projects: ["Someday/Maybe"]
    date_filter:
      mode: "actionable"
      respect_due_time: true
      include_no_date: true

display:
  max_task_length: 50
  show_remaining_count: true
  icons:
    local: "📍"
    todoist: "📋"
```

## Inspirations

This project builds on ideas from:

- **[claude-hud](https://github.com/jarrodwatts/claude-hud)** — The original Claude Code statusline HUD, showing tokens, tools, and agent activity. claude-na follows the same architecture pattern.

- **[Taskwarrior](https://github.com/GothenburgBitFactory/taskwarrior)** — The gold standard for CLI task management. Inspired the filtering and precedence logic.

- **[todo.txt](https://github.com/todotxt/todo.txt-cli)** — Plain text task management done right. Influenced the local TODO.md format and parsing.

- **[GTD (Getting Things Done)](https://gettingthingsdone.com/)** — David Allen's methodology. The "next action" concept is core to GTD—always know the very next physical action for any project.

- **[Todoist](https://todoist.com/)** — For being the most API-friendly task manager with excellent filtering capabilities.

## Project Structure

```
claude-na/
├── .claude-plugin/
│   └── plugin.json         # Plugin manifest
├── commands/               # Slash commands
│   ├── na.md
│   ├── aa.md
│   ├── done.md
│   ├── skip.md
│   └── refresh.md
├── hooks/
│   └── hooks.json          # Event handlers
├── src/
│   ├── index.ts            # Main exports
│   ├── cli.ts              # CLI entry point
│   ├── statusline.ts       # Statusline script
│   ├── config.ts           # Config loader
│   ├── renderer.ts         # Output formatting
│   ├── types.ts            # TypeScript types
│   ├── local/              # TODO.md parsing
│   │   ├── parser.ts
│   │   └── scanner.ts
│   └── todoist/            # Todoist integration
│       ├── client.ts
│       ├── filter.ts
│       └── sort.ts
└── dist/                   # Compiled output
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Link locally
npm link
```

## License

MIT

---

Built for developers who want to stay focused while working with Claude.
