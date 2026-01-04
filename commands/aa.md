# /aa - Add Action

Add a new task to your TODO.md file.

## Usage

```
/aa "task text"   # Add to bottom of list
/aa! "task text"  # Add to top of list (priority)
```

## Behavior

- Finds the nearest TODO.md file (or creates one in current directory)
- Adds a new unchecked checkbox item
- `/aa` appends to the end of the list
- `/aa!` inserts at the beginning (for urgent items)

## Examples

```
/aa "Write integration tests for payment flow"
# Output: 📋 Added: Write integration tests for payment flow
#         → /Users/ross/projects/app/TODO.md

/aa! "Critical: Fix production database connection"
# Output: 📍 Added: Critical: Fix production database connection
#         → /Users/ross/projects/app/TODO.md
```

## Note

Use `/aa!` when you need to add something urgent but don't want to make it your immediate next action (which is what `/na "task"` does).

The difference:
- `/na "task"` → adds with `@na` tag, becomes the next action
- `/aa! "task"` → adds to top, but current @na task stays primary

## Implementation

```bash
claude-na aa $ARGUMENTS
```
