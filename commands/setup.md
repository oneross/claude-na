---
description: Configure claude-na as your statusline
allowed-tools: Bash, Read, Edit
---

First, install dependencies and build:

```bash
cd "$(ls -td ~/.claude/plugins/cache/oneross-claude-na/claude-na/*/ 2>/dev/null | head -1)" && npm install --silent && npm run build --silent
```

Then add this statusLine configuration to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash -c 'node \"$(ls -td ~/.claude/plugins/cache/oneross-claude-na/claude-na/*/ 2>/dev/null | head -1)dist/statusline.js\"'"
  }
}
```

Merge with existing settings. Do not overwrite other fields.

The statusline appears immediately - no restart needed.

After setup, tell the user they can configure display mode and Todoist in `~/.config/claude-na/config.yaml`.
