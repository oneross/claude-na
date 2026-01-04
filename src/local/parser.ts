import * as fs from 'node:fs';
import type { ParsedTask, LocalParseResult, ParsingConfig } from '../types.js';

/**
 * Parse a TODO.md file and extract tasks with precedence.
 *
 * Precedence order (highest to lowest):
 * 1. Checkbox with @na:    - [ ] task @na
 * 2. Bare item with @na:   - task @na
 * 3. First checkbox:       - [ ] task
 * 4. (Recurse to parent if none found - handled by scanner)
 */
export function parseFile(filepath: string, config: ParsingConfig): LocalParseResult {
  let content: string;
  try {
    content = fs.readFileSync(filepath, 'utf-8');
  } catch {
    return { primary: null, remaining: 0, file: filepath };
  }

  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];

  const naTag = config.naTag;
  // Match unchecked checkbox: - [ ] text
  const checkboxRegex = /^(\s*)-\s*\[\s*\]\s*(.+)$/;
  // Match bare list item (not a checkbox): - text
  const bareItemRegex = /^(\s*)-\s+(?!\[[ xX]\])(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasNa = line.includes(naTag);

    // Skip checked items
    if (/^\s*-\s*\[[xX]\]/.test(line)) {
      continue;
    }

    // Check for unchecked checkbox
    const checkboxMatch = line.match(checkboxRegex);
    if (checkboxMatch) {
      const rawText = checkboxMatch[2];
      const text = rawText.replace(naTag, '').trim();

      tasks.push({
        text,
        line: i + 1,
        type: hasNa ? 'checkbox_na' : 'checkbox',
        precedence: hasNa ? 1 : 3,
      });
      continue;
    }

    // Check for bare list item with @na tag
    const bareMatch = line.match(bareItemRegex);
    if (bareMatch && hasNa) {
      const rawText = bareMatch[2];
      const text = rawText.replace(naTag, '').trim();

      tasks.push({
        text,
        line: i + 1,
        type: 'bare_na',
        precedence: 2,
      });
    }
  }

  if (tasks.length === 0) {
    return { primary: null, remaining: 0, file: filepath };
  }

  // Sort by precedence (lowest number = highest priority)
  tasks.sort((a, b) => a.precedence - b.precedence);

  // Get best task and count others
  const primary = tasks[0];
  const remaining = tasks.length - 1;

  return { primary, remaining, file: filepath };
}

/**
 * Add a task to a TODO.md file.
 *
 * @param filepath Path to the TODO.md file
 * @param taskText The task text to add
 * @param position 'top' adds as first unchecked item, 'bottom' adds at end
 * @param asNa If true, adds @na tag
 */
export function addTaskToFile(
  filepath: string,
  taskText: string,
  position: 'top' | 'bottom',
  asNa: boolean = false
): void {
  let content = '';
  let lines: string[] = [];

  if (fs.existsSync(filepath)) {
    content = fs.readFileSync(filepath, 'utf-8');
    lines = content.split('\n');
  }

  const naTag = asNa ? ' @na' : '';
  const newLine = `- [ ] ${taskText}${naTag}`;

  if (position === 'top') {
    // Find the first list item and insert before it
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*-\s/.test(lines[i])) {
        insertIndex = i;
        break;
      }
      // If we hit the end without finding a list item, insert at end
      if (i === lines.length - 1) {
        insertIndex = lines.length;
      }
    }
    lines.splice(insertIndex, 0, newLine);
  } else {
    // Add at bottom
    // Remove trailing empty lines, add task, restore one newline
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
    lines.push(newLine);
  }

  fs.writeFileSync(filepath, lines.join('\n') + '\n');
}

/**
 * Mark a task as complete in a TODO.md file.
 *
 * @param filepath Path to the TODO.md file
 * @param lineNumber 1-indexed line number of the task
 */
export function completeTaskInFile(filepath: string, lineNumber: number): void {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');

  if (lineNumber < 1 || lineNumber > lines.length) {
    throw new Error(`Line number ${lineNumber} out of range`);
  }

  const idx = lineNumber - 1;
  const line = lines[idx];

  // Replace unchecked with checked, remove @na tag
  lines[idx] = line
    .replace(/^(\s*)-\s*\[\s*\]/, '$1- [x]')
    .replace(/@na\b/g, '')
    .trimEnd();

  fs.writeFileSync(filepath, lines.join('\n'));
}
