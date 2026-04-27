/**
 * StatusBarController — Enhanced status bar matching mockup design.
 *
 * Format: "⊙ N ports active  △ M conflicts  next free: NNNN"
 *
 * States:
 * - Normal (≤10 ports): default foreground
 * - Warning (>10 ports): warningBackground
 * - Error (conflict): errorBackground
 * - Scanning: loading spinner
 */

import * as vscode from 'vscode';
import { STATUS_BAR_WARNING_THRESHOLD } from '../constants.js';

export class StatusBarController {
  private statusBarItem: vscode.StatusBarItem;
  private isScanning: boolean = false;
  private conflictCount: number = 0;
  private nextFreePort: number | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'portman-ports.focus';
    this.statusBarItem.name = 'Portman';
    this.statusBarItem.show();
  }

  /** Update the status bar with current state */
  update(portCount: number, conflicts: number = 0, nextFree: number | null = null): void {
    if (this.isScanning) { return; }

    this.conflictCount = conflicts;
    this.nextFreePort = nextFree;

    // Build the text segments
    const parts: string[] = [];

    // Port count
    parts.push(`$(plug) ${portCount} port${portCount !== 1 ? 's' : ''} active`);

    // Conflict count (if any)
    if (conflicts > 0) {
      parts.push(`$(warning) ${conflicts} conflict${conflicts !== 1 ? 's' : ''}`);
    }

    // Next free port
    if (nextFree) {
      parts.push(`next free: ${nextFree}`);
    }

    this.statusBarItem.text = parts.join('   ');

    // Color state
    if (conflicts > 0) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.statusBarItem.tooltip = `${portCount} active ports, ${conflicts} conflict(s). Click to open Portman.`;
    } else if (portCount > STATUS_BAR_WARNING_THRESHOLD) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = `${portCount} active ports (high). Click to open Portman.`;
    } else if (portCount === 0) {
      this.statusBarItem.text = '$(plug) No active ports';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'No listening ports detected. Click to open Portman.';
    } else {
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = `${portCount} active port${portCount !== 1 ? 's' : ''}. Click to open Portman.`;
    }
  }

  /** Show scanning indicator */
  showScanning(): void {
    this.isScanning = true;
    this.statusBarItem.text = '$(loading~spin) Scanning...';
    this.statusBarItem.backgroundColor = undefined;
  }

  /** Clear scanning indicator */
  hideScanning(): void {
    this.isScanning = false;
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
