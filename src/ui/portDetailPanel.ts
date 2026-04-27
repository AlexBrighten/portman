/**
 * PortDetailPanel — Webview panel showing detailed port information.
 * Matches the mockup design: large port header, actions, stats grid, activity log.
 */

import * as vscode from 'vscode';
import { PortEntry, PortActivity } from '../types.js';
import { ActivityTracker } from '../state/activityTracker.js';

export class PortDetailPanel {
  public static currentPanel: PortDetailPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private currentEntry: PortEntry | null = null;
  private activityTracker: ActivityTracker;
  private disposables: vscode.Disposable[] = [];
  private onKillRequest: ((entry: PortEntry) => void) | null = null;
  private onFindFreePort: ((port: number) => void) | null = null;
  private freePorts: number[] = [];

  private constructor(panel: vscode.WebviewPanel, activityTracker: ActivityTracker) {
    this.panel = panel;
    this.activityTracker = activityTracker;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null,
      this.disposables
    );
  }

  /** Show or create the detail panel */
  static show(
    entry: PortEntry,
    activityTracker: ActivityTracker,
    freePorts: number[],
    onKill: (entry: PortEntry) => void,
    onFindFreePort: (port: number) => void,
  ): PortDetailPanel {
    if (PortDetailPanel.currentPanel) {
      PortDetailPanel.currentPanel.currentEntry = entry;
      PortDetailPanel.currentPanel.freePorts = freePorts;
      PortDetailPanel.currentPanel.onKillRequest = onKill;
      PortDetailPanel.currentPanel.onFindFreePort = onFindFreePort;
      PortDetailPanel.currentPanel.updateContent(entry, freePorts);
      PortDetailPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return PortDetailPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'portmanDetail',
      `:${entry.port} — Portman`,
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const detailPanel = new PortDetailPanel(panel, activityTracker);
    detailPanel.currentEntry = entry;
    detailPanel.freePorts = freePorts;
    detailPanel.onKillRequest = onKill;
    detailPanel.onFindFreePort = onFindFreePort;
    detailPanel.updateContent(entry, freePorts);

    PortDetailPanel.currentPanel = detailPanel;
    return detailPanel;
  }

  /** Update the panel with new port data */
  updateContent(entry: PortEntry, freePorts: number[]): void {
    this.currentEntry = entry;
    this.freePorts = freePorts;
    this.panel.title = `:${entry.port} — Portman`;
    this.panel.webview.html = this.getHtml(entry, freePorts);
  }

  /** Update just the activity log and uptime without full re-render */
  updateDynamic(entry: PortEntry): void {
    if (this.currentEntry && this.currentEntry.port === entry.port) {
      this.currentEntry = entry;
      this.panel.webview.postMessage({
        type: 'update',
        uptime: this.activityTracker.getUptime(entry.port),
        activities: this.activityTracker.getActivities(entry.port),
        memoryMB: entry.memoryMB,
        status: entry.status,
      });
    }
  }

  private handleMessage(message: { command: string; port?: number }): void {
    switch (message.command) {
      case 'kill':
        if (this.currentEntry && this.onKillRequest) {
          this.onKillRequest(this.currentEntry);
        }
        break;
      case 'switchPort':
        if (message.port && this.onFindFreePort) {
          this.onFindFreePort(message.port);
        }
        break;
      case 'copyUrl':
        if (this.currentEntry) {
          const addr = this.currentEntry.address === '0.0.0.0' ? 'localhost' : this.currentEntry.address;
          vscode.env.clipboard.writeText(`http://${addr}:${this.currentEntry.port}`);
          vscode.window.showInformationMessage(`Copied http://${addr}:${this.currentEntry.port}`);
        }
        break;
      case 'copyPort':
        if (this.currentEntry) {
          vscode.env.clipboard.writeText(String(this.currentEntry.port));
          vscode.window.showInformationMessage(`Port ${this.currentEntry.port} copied.`);
        }
        break;
    }
  }

  private getHtml(entry: PortEntry, freePorts: number[]): string {
    const uptime = this.activityTracker.getUptime(entry.port);
    const activities = this.activityTracker.getActivities(entry.port);
    const displayName = entry.frameworkLabel || entry.processName;
    const subtitle = [
      entry.processName,
      `pid ${entry.pid}`,
      entry.frameworkLabel ? `${entry.frameworkLabel} dev server` : null,
      `listening since ${uptime} ago`,
    ].filter(Boolean).join(' · ');

    const statusColor = entry.status === 'healthy' ? '#4ec9b0' :
                        entry.status === 'conflict' ? '#f44747' : '#cccccc';
    const statusText = entry.status === 'healthy' ? 'listening' :
                       entry.status === 'conflict' ? 'conflict' : 'unknown';
    const conflictText = entry.status === 'conflict' ? 'detected' : 'none';
    const conflictColor = entry.status === 'conflict' ? '#f44747' : '#4ec9b0';

    const freePortChips = freePorts.slice(0, 6).map(p =>
      `<span class="chip" onclick="switchPort(${p})">${p}</span>`
    ).join('');

    const activityHtml = activities.slice(-8).reverse().map(a => {
      const time = new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const cls = a.type === 'error' ? 'log-error' : a.type === 'warning' ? 'log-warn' : a.type === 'success' ? 'log-success' : 'log-info';
      return `<div class="log-entry ${cls}"><span class="log-time">[${time}]</span> ${escapeHtml(a.message)}</div>`;
    }).join('');

    return /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --bg: #1e1e1e;
    --surface: #252526;
    --surface2: #2d2d2d;
    --border: #3e3e42;
    --text: #cccccc;
    --text-muted: #858585;
    --accent: #007acc;
    --green: #4ec9b0;
    --red: #f44747;
    --orange: #ce9178;
    --yellow: #dcdcaa;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 32px 40px;
    line-height: 1.5;
  }

  /* ── Header ── */
  .port-header {
    margin-bottom: 8px;
  }
  .port-number {
    font-size: 48px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -1px;
  }
  .port-subtitle {
    font-size: 14px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* ── Actions ── */
  .actions {
    display: flex;
    gap: 16px;
    margin: 28px 0;
    flex-wrap: wrap;
  }
  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .action-btn:hover {
    background: var(--surface2);
    border-color: var(--accent);
  }
  .action-btn.danger { color: var(--red); }
  .action-btn.danger:hover { border-color: var(--red); background: rgba(244,71,71,0.08); }
  .action-btn.primary { color: var(--green); }
  .action-btn.primary:hover { border-color: var(--green); background: rgba(78,201,176,0.08); }
  .action-icon { font-size: 16px; }

  /* ── Stats Grid ── */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border-radius: 8px;
    overflow: hidden;
    margin: 24px 0;
  }
  .stat-cell {
    background: var(--surface);
    padding: 16px 20px;
  }
  .stat-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .stat-value {
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
  }
  .stat-value.green { color: var(--green); }
  .stat-value.red { color: var(--red); }

  /* ── Free Ports ── */
  .free-ports {
    margin: 24px 0;
  }
  .free-ports-title {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
  .chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .chip {
    padding: 4px 14px;
    border-radius: 4px;
    background: var(--accent);
    color: #ffffff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .chip:hover { opacity: 0.85; }

  /* ── Activity Log ── */
  .activity {
    margin-top: 32px;
  }
  .activity-title {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
  }
  .log-entry {
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    padding: 5px 0;
    color: var(--text-muted);
  }
  .log-time {
    color: var(--text-muted);
    font-weight: 600;
  }
  .log-error { color: var(--red); }
  .log-error .log-time { color: var(--red); }
  .log-warn { color: var(--orange); }
  .log-warn .log-time { color: var(--orange); }
  .log-success { color: var(--green); }
  .log-success .log-time { color: var(--green); }
  .log-info { color: var(--text-muted); }

  /* ── Divider ── */
  .divider {
    height: 1px;
    background: var(--border);
    margin: 24px 0;
  }
</style>
</head>
<body>
  <div class="port-header">
    <div class="port-number">:${entry.port}</div>
    <div class="port-subtitle">${escapeHtml(subtitle)}</div>
  </div>

  <div class="actions">
    <button class="action-btn danger" onclick="killProcess()">
      <span class="action-icon">✕</span> Kill process
    </button>
    ${freePorts.length > 0 ? `
    <button class="action-btn primary" onclick="switchPort(${freePorts[0]})">
      <span class="action-icon">+</span> Switch to ${freePorts[0]}
    </button>` : ''}
    <button class="action-btn" onclick="copyUrl()">
      <span class="action-icon">□</span> Copy URL
    </button>
  </div>

  <div class="stats-grid">
    <div class="stat-cell">
      <div class="stat-label">Protocol</div>
      <div class="stat-value">${entry.protocol} / HTTP</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Status</div>
      <div class="stat-value green" id="status-value">${statusText}</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Memory</div>
      <div class="stat-value" id="memory-value">${entry.memoryMB > 0 ? entry.memoryMB + ' MB' : '—'}</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Conflicts</div>
      <div class="stat-value ${entry.status === 'conflict' ? 'red' : 'green'}" id="conflict-value">${conflictText}</div>
    </div>
  </div>

  ${freePorts.length > 0 ? `
  <div class="free-ports">
    <div class="free-ports-title">Free nearby</div>
    <div class="chips">${freePortChips}</div>
  </div>` : ''}

  <div class="divider"></div>

  <div class="activity">
    <div class="activity-title">Recent Activity</div>
    <div id="activity-log">
      ${activityHtml || '<div class="log-entry log-info">No activity recorded yet.</div>'}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function killProcess() {
      vscode.postMessage({ command: 'kill' });
    }
    function switchPort(port) {
      vscode.postMessage({ command: 'switchPort', port });
    }
    function copyUrl() {
      vscode.postMessage({ command: 'copyUrl' });
    }

    // Handle dynamic updates from extension
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'update') {
        const mem = document.getElementById('memory-value');
        if (mem && msg.memoryMB > 0) mem.textContent = msg.memoryMB + ' MB';

        const status = document.getElementById('status-value');
        if (status) {
          status.textContent = msg.status === 'healthy' ? 'listening' : msg.status;
          status.className = 'stat-value ' + (msg.status === 'healthy' ? 'green' : 'red');
        }
      }
    });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    PortDetailPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
