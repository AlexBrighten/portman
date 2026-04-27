/**
 * PortWebviewProvider — Sidebar webview with card-style dev ports.
 *
 * Replaces the TreeView with a fully styled webview:
 * - Dev ports as rich cards (top, prominent)
 * - IDE/Tools and System ports as compact lists (bottom, collapsed)
 * - Free nearby as chips
 * - Full interactivity via postMessage
 */

import * as vscode from 'vscode';
import { PortEntry, PortActivity } from '../types.js';
import { ActivityTracker } from '../state/activityTracker.js';

export class PortWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'portman-ports';

  private webviewView: vscode.WebviewView | undefined;
  private portEntries: PortEntry[] = [];
  private freePorts: number[] = [];
  private filterText: string = '';
  private activityTracker: ActivityTracker;

  constructor(activityTracker: ActivityTracker) {
    this.activityTracker = activityTracker;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'showDetail':
          vscode.commands.executeCommand('portman.showDetail', this.portEntries.find(e => e.port === message.port));
          break;
        case 'killProcess':
          const entry = this.portEntries.find(e => e.port === message.port);
          if (entry) {
            vscode.commands.executeCommand('portman.killProcess', entry);
          }
          break;
        case 'copyFreePort':
          vscode.commands.executeCommand('portman.copyFreePort', message.port);
          break;
        case 'refresh':
          vscode.commands.executeCommand('portman.refreshPorts');
          break;
        case 'filter':
          this.filterText = message.text || '';
          this.render();
          break;
      }
    });

    this.render();
  }

  /** Update port entries and re-render */
  setPortEntries(entries: PortEntry[]): void {
    this.portEntries = entries;
    this.render();
  }

  /** Update free ports */
  setNearbyFreePorts(ports: number[]): void {
    this.freePorts = ports;
    this.render();
  }

  /** Get port entries */
  getPortEntries(): PortEntry[] {
    return this.portEntries;
  }

  /** Get free ports */
  getFreePorts(): number[] {
    return this.freePorts;
  }

  /** Get dev port count */
  getDevPortCount(): number {
    return this.portEntries.filter(e => e.category === 'dev').length;
  }

  /** Get match count text */
  getMatchCountText(): string {
    const devCount = this.portEntries.filter(e => e.category === 'dev').length;
    return devCount > 0 ? `${devCount} dev port${devCount !== 1 ? 's' : ''}` : 'no dev ports';
  }

  private getFilteredEntries(): PortEntry[] {
    if (!this.filterText) { return this.portEntries; }
    const ft = this.filterText.toLowerCase();
    return this.portEntries.filter(e => {
      return [
        String(e.port), String(e.pid), e.processName, e.processCmd,
        e.frameworkLabel || '', e.annotation || '', e.dockerContainerName || '', e.envVarName || '',
      ].some(f => f.toLowerCase().includes(ft));
    });
  }

  private render(): void {
    if (!this.webviewView) { return; }

    const filtered = this.getFilteredEntries();
    const devPorts = filtered.filter(e => e.category === 'dev');
    const idePorts = filtered.filter(e => e.category === 'ide');
    const systemPorts = filtered.filter(e => e.category === 'system');

    this.webviewView.webview.html = this.getHtml(devPorts, idePorts, systemPorts);
  }

  private getHtml(devPorts: PortEntry[], idePorts: PortEntry[], systemPorts: PortEntry[]): string {
    const devCardsHtml = devPorts.length > 0
      ? devPorts.map(e => this.renderDevCard(e)).join('')
      : `<div class="empty-state">
           <span class="empty-icon">⊙</span>
           <div class="empty-title">No dev servers running</div>
           <div class="empty-sub">Start a project to see ports here</div>
         </div>`;

    const ideListHtml = idePorts.length > 0
      ? idePorts.map(e => this.renderCompactItem(e)).join('')
      : '';

    const systemListHtml = systemPorts.length > 0
      ? systemPorts.map(e => this.renderCompactItem(e)).join('')
      : '';

    const freeChipsHtml = this.freePorts.map(p =>
      `<span class="chip" onclick="copyFreePort(${p})">${p}</span>`
    ).join('');

    return /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --bg: var(--vscode-sideBar-background);
    --fg: var(--vscode-sideBar-foreground);
    --card-bg: var(--vscode-editor-background);
    --card-border: var(--vscode-widget-border, #3e3e42);
    --card-hover: var(--vscode-list-hoverBackground);
    --accent: var(--vscode-focusBorder, #007acc);
    --green: #4ec9b0;
    --red: #f44747;
    --orange: #ce9178;
    --muted: var(--vscode-descriptionForeground);
    --badge-bg: var(--vscode-badge-background);
    --badge-fg: var(--vscode-badge-foreground);
    --input-bg: var(--vscode-input-background);
    --input-border: var(--vscode-input-border);
    --input-fg: var(--vscode-input-foreground);
    --section-border: var(--vscode-sideBarSectionHeader-border, #3e3e42);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    padding: 0;
    overflow-x: hidden;
  }

  /* ── Search ── */
  .search-bar {
    padding: 8px 12px;
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg);
    border-bottom: 1px solid var(--section-border);
  }
  .search-input {
    width: 100%;
    padding: 5px 8px;
    border-radius: 4px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--input-fg);
    font-size: 12px;
    outline: none;
  }
  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--muted); }

  /* ── Section headers ── */
  .section {
    padding: 0 8px;
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 4px 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    cursor: pointer;
    user-select: none;
  }
  .section-header:hover { color: var(--fg); }
  .section-count {
    font-size: 11px;
    background: var(--badge-bg);
    color: var(--badge-fg);
    border-radius: 10px;
    padding: 1px 7px;
    font-weight: 600;
  }
  .section-toggle {
    font-size: 10px;
    margin-right: 4px;
    transition: transform 0.15s;
  }
  .section-toggle.collapsed { transform: rotate(-90deg); }
  .section-body.collapsed { display: none; }

  /* ── Dev port cards ── */
  .dev-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    padding: 12px 14px;
    margin: 6px 0;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    position: relative;
  }
  .dev-card:hover {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .card-top {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-dot.green { background: var(--green); box-shadow: 0 0 6px rgba(78,201,176,0.4); }
  .status-dot.red { background: var(--red); box-shadow: 0 0 6px rgba(244,71,71,0.4); }
  .status-dot.grey { background: var(--muted); }
  .status-dot.purple { background: #b267e6; box-shadow: 0 0 6px rgba(178,103,230,0.4); }

  .card-port {
    font-size: 16px;
    font-weight: 700;
    color: var(--fg);
    letter-spacing: -0.5px;
  }
  .card-framework {
    font-size: 12px;
    font-weight: 500;
    color: var(--accent);
    margin-left: auto;
  }
  .card-process {
    font-size: 12px;
    color: var(--muted);
    margin-top: 4px;
    padding-left: 20px;
  }
  .card-badges {
    display: flex;
    gap: 4px;
    margin-top: 6px;
    padding-left: 20px;
    flex-wrap: wrap;
  }
  .card-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .card-badge.docker { background: #563d7c; color: #d4bbff; }
  .card-badge.env { background: #2d4a22; color: #8fca7f; }
  .card-badge.mem { background: transparent; color: var(--muted); border: 1px solid var(--card-border); }
  .card-badge.pid { background: transparent; color: var(--muted); border: 1px solid var(--card-border); }

  .card-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    padding-left: 20px;
  }
  .card-action {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.12s;
  }
  .card-action:hover { color: var(--fg); border-color: var(--accent); }
  .card-action.kill { color: var(--red); }
  .card-action.kill:hover { border-color: var(--red); background: rgba(244,71,71,0.08); }

  /* ── Compact list items (IDE/System) ── */
  .compact-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 4px;
    color: var(--muted);
  }
  .compact-item:hover { background: var(--card-hover); }
  .compact-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--muted);
    opacity: 0.5;
    flex-shrink: 0;
  }
  .compact-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .compact-port { font-size: 11px; opacity: 0.6; }

  /* ── Free ports chips ── */
  .chips-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 4px 0 8px;
  }
  .chip {
    padding: 3px 10px;
    border-radius: 4px;
    background: var(--accent);
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.12s;
  }
  .chip:hover { opacity: 0.8; }

  /* ── Empty state ── */
  .empty-state {
    text-align: center;
    padding: 32px 16px;
    color: var(--muted);
  }
  .empty-icon { font-size: 28px; display: block; margin-bottom: 8px; opacity: 0.4; }
  .empty-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .empty-sub { font-size: 12px; opacity: 0.7; }

  /* ── Divider ── */
  .divider {
    height: 1px;
    background: var(--section-border);
    margin: 8px 8px;
  }
