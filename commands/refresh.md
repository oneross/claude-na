# /refresh - Force Refresh

Force a refresh of tasks from all sources.

## Usage

```
/refresh
```

## Behavior

- Re-scans local TODO.md files
- Forces a fresh API call to Todoist (bypasses cache)
- Displays the updated next actions

## Use Case

Use `/refresh` when:
- You've made changes to TODO.md outside of Claude
- You've updated tasks in the Todoist app
- The cached Todoist data seems stale

## Examples

```
/refresh
# Output: Refreshing...
#         📍 Fix auth bug +2 [TODO.md] │ 📋 Review PR [p1·today]
```

## Implementation

```bash
claude-na refresh
```
