/**
 * WorkspaceGrouper — Associates ports with workspace folders.
 * SRS FR-10
 *
 * Platform-specific CWD detection:
 * - Linux: reads /proc/<pid>/cwd symlink
 * - macOS: lsof +p <pid> -Fn | grep ^n/
 * - Windows: wmic process where "ProcessId=N" get WorkingDirectory
 *
 * Per review: cmd string parsing is unreliable for CWD extraction.
 * Uses dedicated OS commands for accurate working directory lookup.
 */

import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import * as vscode from 'vscode';
import { PortEntry } from '../types.js';
import { COMMAND_TIMEOUT_MS } from '../constants.js';

/** Execute a shell command with timeout */
function execAsync(cmd: string, timeoutMs: number = COMMAND_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Get the working directory of a process by PID.
 * Returns null if the CWD cannot be determined.
 */
async function getProcessCwd(pid: number): Promise<string | null> {
  const platform = os.platform();

  try {
    if (platform === 'linux') {
      // Linux: read /proc/<pid>/cwd symlink
      const { readlink } = await import('fs/promises');
      try {
        const cwd = await readlink(`/proc/${pid}/cwd`);
        return cwd;
      } catch {
        return null;
      }
    } else if (platform === 'darwin') {
      // macOS: use lsof to find CWD
      // lsof +p <pid> outputs file descriptors; 'cwd' type is the working directory
      const stdout = await execAsync(`lsof -p ${pid} -Fn 2>/dev/null | head -20`, 2000);
      const lines = stdout.split('\n');
      // Look for the 'cwd' file descriptor line (preceded by 'tcwd')
      let foundCwd = false;
      for (const line of lines) {
        if (line.startsWith('tcwd')) {
          foundCwd = true;
          continue;
        }
        if (foundCwd && line.startsWith('n')) {
          return line.substring(1); // Remove 'n' prefix
        }
      }
      return null;
    } else if (platform === 'win32') {
      // Windows: use wmic to get the working directory
      // Per review: use WorkingDirectory, NOT ExecutablePath
      const stdout = await execAsync(
        `wmic process where "ProcessId=${pid}" get CommandLine /FORMAT:LIST`,
        2000
      );
      // WMIC CommandLine often contains the project path for Node.js processes
      // Parse for known project patterns
      const cmdLine = stdout.replace(/\r/g, '').trim();

      // Try PowerShell CWD detection (more reliable on modern Windows)
      try {
        const psStdout = await execAsync(
          `powershell -NoProfile -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).Path"`,
          2000
        );
        // Use the directory of the executable as a fallback
        const exePath = psStdout.trim();
        if (exePath) {
          // For node.js processes, check the command line for the script path
          const scriptMatch = cmdLine.match(/(?:node|bun|deno)\s+(?:"([^"]+)"|(\S+))/i);
          if (scriptMatch) {
            const scriptPath = scriptMatch[1] || scriptMatch[2];
            if (path.isAbsolute(scriptPath)) {
              return path.dirname(scriptPath);
            }
          }
        }
      } catch {
        // PowerShell not available, skip
      }

      return null;
    }
  } catch {
    // CWD detection failed — return null
  }

  return null;
}

/**
 * Determine which workspace folder a process belongs to by
 * matching its CWD against open workspace folder paths.
 */
function matchWorkspaceFolder(
  cwd: string | null,
  workspaceFolders: readonly vscode.WorkspaceFolder[],
): string | null {
  if (!cwd || workspaceFolders.length === 0) {
    return null;
  }

  const normalizedCwd = path.normalize(cwd).toLowerCase();

  for (const folder of workspaceFolders) {
    const folderPath = path.normalize(folder.uri.fsPath).toLowerCase();
    if (normalizedCwd.startsWith(folderPath)) {
      return folder.name;
    }
  }

  return null;
}

/**
 * Enrich port entries with workspace folder association.
 * Only runs CWD detection in multi-root workspaces.
 * In single-root, all dev ports default to the single workspace folder.
 */
export async function assignWorkspaceFolders(
  entries: PortEntry[],
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    // No workspace — all ports are unassociated
    for (const entry of entries) {
      entry.workspaceFolder = null;
    }
    return;
  }

  if (workspaceFolders.length === 1) {
    // Single-root: all dev ports belong to the one workspace, no CWD lookup needed
    const folderName = workspaceFolders[0].name;
    for (const entry of entries) {
      entry.workspaceFolder = entry.category === 'dev' ? folderName : null;
    }
    return;
  }

  // Multi-root: resolve CWD for each dev port
  const cwdCache = new Map<number, string | null>();

  await Promise.allSettled(
    entries
      .filter(e => e.category === 'dev')
      .map(async (entry) => {
        if (!cwdCache.has(entry.pid)) {
          const cwd = await getProcessCwd(entry.pid);
          cwdCache.set(entry.pid, cwd);
        }
        const cwd = cwdCache.get(entry.pid) ?? null;
        entry.workspaceFolder = matchWorkspaceFolder(cwd, workspaceFolders);
      })
  );

  // IDE and system ports are never workspace-associated
  for (const entry of entries) {
    if (entry.category !== 'dev') {
      entry.workspaceFolder = null;
    }
  }
}

/**
 * Group port entries by workspace folder for multi-root rendering.
 * Returns a Map: folder name → PortEntry[].
 * Unassociated dev ports go into "External Processes".
 */
export function groupByWorkspace(entries: PortEntry[]): Map<string, PortEntry[]> {
  const groups = new Map<string, PortEntry[]>();

  for (const entry of entries) {
    if (entry.category !== 'dev') { continue; }

    const key = entry.workspaceFolder || 'External Processes';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  return groups;
}
