/**
 * FrameworkDetector — Maps CLI command strings to human-readable framework labels.
 * SRS §3.2.3, FR-14
 *
 * Per review feedback: patterns are case-insensitive and include Windows-style
 * path separators (\\next\\ alongside /next/).
 */

import * as vscode from 'vscode';
import { FrameworkMapping } from '../types.js';
import { BUILTIN_FRAMEWORK_PATTERNS } from '../constants.js';

/**
 * Detect the framework from a process command string.
 * User-defined custom mappings from settings take precedence over built-in patterns.
 *
 * @param cmd - The full command-line invocation string
 * @returns Human-readable framework label, or null if no match
 */
export function detectFramework(cmd: string): string | null {
  if (!cmd || cmd.trim().length === 0) {
    return null;
  }

  // Check user-defined custom mappings first (they take precedence)
  const config = vscode.workspace.getConfiguration('portman');
  const customMappings = config.get<FrameworkMapping[]>('frameworkMappings', []);

  for (const mapping of customMappings) {
    try {
      const regex = new RegExp(mapping.pattern, 'i');
      if (regex.test(cmd)) {
        return mapping.label;
      }
    } catch {
      // Invalid regex in user settings — skip silently
      console.warn(`[Portman] Invalid regex in frameworkMappings: "${mapping.pattern}"`);
    }
  }

  // Check built-in patterns (ordered by specificity)
  for (const { pattern, label } of BUILTIN_FRAMEWORK_PATTERNS) {
    if (pattern.test(cmd)) {
      return label;
    }
  }

  // No match — return null (silent failure per SRS)
  return null;
}

/**
 * Detect framework from both the process name and command string.
 * Tries cmd first (more specific), then falls back to process name.
 */
export function detectFrameworkFromProcess(processName: string, cmd: string): string | null {
  // Try full command string first (most information)
  const fromCmd = detectFramework(cmd);
  if (fromCmd) { return fromCmd; }

  // Try process name as fallback
  const fromName = detectFramework(processName);
  return fromName;
}
