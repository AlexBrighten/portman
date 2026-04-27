/**
 * SessionHistory — In-memory kill audit trail.
 * SRS FR-12, §7.4
 *
 * Per review feedback: includes a `lastTerminalCommand` buffer
 * for the "Kill & Retry" feature (FR-15, Phase 2 data contract).
 */

import * as vscode from 'vscode';
import { KillHistoryEntry } from '../types.js';
import { KILL_HISTORY_CHANNEL_NAME } from '../constants.js';

export class SessionHistory {
  private entries: KillHistoryEntry[] = [];
  private outputChannel: vscode.OutputChannel;

  /**
   * Buffer for the last terminal command, used by the "Kill & Retry"
   * feature in Phase 2 (FR-15). Designed in Phase 1 per review feedback
   * to avoid a refactor of the kill orchestrator later.
   */
  public lastTerminalCommand: {
    command: string;
    terminalName: string;
    timestamp: string;
  } | null = null;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(KILL_HISTORY_CHANNEL_NAME);
  }

  /** Log a kill event to the session history */
  log(entry: KillHistoryEntry): void {
    this.entries.push(entry);
    this.writeToChannel(entry);
  }

  /** Get all history entries */
  getEntries(): ReadonlyArray<KillHistoryEntry> {
    return this.entries;
  }

  /** Get the count of entries */
  get count(): number {
    return this.entries.length;
  }

  /** Clear all history entries */
  clear(): void {
    this.entries = [];
    this.outputChannel.clear();
    this.outputChannel.appendLine('--- Session history cleared ---');
  }

  /** Show the output channel */
  show(): void {
    if (this.entries.length === 0) {
      this.outputChannel.appendLine('No kill events recorded in this session.');
    }
    this.outputChannel.show(true);
  }

  /** Write a formatted entry to the output channel */
  private writeToChannel(entry: KillHistoryEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const risk = entry.riskLevel === 'high_risk' ? ' ⚠️ HIGH RISK' : '';
    const icon = entry.outcome === 'success' ? '✓' : entry.outcome === 'failure' ? '✗' : '○';

    let line = `[${timestamp}] ${icon} Port ${entry.port} | PID ${entry.pid} | ${entry.processName} | ${entry.outcome.toUpperCase()}${risk}`;

    if (entry.errorMessage) {
      line += ` | ${entry.errorMessage}`;
    }

    line += ` | via ${entry.source}`;

    this.outputChannel.appendLine(line);
  }

  /** Store the last terminal command for Kill & Retry (Phase 2) */
  setLastTerminalCommand(command: string, terminalName: string): void {
    this.lastTerminalCommand = {
      command,
      terminalName,
      timestamp: new Date().toISOString(),
    };
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