</style>
</head>
<body>
  <div class="search-bar">
    <input class="search-input" type="text" placeholder="Filter ports..." oninput="filterPorts(this.value)" />
  </div>

  <!-- Dev Ports (cards) -->
  <div class="section">
    <div class="section-header" onclick="toggleSection('dev')">
      <div><span class="section-toggle" id="toggle-dev">▾</span> Dev Ports</div>
      ${devPorts.length > 0 ? `<span class="section-count">${devPorts.length}</span>` : ''}
    </div>
    <div class="section-body" id="section-dev">
      ${devCardsHtml}
    </div>
  </div>

  <!-- Free Nearby -->
  ${this.freePorts.length > 0 ? `
  <div class="section">
    <div class="section-header" onclick="toggleSection('free')">
      <div><span class="section-toggle section-toggle" id="toggle-free">▾</span> Free Nearby</div>
    </div>
    <div class="section-body" id="section-free">
      <div class="chips-row">${freeChipsHtml}</div>
    </div>
  </div>` : ''}

  ${(idePorts.length > 0 || systemPorts.length > 0) ? '<div class="divider"></div>' : ''}

  <!-- IDE / Tools (compact, collapsed) -->
  ${idePorts.length > 0 ? `
  <div class="section">
    <div class="section-header" onclick="toggleSection('ide')">
      <div><span class="section-toggle collapsed" id="toggle-ide">▾</span> IDE / Tools</div>
      <span class="section-count">${idePorts.length}</span>
    </div>
    <div class="section-body collapsed" id="section-ide">
      ${ideListHtml}
    </div>
  </div>` : ''}

  <!-- System (compact, collapsed) -->
  ${systemPorts.length > 0 ? `
  <div class="section">
    <div class="section-header" onclick="toggleSection('system')">
      <div><span class="section-toggle collapsed" id="toggle-system">▾</span> System</div>
      <span class="section-count">${systemPorts.length}</span>
    </div>
    <div class="section-body collapsed" id="section-system">
      ${systemListHtml}
    </div>
  </div>` : ''}

  <script>
    const vscode = acquireVsCodeApi();

    function showDetail(port) {
      vscode.postMessage({ command: 'showDetail', port });
    }
    function killProcess(port, e) {
      e.stopPropagation();
      vscode.postMessage({ command: 'killProcess', port });
    }
    function copyFreePort(port) {
      vscode.postMessage({ command: 'copyFreePort', port });
    }
    function filterPorts(text) {
      vscode.postMessage({ command: 'filter', text });
    }
    function toggleSection(id) {
      const body = document.getElementById('section-' + id);
      const toggle = document.getElementById('toggle-' + id);
      if (body && toggle) {
        body.classList.toggle('collapsed');
        toggle.classList.toggle('collapsed');
      }
    }
  </script>
