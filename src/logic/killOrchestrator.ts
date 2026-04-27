/**
 * KillOrchestrator — Mediates all process termination requests.
 * SRS §3.2.4, FR-03, FR-04, NFR-07
 *
 * Responsibilities:
 * - Enforces PID safety threshold + system process name check
 * - Pre-kill PID validation (verify PID still exists and name matches)
 * - Invokes tree-kill for cross-platform process tree termination
 * - Logs outcomes to SessionHistory
 * - Triggers a PortScanner refresh after kill
 */

import * as vscode from 'vscode';
import * as os from 'os';
import { exec } from 'child_process';
import treeKill from 'tree-kill';
import { KillHistoryEntry } from '../types.js';
import {
  SYSTEM_PID_THRESHOLD,
  SYSTEM_PROCESS_NAMES,
  POST_KILL_REFRESH_DELAY_MS,
  COMMAND_TIMEOUT_MS,
} from '../constants.js';
import { SessionHistory } from '../state/sessionHistory.js';

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

/** Check if a process is a system-critical process */
function isSystemProcess(pid: number, processName: string): boolean {
  if (pid <= SYSTEM_PID_THRESHOLD) {
    return true;
  }
  // Check against known system process names (case-insensitive)
  const normalizedName = processName.replace(/\.exe$/i, '');
  for (const sysName of SYSTEM_PROCESS_NAMES) {
    if (sysName.toLowerCase() === normalizedName.toLowerCase()) {
      return true;
    }
  }
  return false;
}

/**
 * Verify that a PID still exists and matches the expected process name.
 * NFR-07: Prevents PID-reuse attacks.
 */
async function verifyPid(pid: number, expectedName: string): Promise<{ exists: boolean; nameMatches: boolean; currentName: string }> {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      const stdout = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, 2000);
      const match = stdout.match(/"([^"]+)","(\d+)"/);
      if (!match) {
        return { exists: false, nameMatches: false, currentName: '' };
      }
      const currentName = match[1].replace(/\.exe$/i, '');
      return {
        exists: true,
        nameMatches: currentName.toLowerCase() === expectedName.replace(/\.exe$/i, '').toLowerCase(),
        currentName,
      };
    } else {
      const stdout = await execAsync(`ps -p ${pid} -o comm=`, 2000);
      const currentName = stdout.trim().split('/').pop() || '';
      if (!currentName) {
        return { exists: false, nameMatches: false, currentName: '' };
      }
      return {
        exists: true,
        nameMatches: currentName.toLowerCase() === expectedName.toLowerCase(),
        currentName,
      };
    }
  } catch {
    return { exists: false, nameMatches: false, currentName: '' };
  }
}

