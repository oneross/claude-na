/**
 * Environment utilities for detecting git status, venv, etc.
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { EnvironmentInfo, GitStatus } from './types.js';

/**
 * Get the current git branch name.
 */
export function getGitBranch(cwd: string): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * Get full git status including staged, modified, untracked counts.
 */
export function getGitStatus(cwd: string): GitStatus {
  const result: GitStatus = {
    branch: null,
    staged: 0,
    modified: 0,
    untracked: 0,
    ahead: 0,
    behind: 0,
  };

  try {
    // Get branch name
    result.branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim() || null;

    // Get status with porcelain format for parsing
    const status = execSync('git status --porcelain -b', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = status.split('\n');

    for (const line of lines) {
      if (!line) continue;

      // First line is branch info: ## main...origin/main [ahead 1, behind 2]
      if (line.startsWith('## ')) {
        const aheadMatch = line.match(/ahead (\d+)/);
        const behindMatch = line.match(/behind (\d+)/);
        if (aheadMatch) result.ahead = parseInt(aheadMatch[1], 10);
        if (behindMatch) result.behind = parseInt(behindMatch[1], 10);
        continue;
      }

      // Status codes: XY where X=staged, Y=unstaged
      const x = line[0]; // staged status
      const y = line[1]; // unstaged status

      // Untracked files
      if (x === '?' && y === '?') {
        result.untracked++;
        continue;
      }

      // Staged changes (added, modified, deleted, renamed, copied)
      if (x !== ' ' && x !== '?') {
        result.staged++;
      }

      // Unstaged modifications
      if (y !== ' ' && y !== '?') {
        result.modified++;
      }
    }
  } catch {
    // Not a git repo or git not available
  }

  return result;
}

/**
 * Detect active Python virtual environment.
 * Checks VIRTUAL_ENV env var and common venv directory names.
 */
export function getVenv(cwd: string): string | null {
  // Check VIRTUAL_ENV environment variable first
  const virtualEnv = process.env.VIRTUAL_ENV;
  if (virtualEnv) {
    return path.basename(virtualEnv);
  }

  // Check for common venv directories in cwd
  const venvDirs = ['.venv', 'venv', '.env', 'env'];
  for (const dir of venvDirs) {
    const venvPath = path.join(cwd, dir);
    const activatePath = path.join(venvPath, 'bin', 'activate');
    if (fs.existsSync(activatePath)) {
      // Check if this venv is active by comparing paths
      const currentPython = process.env.PATH?.split(':').find(p => p.includes(dir));
      if (currentPython) {
        return dir;
      }
    }
  }

  return null;
}

/**
 * Get environment info for the statusline.
 */
export function getEnvironmentInfo(cwd: string): EnvironmentInfo {
  return {
    git: getGitStatus(cwd),
    venv: getVenv(cwd),
    directory: path.basename(cwd),
    fullPath: cwd.replace(process.env.HOME || '', '~'),
  };
}
