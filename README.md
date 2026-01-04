# claude-na

Next Action HUD for Claude Code — shows your most important task from local TODO.md files and Todoist.

## Installation

```bash
/plugin marketplace add oneross/claude-na
/plugin install claude-na
```

Requires Claude Code v1.0.80+ and Node.js 18+.

## Features

- Scans local `TODO.md` / `TASKS.md` files for next actions
- Integrates with Todoist API for external task management
- Displays in Claude Code statusline
- Supports `@na` tags to prioritize specific tasks

## Commands

| Command | Description |
|---------|-------------|
| `/na` | Show current next action |
| `/aa` | Add a new action |
| `/done` | Mark current action complete |
| `/skip` | Skip current action temporarily |
| `/refresh` | Force refresh from all sources |

## Local TODO.md Format

Tasks are selected by precedence:

1. `- [ ] task @na` — checkbox with @na tag (highest)
2. `- task @na` — bare item with @na tag
3. `- [ ] task` — first unchecked checkbox
4. If none found, recurses to parent directory

## Configuration

Create `~/.config/claude-na/config.yaml` to customize behavior. See [SPEC.md](SPEC.md) for full configuration options.

## License

MIT