/** Promisified tree-kill */
function killAsync(pid: number, signal?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    treeKill(pid, signal, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export class KillOrchestrator {
  private sessionHistory: SessionHistory;
  private onRefreshRequested: (() => void) | null = null;

  constructor(sessionHistory: SessionHistory) {
    this.sessionHistory = sessionHistory;
  }

  /** Register a callback to trigger port list refresh after a kill */
  setRefreshCallback(callback: () => void): void {
    this.onRefreshRequested = callback;
  }

  /**
   * Kill a process by PID.
   * Handles system process safety guard, PID validation, and logging.
   */
  async kill(
    pid: number,
    port: number,
    processName: string,
    source: KillHistoryEntry['source'] = 'sidebar'
  ): Promise<boolean> {
    // 1. System process safety guard (FR-04)
    if (isSystemProcess(pid, processName)) {
      const confirm = await vscode.window.showWarningMessage(
        `⚠️ System Process Warning\n\n` +
        `Process "${processName}" (PID ${pid}) appears to be a system-critical process.\n` +
        `Terminating it may cause OS instability.\n\n` +
        `Are you sure you want to kill this process?`,
        { modal: true },
        'Kill Anyway'
      );

      if (confirm !== 'Kill Anyway') {
        this.sessionHistory.log({
          timestamp: new Date().toISOString(),
          port,
          pid,
          processName,
          outcome: 'cancelled',
          errorMessage: 'User cancelled system process kill',
          riskLevel: 'high_risk',
          source,
        });
        return false;
      }
    }

    // 2. Pre-kill PID validation (NFR-07)
    const verification = await verifyPid(pid, processName);
    if (!verification.exists) {
      vscode.window.showInformationMessage(
        `Process "${processName}" (PID ${pid}) has already terminated.`
      );
      this.sessionHistory.log({
        timestamp: new Date().toISOString(),
        port,
        pid,
        processName,
        outcome: 'failure',
        errorMessage: 'Process no longer exists',
        riskLevel: isSystemProcess(pid, processName) ? 'high_risk' : 'normal',
        source,
      });
      // Still refresh to update the tree
      this.scheduleRefresh();
      return false;
    }

    if (!verification.nameMatches) {
      const proceed = await vscode.window.showWarningMessage(
        `PID Mismatch Warning\n\n` +
        `PID ${pid} is now running "${verification.currentName}" instead of "${processName}".\n` +
        `The original process may have terminated and the PID was reused.\n\n` +
        `Kill "${verification.currentName}" anyway?`,
        { modal: true },
        'Kill Anyway'
      );

      if (proceed !== 'Kill Anyway') {
        this.sessionHistory.log({
          timestamp: new Date().toISOString(),
          port,
          pid,
          processName,
          outcome: 'cancelled',
          errorMessage: `PID reuse detected: now "${verification.currentName}"`,
          riskLevel: 'high_risk',
          source,
        });
        return false;
      }
    }

    // 3. Kill the process
    try {
      await killAsync(pid, 'SIGTERM');

      this.sessionHistory.log({
        timestamp: new Date().toISOString(),
        port,
        pid,
        processName,
        outcome: 'success',
        errorMessage: null,
        riskLevel: isSystemProcess(pid, processName) ? 'high_risk' : 'normal',
        source,
      });

      vscode.window.showInformationMessage(
        `Killed "${processName}" (PID ${pid}) on port ${port}.`
      );

      // 4. Schedule refresh after kill
      this.scheduleRefresh();
      return true;
    } catch (err) {
      const errorMessage = (err as Error).message;

      this.sessionHistory.log({
        timestamp: new Date().toISOString(),
        port,
        pid,
        processName,
        outcome: 'failure',
        errorMessage,
        riskLevel: isSystemProcess(pid, processName) ? 'high_risk' : 'normal',
        source,
      });

      const retry = await vscode.window.showErrorMessage(
        `Failed to kill "${processName}" (PID ${pid}): ${errorMessage}`,
        'Retry'
      );

      if (retry === 'Retry') {
        return this.kill(pid, port, processName, source);
      }

      return false;
    }
  }

  /**
   * Kill all processes matching a set of ports (for bulk profile kill).
   * FR-08: Shows a confirmation modal listing all processes before killing.
   */
  async killBulk(
    entries: Array<{ pid: number; port: number; processName: string }>
  ): Promise<{ succeeded: number; failed: number }> {
    if (entries.length === 0) {
      return { succeeded: 0, failed: 0 };
    }

    // Show confirmation modal
    const processList = entries
      .map(e => `  • Port ${e.port}: ${e.processName} (PID ${e.pid})`)
      .join('\n');

    const confirm = await vscode.window.showWarningMessage(
      `Kill ${entries.length} process(es)?\n\n${processList}`,
      { modal: true },
      'Kill All'
    );

    if (confirm !== 'Kill All') {
      return { succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const entry of entries) {
      const result = await this.kill(entry.pid, entry.port, entry.processName, 'bulk_profile');
      if (result) { succeeded++; } else { failed++; }
    }

    return { succeeded, failed };
  }

  private scheduleRefresh(): void {
    if (this.onRefreshRequested) {
      setTimeout(() => {
        this.onRefreshRequested?.();
      }, POST_KILL_REFRESH_DELAY_MS);
    }
  }
}
