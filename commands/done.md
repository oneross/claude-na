# /done - Complete Current Task

Mark the current next action as complete.

## Usage

```
/done           # Complete current local task
/done local     # Explicitly complete local task
/done todoist   # Complete current Todoist task
```

## Behavior

For local tasks:
- Changes `- [ ]` to `- [x]` in the TODO.md file
- Removes the `@na` tag if present
- The next task in precedence order becomes the new next action

For Todoist tasks:
- Calls the Todoist API to mark the task complete
- Refreshes the task cache

## Examples

```
/done
# Output: ✅ Completed: Fix authentication bug

/done todoist
# Output: ✅ Completed (Todoist): Review quarterly report
```

## Implementation

```bash
claude-na done $ARGUMENTS
```
