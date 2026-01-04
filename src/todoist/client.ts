import type { TodoistTask, TodoistConfig } from '../types.js';
import { filterTasks } from './filter.js';
import { sortTasks } from './sort.js';

interface TodoistApiTask {
  id: string;
  content: string;
  description: string;
  priority: number;
  due: {
    date: string;
    datetime?: string;
    timezone?: string;
    is_recurring: boolean;
    string: string;
  } | null;
  labels: string[];
  project_id: string;
  created_at: string;
  order: number;
}

interface TodoistProject {
  id: string;
  name: string;
}

interface CachedData {
  tasks: TodoistTask[];
  timestamp: number;
}

export class TodoistClient {
  private config: TodoistConfig;
  private cache: CachedData | null = null;
  private projectMap: Map<string, string> = new Map();

  constructor(config: TodoistConfig) {
    this.config = config;
  }

  private getApiToken(): string | null {
    return process.env[this.config.apiTokenEnv] || null;
  }

  private isCacheValid(ttlMs: number): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.timestamp < ttlMs;
  }

  /**
   * Fetch all tasks from Todoist API.
   */
  async fetchTasks(): Promise<TodoistTask[]> {
    const token = this.getApiToken();
    if (!token) {
      return [];
    }

    try {
      // Fetch projects first for name mapping
      const projectsRes = await fetch('https://api.todoist.com/rest/v2/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (projectsRes.ok) {
        const projects = (await projectsRes.json()) as TodoistProject[];
        this.projectMap.clear();
        for (const p of projects) {
          this.projectMap.set(p.id, p.name);
        }
      }

      // Fetch tasks
      const tasksRes = await fetch('https://api.todoist.com/rest/v2/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!tasksRes.ok) {
        console.error(`Todoist API error: ${tasksRes.status}`);
        return [];
      }

      const apiTasks = (await tasksRes.json()) as TodoistApiTask[];

      return apiTasks.map((t) => ({
        id: t.id,
        content: t.content,
        description: t.description,
        priority: t.priority,
        due: t.due
          ? {
              date: t.due.date,
              datetime: t.due.datetime,
              timezone: t.due.timezone,
              isRecurring: t.due.is_recurring,
              string: t.due.string,
            }
          : null,
        labels: t.labels,
        projectId: t.project_id,
        projectName: this.projectMap.get(t.project_id),
        createdAt: t.created_at,
        order: t.order,
      }));
    } catch (err) {
      console.error('Error fetching Todoist tasks:', err);
      return [];
    }
  }

  /**
   * Get filtered and sorted tasks, using cache if valid.
   */
  async getFilteredTasks(forceRefresh = false, ttlMs = 600000): Promise<TodoistTask[]> {
    if (!this.config.enabled) {
      return [];
    }

    if (!forceRefresh && this.isCacheValid(ttlMs)) {
      return this.cache!.tasks;
    }

    const allTasks = await this.fetchTasks();
    const filtered = filterTasks(allTasks, this.config.filter);
    const sorted = sortTasks(filtered, this.config.sort);

    this.cache = {
      tasks: sorted,
      timestamp: Date.now(),
    };

    return sorted;
  }

  /**
   * Get the top priority task.
   */
  async getTopTask(forceRefresh = false): Promise<TodoistTask | null> {
    const tasks = await this.getFilteredTasks(forceRefresh);
    return tasks[0] || null;
  }

  /**
   * Complete a task by ID.
   */
  async completeTask(taskId: string): Promise<boolean> {
    const token = this.getApiToken();
    if (!token) return false;

    try {
      const res = await fetch(`https://api.todoist.com/rest/v2/tasks/${taskId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Add a new task.
   */
  async addTask(content: string, projectId?: string, priority?: number): Promise<TodoistTask | null> {
    const token = this.getApiToken();
    if (!token) return null;

    try {
      const body: Record<string, unknown> = { content };
      if (projectId) body.project_id = projectId;
      if (priority) body.priority = priority;

      const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) return null;

      const task = (await res.json()) as TodoistApiTask;
      return {
        id: task.id,
        content: task.content,
        description: task.description,
        priority: task.priority,
        due: task.due
          ? {
              date: task.due.date,
              datetime: task.due.datetime,
              timezone: task.due.timezone,
              isRecurring: task.due.is_recurring,
              string: task.due.string,
            }
          : null,
        labels: task.labels,
        projectId: task.project_id,
        projectName: this.projectMap.get(task.project_id),
        createdAt: task.created_at,
        order: task.order,
      };
    } catch {
      return null;
    }
  }

  /**
   * Invalidate the cache.
   */
  invalidateCache(): void {
    this.cache = null;
  }
}
