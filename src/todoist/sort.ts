import type { TodoistTask, TodoistSortField } from '../types.js';

/**
 * Sort tasks according to configured sort chain.
 */
export function sortTasks(tasks: TodoistTask[], sortConfig: TodoistSortField[]): TodoistTask[] {
  return [...tasks].sort((a, b) => {
    for (const sortField of sortConfig) {
      const comparison = compareByField(a, b, sortField);
      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  });
}

function compareByField(a: TodoistTask, b: TodoistTask, config: TodoistSortField): number {
  const { field, order, nulls = 'last' } = config;
  const multiplier = order === 'asc' ? 1 : -1;

  let aVal: number | string | null;
  let bVal: number | string | null;

  switch (field) {
    case 'priority':
      // Todoist: 4 = p1 (highest), 1 = p4 (lowest)
      aVal = a.priority;
      bVal = b.priority;
      break;

    case 'due_date':
      aVal = a.due?.datetime || a.due?.date || null;
      bVal = b.due?.datetime || b.due?.date || null;
      break;

    case 'created_at':
      aVal = a.createdAt;
      bVal = b.createdAt;
      break;

    default:
      return 0;
  }

  // Handle nulls
  if (aVal === null && bVal === null) return 0;
  if (aVal === null) return nulls === 'first' ? -1 : 1;
  if (bVal === null) return nulls === 'first' ? 1 : -1;

  // Compare values
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    return aVal.localeCompare(bVal) * multiplier;
  }

  if (aVal < bVal) return -1 * multiplier;
  if (aVal > bVal) return 1 * multiplier;
  return 0;
}
