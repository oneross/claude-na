# /setup - Configure claude-na

Set up claude-na statusline integration with Claude Code.

## Usage

```
/setup
```

## What This Does

1. Builds the claude-na package
2. Configures Claude Code's statusline to use claude-na
3. Creates a default config file if one doesn't exist

## Manual Setup

If you prefer to set up manually:

### 1. Install the package

```bash
npm install -g claude-na
# or
npm link  # if developing locally
```

### 2. Configure Claude Code statusline

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-na-statusline"
  }
}
```

### 3. (Optional) Configure Todoist

Set your API token:

```bash
export TODOIST_API_TOKEN="your-token-here"
```

Create a config file at `~/.config/claude-na/config.yaml`:

```yaml
todoist:
  enabled: true
  filter:
    exclude_labels: ["noapi", "someday"]
    exclude_projects: ["Someday/Maybe"]
```

## Implementation

```bash
npm run build && npm link
echo '{"statusLine":{"type":"command","command":"claude-na-statusline"}}' | claude settings merge -
echo "✅ claude-na configured!"
```