</body>
</html>`;
  }

  private renderDevCard(entry: PortEntry): string {
    const framework = entry.frameworkLabel || '';
    const processLine = entry.annotation || `${entry.processName} · pid ${entry.pid}`;
    const uptime = this.activityTracker.getUptime(entry.port);

    const dotClass = entry.isDockerPort ? 'purple'
      : entry.status === 'healthy' ? 'green'
      : entry.status === 'conflict' ? 'red' : 'grey';

    // Badges
    const badges: string[] = [];
    if (entry.isDockerPort && entry.dockerContainerName) {
      badges.push(`<span class="card-badge docker">🐳 ${esc(entry.dockerContainerName)}</span>`);
    }
    if (entry.envVarName) {
      badges.push(`<span class="card-badge env">.env: ${esc(entry.envVarName)}</span>`);
    }
    if (entry.memoryMB > 0) {
      badges.push(`<span class="card-badge mem">${entry.memoryMB} MB</span>`);
    }
    badges.push(`<span class="card-badge pid">PID ${entry.pid}</span>`);

    return /*html*/`
    <div class="dev-card" onclick="showDetail(${entry.port})">
      <div class="card-top">
        <div class="status-dot ${dotClass}"></div>
        <span class="card-port">:${entry.port}</span>
        ${framework ? `<span class="card-framework">${esc(framework)}</span>` : ''}
      </div>
      <div class="card-process">${esc(processLine)} · ${uptime}</div>
      ${badges.length > 0 ? `<div class="card-badges">${badges.join('')}</div>` : ''}
      <div class="card-actions">
        <button class="card-action kill" onclick="killProcess(${entry.port}, event)">✕ Kill</button>
        <button class="card-action" onclick="event.stopPropagation(); copyFreePort(${entry.port})">⎘ Copy</button>
      </div>
    </div>`;
  }

  private renderCompactItem(entry: PortEntry): string {
    const name = entry.frameworkLabel || entry.processName;
    return /*html*/`
    <div class="compact-item">
      <div class="compact-dot"></div>
      <span class="compact-name">${esc(name)}</span>
      <span class="compact-port">:${entry.port}</span>
    </div>`;
  }
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
