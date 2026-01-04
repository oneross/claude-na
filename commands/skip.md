# /skip - Skip Current Task

Skip the current local next action and move to the next task.

## Usage

```
/skip
```

## Behavior

- Removes the `@na` tag from the current task (if present)
- Does NOT mark the task as complete
- The next task in precedence order becomes the new next action
- Shows what the new next action is

## Use Case

Use `/skip` when:
- You're blocked on the current task
- You want to work on something else temporarily
- The current task isn't actionable right now

Unlike `/done`, the task remains in your TODO.md as uncompleted.

## Examples

```
/skip
# Output: ⏭ Skipped: Wait for API access approval
#         📍 Next: Implement caching layer
```

## Implementation

```bash
claude-na skip
```
