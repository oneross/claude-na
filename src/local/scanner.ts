import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { parseFile } from './parser.js';
import type { LocalScanResult, LocalConfig } from '../types.js';

/**
 * Scan for the next actionable task, starting from startDir and walking up.
 *
 * Checks each directory for TODO.md (or configured filenames), parses for tasks,
 * and returns the highest-priority task found. If no tasks in current dir,
 * recursively checks parent directories.
 *
 * Stops at:
 * - Home directory (if stopAtHome is true)
 * - Git root (if stopAtGitRoot is true)
 * - Max depth reached
 */
export function scanForNextAction(startDir: string, config: LocalConfig): LocalScanResult {
  let currentDir = path.resolve(startDir);
  const homeDir = os.homedir();
  let depth = 0;

  while (depth < config.recursion.maxDepth) {
    for (const filename of config.filenames) {
      const filepath = path.join(currentDir, filename);

      if (fs.existsSync(filepath)) {
        const result = parseFile(filepath, config.parsing);

        if (result.primary) {
          // Calculate relative path for display
          const relativePath = path.relative(startDir, filepath);
          const displaySource = relativePath || filename;

          return {
            task: result.primary.text,
            source: displaySource,
            absolutePath: filepath,
            line: result.primary.line,
            remaining: result.remaining,
            type: result.primary.type,
          };
        }
        // File exists but no actionable items → continue to parent
      }
    }

    // Stop conditions
    if (currentDir === homeDir && config.recursion.stopAtHome) {
      break;
    }

    if (config.recursion.stopAtGitRoot) {
      const gitDir = path.join(currentDir, '.git');
      if (fs.existsSync(gitDir)) {
        break;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }

    currentDir = parentDir;
    depth++;
  }

  return {
    task: null,
    source: '',
    absolutePath: '',
    line: 0,
    remaining: 0,
    type: '',
  };
}

/**
 * Find the nearest TODO.md file (or create path for one).
 * Used when adding new tasks.
 */
export function findOrCreateTodoPath(startDir: string, config: LocalConfig): string {
  let currentDir = path.resolve(startDir);
  const homeDir = os.homedir();
  let depth = 0;

  // First, look for an existing TODO.md
  while (depth < config.recursion.maxDepth) {
    for (const filename of config.filenames) {
      const filepath = path.join(currentDir, filename);
      if (fs.existsSync(filepath)) {
        return filepath;
      }
    }

    if (currentDir === homeDir && config.recursion.stopAtHome) break;
    if (config.recursion.stopAtGitRoot) {
      if (fs.existsSync(path.join(currentDir, '.git'))) break;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;

    currentDir = parentDir;
    depth++;
  }

  // No existing file found, return path in start directory
  return path.join(startDir, config.filenames[0]);
}
