import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { parse as parseYaml } from 'yaml';
import type { Config } from './types.js';

const DEFAULT_CONFIG: Config = {
  local: {
    filenames: ['TODO.md', 'TASKS.md'],
    parsing: {
      naTag: '@na',
      checkboxPattern: '- [ ]',
      bareItemPattern: '^\\s*-\\s+',
    },
    recursion: {
      stopAtHome: true,
      stopAtGitRoot: false,
      maxDepth: 20,
    },
  },
  todoist: {
    enabled: true,
    apiTokenEnv: 'TODOIST_API_TOKEN',
    filter: {
      excludeLabels: ['noapi', 'someday', 'waiting'],
      includeLabels: [],
      requireAllIncludeLabels: false,
      includeProjects: [],
      excludeProjects: ['Someday/Maybe'],
      dateFilter: {
        mode: 'actionable',
        respectDueTime: true,
        respectStartDate: true,
        includeNoDate: true,
        includeOverdue: true,
        deferDetection: {
          enabled: true,
          sources: [
            { type: 'label_prefix', prefix: 'defer:' },
            { type: 'description_prefix', prefix: '[START:' },
          ],
        },
      },
    },
    sort: [
      { field: 'priority', order: 'desc' },
      { field: 'due_date', order: 'asc', nulls: 'last' },
      { field: 'created_at', order: 'asc' },
    ],
  },
  refresh: {
    local: {
      trigger: 'chat_turn',
    },
    todoist: {
      intervalSeconds: 600,
      onStartup: true,
      onCommand: true,
    },
  },
  completion: {
    mode: 'confirm',
    autoDetection: {
      patterns: [
        "I've (completed|finished|done|fixed)",
        'The (task|issue|bug|feature) (is|has been) (complete|fixed|done)',
        'Successfully (implemented|resolved|addressed)',
      ],
    },
  },
  display: {
    mode: 'compact',
    maxTaskLength: 50,
    showRemainingCount: true,
    showSource: true,
    showTime: true,
    showContext: true,
    showDuration: true,
    showLocation: true,
    icons: {
      local: '📍',
      todoist: '📋',
    },
    separator: ' │ ',
    priority: 'local',
  },
};

function getConfigPaths(): string[] {
  const home = os.homedir();
  return [
    path.join(home, '.config', 'claude-na', 'config.yaml'),
    path.join(home, '.config', 'claude-na', 'config.yml'),
    path.join(home, '.claude-na.yaml'),
    path.join(home, '.claude-na.yml'),
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMergeObjects(target: any, source: any): any {
  if (source === undefined || source === null) {
    return target;
  }

  if (typeof source !== 'object' || Array.isArray(source)) {
    return source;
  }

  if (typeof target !== 'object' || target === null || Array.isArray(target)) {
    return source;
  }

  const result = { ...target };
  for (const key of Object.keys(source)) {
    result[key] = deepMergeObjects(target[key], source[key]);
  }
  return result;
}

function deepMerge(target: Config, source: Partial<Config>): Config {
  return deepMergeObjects(target, source) as Config;
}

// Convert snake_case config keys to camelCase
function snakeToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = snakeToCamel(value);
    }
    return result;
  }
  return obj;
}

export function loadConfig(): Config {
  const configPaths = getConfigPaths();

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = parseYaml(content);
        const camelCased = snakeToCamel(parsed) as Partial<Config>;
        return deepMerge(DEFAULT_CONFIG, camelCased);
      } catch (err) {
        console.error(`Error reading config from ${configPath}:`, err);
      }
    }
  }

  return DEFAULT_CONFIG;
}

export function getDefaultConfig(): Config {
  return DEFAULT_CONFIG;
}

// For tests and debugging
export function validateConfig(config: unknown): config is Config {
  if (typeof config !== 'object' || config === null) return false;

  const c = config as Record<string, unknown>;
  return (
    typeof c.local === 'object' &&
    typeof c.todoist === 'object' &&
    typeof c.refresh === 'object' &&
    typeof c.completion === 'object' &&
    typeof c.display === 'object'
  );
}
