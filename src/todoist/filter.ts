import type { TodoistTask, TodoistFilterConfig, DateFilterConfig, DeferDetectionConfig } from '../types.js';

/**
 * Extract defer/start date from task using configured detection methods.
 */
export function getTaskDeferDate(task: TodoistTask, config: DeferDetectionConfig): Date | null {
  if (!config.enabled) return null;

  for (const source of config.sources) {
    if (source.type === 'label_prefix') {
      // Look for label like "defer:2025-01-10"
      const deferLabel = task.labels.find((l) => l.startsWith(source.prefix));
      if (deferLabel) {
        const dateStr = deferLabel.replace(source.prefix, '');
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    if (source.type === 'description_prefix' && task.description) {
      // Look for [START:2025-01-10] in description
      const escapedPrefix = source.prefix.replace(/[[\]]/g, '\\$&');
      const regex = new RegExp(`${escapedPrefix}(\\d{4}-\\d{2}-\\d{2})\\]`);
      const match = task.description.match(regex);
      if (match) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
  }

  return null;
}

/**
 * Determine if a task is actionable based on date filtering rules.
 */
export function isTaskActionable(task: TodoistTask, config: DateFilterConfig): boolean {
  const now = new Date();

  // Check defer date first
  const deferDate = getTaskDeferDate(task, config.deferDetection);
  if (deferDate && deferDate > now) {
    return false; // Not yet actionable
  }

  // No due date handling
  if (!task.due) {
    return config.includeNoDate;
  }

  // Parse due date/datetime
  const dueDate = task.due.datetime
    ? new Date(task.due.datetime)
    : new Date(task.due.date + 'T23:59:59');

  // Overdue check
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dueDate < todayStart) {
    return config.includeOverdue;
  }

  // Future date check (not today)
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  if (dueDate >= todayEnd) {
    // Due in the future (not today)
    return false;
  }

  // Due today - check specific time
  if (task.due.datetime && config.respectDueTime) {
    // Has specific time - only actionable if that time has passed
    return dueDate <= now;
  }

  // Due today with no specific time = actionable
  return true;
}

/**
 * Filter tasks based on all configured criteria.
 */
export function filterTasks(tasks: TodoistTask[], config: TodoistFilterConfig): TodoistTask[] {
  return tasks.filter((task) => {
    // Label exclusions
    if (config.excludeLabels.some((l) => task.labels.includes(l))) {
      return false;
    }

    // Label inclusions (if specified)
    if (config.includeLabels.length > 0) {
      const hasRequired = config.requireAllIncludeLabels
        ? config.includeLabels.every((l) => task.labels.includes(l))
        : config.includeLabels.some((l) => task.labels.includes(l));
      if (!hasRequired) return false;
    }

    // Project exclusions
    if (task.projectName && config.excludeProjects.includes(task.projectName)) {
      return false;
    }

    // Project inclusions (if specified)
    if (config.includeProjects.length > 0) {
      if (!task.projectName || !config.includeProjects.includes(task.projectName)) {
        return false;
      }
    }

    // Date filtering
    if (config.dateFilter.mode === 'all') {
      return true;
    }

    if (config.dateFilter.mode === 'actionable') {
      return isTaskActionable(task, config.dateFilter);
    }

    if (config.dateFilter.mode === 'overdue') {
      if (!task.due) return false;
      const dueDate = task.due.datetime
        ? new Date(task.due.datetime)
        : new Date(task.due.date + 'T23:59:59');
      return dueDate < new Date();
    }

    if (config.dateFilter.mode === 'due_today') {
      if (!task.due) return false;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const dueDate = new Date(task.due.date);
      return dueDate >= todayStart && dueDate < todayEnd;
    }

    return true;
  });
}
