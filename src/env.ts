/**
 * Environment utilities for detecting git branch, venv, etc.
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { EnvironmentInfo } from './types.js';

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
    gitBranch: getGitBranch(cwd),
    venv: getVenv(cwd),
    directory: path.basename(cwd),
    fullPath: cwd.replace(process.env.HOME || '', '~'),
  };
}
