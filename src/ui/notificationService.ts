/**
 * NotificationService — Deduplicated notification wrapper.
 * SRS §6.4
 *
 * Implements a 2000ms deduplication window to suppress duplicate
 * notifications from rapid crash/retry scenarios.
 */

import * as vscode from 'vscode';
import { NOTIFICATION_DEDUP_WINDOW_MS } from '../constants.js';

export class NotificationService {
  /** Map of message hash → last shown timestamp */
  private recentMessages: Map<string, number> = new Map();

  /** Simple hash of a string for dedup key */
  private hash(message: string): string {
    return message.substring(0, 100);
  }

  /** Check if a message was recently shown */
  private isDuplicate(message: string): boolean {
    const key = this.hash(message);
    const lastShown = this.recentMessages.get(key);

    if (lastShown && Date.now() - lastShown < NOTIFICATION_DEDUP_WINDOW_MS) {
      return true;
    }

    this.recentMessages.set(key, Date.now());

    // Cleanup old entries
    if (this.recentMessages.size > 50) {
      const now = Date.now();
      for (const [k, v] of this.recentMessages) {
        if (now - v > NOTIFICATION_DEDUP_WINDOW_MS * 2) {
          this.recentMessages.delete(k);
        }
      }
    }

    return false;
  }

  /** Show an information notification (deduplicated) */
  async showInfo(message: string, ...actions: string[]): Promise<string | undefined> {
    if (this.isDuplicate(message)) { return undefined; }
    return vscode.window.showInformationMessage(message, ...actions);
  }

  /** Show a warning notification (deduplicated) */
  async showWarning(message: string, ...actions: string[]): Promise<string | undefined> {
    if (this.isDuplicate(message)) { return undefined; }
    return vscode.window.showWarningMessage(message, ...actions);
  }

  /** Show an error notification (deduplicated) */
  async showError(message: string, ...actions: string[]): Promise<string | undefined> {
    if (this.isDuplicate(message)) { return undefined; }
    return vscode.window.showErrorMessage(message, ...actions);
  }

  /** Show a notification without deduplication (for unique messages) */
  async showInfoDirect(message: string, ...actions: string[]): Promise<string | undefined> {
    return vscode.window.showInformationMessage(message, ...actions);
  }
}
