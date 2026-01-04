# /na - Show or Set Next Action

Show the current highest-priority task from local TODO.md and Todoist.

## Usage

```
/na              # Show current next action
/na "task text"  # Set a new next action (adds to top with @na tag)
```

## Behavior

When called without arguments:
- Scans for TODO.md in current directory and parent directories
- Fetches top task from Todoist (if configured)
- Displays both with priority indicators

When called with a task:
- Adds the task to the nearest TODO.md file
- Places it at the top of the list with `@na` tag
- This makes it the highest priority item

## Examples

```
/na
# Output: 📍 Fix auth bug +2 [TODO.md] │ 📋 Review PR [p1·today]

/na "Deploy hotfix for login issue"
# Output: 📍 Added next action: Deploy hotfix for login issue
#         → /Users/ross/projects/app/TODO.md
```

## Implementation

```bash
claude-na na $ARGUMENTS
```
