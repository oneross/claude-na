# claude-na

Next Action HUD for Claude Code — shows your most important task from local TODO.md files and Todoist.

## Installation

```bash
/plugin marketplace add oneross/claude-na
/plugin install claude-na
/claude-na:setup
```

Requires Claude Code v1.0.80+ and Node.js 18+.

## Statusline

```
14:32 │ ██████░░░░ 58% │ 12m │ claude-na:main +1 !2 │ 📍 Fix auth bug +2
```

| Segment | Description |
|---------|-------------|
| `14:32` | System time |
| `██████░░░░ 58%` | Context window usage (green→yellow→red) |
| `12m` | Session duration |
| `claude-na:main` | Directory and git branch |
| `+1 !2 ?3` | Git status: staged/modified/untracked |
| `📍 task +2` | Next action with remaining count |

### Git Status Indicators

| Symbol | Color | Meaning |
|--------|-------|---------|
| `+N` | green | Staged files |
| `!N` | yellow | Modified (unstaged) |
| `?N` | dim | Untracked files |
| `↑N` | cyan | Ahead of remote |
| `↓N` | red | Behind remote |

## Features

- Scans local `TODO.md` / `TASKS.md` files for next actions
- Integrates with Todoist API for external task management
- Color-coded context usage bar
- Git branch with status indicators
- Compact and verbose display modes
- Supports `@na` tags to prioritize specific tasks

## Commands

| Command | Description |
|---------|-------------|
| `/na` | Show current next action |
| `/aa` | Add a new action |
| `/done` | Mark current action complete |
| `/skip` | Skip current action temporarily |
| `/refresh` | Force refresh from all sources |

## Configuration

Create `~/.config/claude-na/config.yaml`:

```yaml
display:
  mode: compact          # or 'verbose' for two-line display
  show_time: true
  show_context: true
  show_duration: true
  show_location: true

todoist:
  enabled: true
  filter:
    exclude_labels: ["noapi", "someday"]
    exclude_projects: ["Someday/Maybe"]
```

Set `TODOIST_API_TOKEN` environment variable for Todoist integration.

## License

MIT
