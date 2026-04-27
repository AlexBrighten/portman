/**
 * ConflictDetector — Pre-launch conflict prediction.
 * SRS §3.2.3, FR-13
 *
 * Parses package.json scripts for port references and cross-references
 * against the live port list when tasks start.
 *
 * Per review feedback: subscribes to onDidStartTask (onWillExecuteTask doesn't
 * exist in VS Code API) but proactively scans package.json at activation
 * to maintain a conflict map. Shows warnings immediately when tasks begin.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { PortEntry, ConflictEvent } from '../types.js';
import { PORT_EXTRACTION_PATTERNS } from '../constants.js';

/** Extract port numbers from a package.json script value */
function extractPortsFromScript(scriptValue: string): number[] {
  const ports: number[] = [];

  for (const pattern of PORT_EXTRACTION_PATTERNS) {
    const matches = scriptValue.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      const port = parseInt(match[1], 10);
      if (port >= 1024 && port <= 65535 && !ports.includes(port)) {
        ports.push(port);
      }
    }
  }

  return ports;
}

export class ConflictDetector {
  private scriptPortMap: Map<string, number[]> = new Map();
  private disposables: vscode.Disposable[] = [];
  private portListGetter: (() => PortEntry[]) | null = null;

  /** Register a callback to get the current live port list */
  setPortListGetter(getter: () => PortEntry[]): void {
    this.portListGetter = getter;
  }

  /** Initialize by scanning workspace package.json files */
  async initialize(): Promise<void> {
    await this.scanWorkspaceScripts();

    // Re-scan when package.json files change
    const watcher = vscode.workspace.createFileSystemWatcher('**/package.json');
    watcher.onDidChange(() => this.scanWorkspaceScripts());
    watcher.onDidCreate(() => this.scanWorkspaceScripts());
    watcher.onDidDelete(() => this.scanWorkspaceScripts());
    this.disposables.push(watcher);

    // Subscribe to task execution events
    const config = vscode.workspace.getConfiguration('portman');
    if (config.get<boolean>('conflictPrediction', true)) {
      this.disposables.push(
        vscode.tasks.onDidStartTask((e) => this.onTaskStarted(e))
      );
    }
  }

  /** Scan all package.json files in the workspace for port references */
  private async scanWorkspaceScripts(): Promise<void> {
    this.scriptPortMap.clear();

    const packageJsonFiles = await vscode.workspace.findFiles(
      '**/package.json',
      '**/node_modules/**',
      20 // limit
    );

    for (const uri of packageJsonFiles) {
      try {
        const content = await vscode.workspace.fs.readFile(uri);
        const pkg = JSON.parse(Buffer.from(content).toString('utf-8'));

        if (pkg.scripts && typeof pkg.scripts === 'object') {
          for (const [scriptName, scriptValue] of Object.entries(pkg.scripts)) {
            if (typeof scriptValue !== 'string') { continue; }

            const ports = extractPortsFromScript(scriptValue);
            if (ports.length > 0) {
              const key = `${path.basename(path.dirname(uri.fsPath))}:${scriptName}`;
              this.scriptPortMap.set(key, ports);
            }
          }
        }
      } catch {
        // Invalid JSON or read error — skip
      }
    }
  }

  /** Handle task start events — check for conflicts */
  private onTaskStarted(e: vscode.TaskStartEvent): void {
    if (!this.portListGetter) { return; }

    const config = vscode.workspace.getConfiguration('portman');
    if (!config.get<boolean>('conflictPrediction', true)) { return; }

    const task = e.execution.task;
    const activePorts = this.portListGetter();

    // Check if this task's script matches any known port requirements
    let taskPorts: number[] = [];

    // Try to match task name to a known script
    for (const [scriptKey, ports] of this.scriptPortMap) {
      const scriptName = scriptKey.split(':').pop() || '';
      if (task.name.includes(scriptName) || scriptName.includes(task.name)) {
        taskPorts = ports;
        break;
      }
    }

    // Also extract ports from the task's command line if available
    if (task.definition && typeof task.definition === 'object') {
      const cmdStr = JSON.stringify(task.definition);
      const extracted = extractPortsFromScript(cmdStr);
      taskPorts = [...new Set([...taskPorts, ...extracted])];
    }

    // Check for conflicts
    for (const requiredPort of taskPorts) {
      const conflict = activePorts.find(p => p.port === requiredPort);
      if (conflict) {
        this.showConflictWarning({
          port: requiredPort,
          taskName: task.name,
          occupyingPid: conflict.pid,
          occupyingProcessName: conflict.processName,
          source: 'task',
        });
      }
    }
  }

  /** Show a conflict warning notification */
  private async showConflictWarning(event: ConflictEvent): Promise<void> {
    const processLabel = event.occupyingProcessName || `PID ${event.occupyingPid}`;

    const action = await vscode.window.showWarningMessage(
      `Port ${event.port} required by "${event.taskName}" is currently occupied by ${processLabel} (PID ${event.occupyingPid}). Kill it before the task fails?`,
      'Kill Now',
      'Ignore'
    );

    if (action === 'Kill Now') {
      // Fire the kill command — the extension will handle it
      vscode.commands.executeCommand('portman.killProcess', {
        pid: event.occupyingPid,
        port: event.port,
        processName: event.occupyingProcessName,
      });
    }
  }

  /** Get all known script→port mappings (for testing/debugging) */
  getScriptPortMap(): Map<string, number[]> {
    return new Map(this.scriptPortMap);
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
