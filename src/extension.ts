/**
 * Portman — VS Code Extension Entry Point (Phase 2 + Webview Sidebar)
 *
 * Full feature set with card-style dev ports in the sidebar webview.
 */

import * as vscode from 'vscode';
import { PortEntry } from './types.js';
import { DEFAULT_REFRESH_INTERVAL, SYSTEM_PROCESS_NAMES, IDE_PROCESS_NAMES, SYSTEM_PID_THRESHOLD } from './constants.js';
import { scanPorts } from './data/portScanner.js';
import { mapProcesses } from './data/processMapper.js';
import { detectFrameworkFromProcess } from './logic/frameworkDetector.js';
import { KillOrchestrator } from './logic/killOrchestrator.js';
import { ConflictDetector } from './logic/conflictDetector.js';
import { ProfileManager } from './logic/profileManager.js';
import { TeamConfigManager } from './logic/teamConfigManager.js';
import { findFreePort } from './logic/portFinder.js';
import { GlobalStore } from './state/globalStore.js';
import { SessionHistory } from './state/sessionHistory.js';
import { ActivityTracker } from './state/activityTracker.js';
import { WorkspaceStore } from './state/workspaceStore.js';
import { MetricsCollector } from './state/metricsCollector.js';
import { PortWebviewProvider } from './ui/portWebviewProvider.js';
import { StatusBarController } from './ui/statusBarController.js';
import { NotificationService } from './ui/notificationService.js';
import { PortDetailPanel } from './ui/portDetailPanel.js';
import { CommandRegistry } from './commands/commandRegistry.js';
import { TerminalWatcher } from './data/terminalWatcher.js';
import { EnvScanner } from './data/envScanner.js';
import { DockerDetector } from './data/dockerDetector.js';
import { assignWorkspaceFolders } from './logic/workspaceGrouper.js';
import { classifyPort } from './logic/portClassifier.js';

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let isScanning = false;
let killOrchestratorInstance: KillOrchestrator | null = null;
let sidebarProviderInstance: PortWebviewProvider | null = null;

export function activate(context: vscode.ExtensionContext): void {
  console.log('[Portman] Extension activating...');

  // ── State management ───────────────────────────────────────────────────

  const globalStore = new GlobalStore(context);
  const sessionHistory = new SessionHistory();
  const activityTracker = new ActivityTracker();
  const workspaceStore = new WorkspaceStore();
  const metricsCollector = new MetricsCollector(context);
  context.subscriptions.push({ dispose: () => sessionHistory.dispose() });
  context.subscriptions.push({ dispose: () => metricsCollector.dispose() });

  // ── Business logic ─────────────────────────────────────────────────────

  const killOrchestrator = new KillOrchestrator(sessionHistory);
  killOrchestratorInstance = killOrchestrator;
  
  const profileManager = new ProfileManager(context);
  const conflictDetector = new ConflictDetector();
  const teamConfigManager = new TeamConfigManager(profileManager);
  const notifications = new NotificationService();

  // ── Data acquisition (Phase 2) ─────────────────────────────────────────

  const terminalWatcher = new TerminalWatcher(sessionHistory, activityTracker);
  const envScanner = new EnvScanner();
  const dockerDetector = new DockerDetector();

  // ── Presentation ───────────────────────────────────────────────────────

  const sidebarProvider = new PortWebviewProvider(activityTracker);
  sidebarProviderInstance = sidebarProvider;
  
  const statusBar = new StatusBarController();
  context.subscriptions.push(statusBar);

  // Register the webview view provider (replaces TreeView)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PortWebviewProvider.viewType,
      sidebarProvider,
    )
  );

  // ── Wire cross-component dependencies ──────────────────────────────────

  killOrchestrator.setRefreshCallback(() => refreshPorts());
  killOrchestrator.setMetricsCollector(metricsCollector);
  conflictDetector.setPortListGetter(() => sidebarProvider.getPortEntries());
  conflictDetector.setMetricsCollector(metricsCollector);
  terminalWatcher.setMetricsCollector(metricsCollector);

  // Terminal watcher callbacks
  terminalWatcher.setCallbacks(
    (pid, port, name) => killOrchestrator.kill(pid, port, name, 'notification'),
    (port) => findFreePort(port),
    () => sidebarProvider.getPortEntries(),
  );

  // ── Port classification ────────────────────────────────────────────────


  // ── Free port discovery ────────────────────────────────────────────────

  const commonPorts = [3000, 3001, 3002, 4000, 5000, 5173, 8000, 8080, 8888, 9000];

  async function discoverFreePorts(activePorts: number[]): Promise<number[]> {
    const activeSet = new Set(activePorts);
    const free: number[] = [];

    for (const port of commonPorts) {
      if (!activeSet.has(port) && free.length < 6) {
        free.push(port);
      }
    }

    if (activePorts.length > 0) {
      const lowest = Math.min(...activePorts);
      try {
        const nextFree = await findFreePort(lowest);
        if (nextFree && !free.includes(nextFree) && !activeSet.has(nextFree)) {
          free.unshift(nextFree);
          if (free.length > 6) { free.pop(); }
        }
      } catch { /* ignore */ }
    }

    return free.sort((a, b) => a - b);
  }

  // ── Core scan & refresh ────────────────────────────────────────────────

  async function refreshPorts(): Promise<void> {
    if (isScanning) { return; }
    isScanning = true;
    statusBar.showScanning();

    try {
      // Step 1: Scan ports
      const rawEntries = await scanPorts();

      // Step 2: Enrich with process info
      const pids = rawEntries.map(e => e.pid);
      const processMap = await mapProcesses(pids);

      // Step 3: Docker detection
      const dockerMappings = await dockerDetector.scan();

      // Step 4: Get env port references
      const envPorts = envScanner.getEnvPorts();

      // Step 5: Build enriched PortEntry objects
      const entries: PortEntry[] = rawEntries.map(raw => {
        const processInfo = processMap.get(raw.pid);
        const processName = processInfo?.name || 'Unknown Process';
        const processCmd = processInfo?.cmd || '';
        const memoryMB = processInfo?.memoryMB || 0;

        // Framework detection (command string matching — accurate, no guessing)
        const frameworkLabel = detectFrameworkFromProcess(processName, processCmd);

        const annotation = globalStore.getAnnotation(raw.port, processName);
        const firstSeenAt = activityTracker.getFirstSeen(raw.port) || new Date();

        // Classify: dev, ide, system, or service
        let category = classifyPort(raw.port, processName, raw.pid);
        if (frameworkLabel) { category = 'dev'; }

        // Docker enrichment
        const dockerMapping = dockerMappings.get(raw.port);
        const isDockerPort = !!dockerMapping;
        const dockerContainerName = dockerMapping?.containerName || null;
        if (isDockerPort) { category = 'dev'; }

        // .env enrichment
        const envRef = envPorts.get(raw.port);
        const envVarName = envRef?.variableName || null;
        const isEnvExpected = !!envRef;

        return {
          port: raw.port,
          protocol: raw.protocol,
          address: raw.address,
          pid: raw.pid,
          processName,
          processCmd,
          frameworkLabel,
          annotation,
          isDockerPort,
          dockerContainerName,
          envVarName,
          isEnvExpected,
          detectedAt: new Date(),
          firstSeenAt,
          memoryMB,
          status: 'healthy' as const,
          category,
          workspaceFolder: null, // Initialized in FR-10 step below
        };
      });

      // Step 6: Workspace grouping (FR-10)
      await assignWorkspaceFolders(entries);

      // Step 7: Reconcile activity tracker
      const processNames = new Map(entries.map(e => [e.port, e.processName]));
      activityTracker.reconcile(entries.map(e => e.port), processNames);

      // Step 7: Terminal watcher delta detection
      terminalWatcher.detectNewConflicts(entries);

      // Step 8: Update the sidebar webview
      sidebarProvider.setPortEntries(entries);

      // Step 9: Discover free ports
      const allPorts = entries.map(e => e.port);
      const freePorts = await discoverFreePorts(allPorts);
      sidebarProvider.setNearbyFreePorts(freePorts);

      // Step 10: Update status bar (dev count only)
      statusBar.hideScanning();
      const devCount = entries.filter(e => e.category === 'dev').length;
      const nextFree = freePorts.length > 0 ? freePorts[0] : null;
      statusBar.update(devCount, 0, nextFree);

      // Step 11: Update webview detail panel if open
      if (PortDetailPanel.currentPanel) {
        const currentPort = entries.find(e =>
          PortDetailPanel.currentPanel &&
          e.port === (PortDetailPanel.currentPanel as any).currentEntry?.port
        );
        if (currentPort) {
          PortDetailPanel.currentPanel.updateDynamic(currentPort);
        }
      }

    } catch (err) {
      const msg = (err as Error).message;
      console.error('[Portman] Scan error:', msg);
      statusBar.hideScanning();
      statusBar.update(0);
    } finally {
      isScanning = false;
    }
  }

  // ── Commands ───────────────────────────────────────────────────────────

  // Webview detail panel
  context.subscriptions.push(
    vscode.commands.registerCommand('portman.showDetail', (entry: PortEntry) => {
      if (!entry) { return; }
      const freePorts = sidebarProvider.getFreePorts();
      PortDetailPanel.show(
        entry,
        activityTracker,
        freePorts,
        (e) => killOrchestrator.kill(e.pid, e.port, e.processName, 'sidebar'),
        async (port) => {
          await vscode.env.clipboard.writeText(String(port));
          vscode.window.showInformationMessage(`Port ${port} copied to clipboard.`);
        }
      );
    })
  );

  // Copy free port
  context.subscriptions.push(
    vscode.commands.registerCommand('portman.copyFreePort', async (port: number) => {
      await vscode.env.clipboard.writeText(String(port));
      vscode.window.showInformationMessage(`Port ${port} copied to clipboard.`);
    })
  );

  // Team config commands
  context.subscriptions.push(
    vscode.commands.registerCommand('portman.exportToDevcontainer', () => {
      teamConfigManager.exportProfiles();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('portman.importFromDevcontainer', () => {
      teamConfigManager.autoImport();
    })
  );

  // Metrics command
  context.subscriptions.push(
    vscode.commands.registerCommand('portman.showMetrics', () => {
      metricsCollector.showMetrics();
    })
  );

  // ── Command registry (remaining commands) ──────────────────────────────

  const commandRegistry = new CommandRegistry(
    killOrchestrator,
    profileManager,
    globalStore,
    sessionHistory,
    sidebarProvider,
    notifications,
    refreshPorts,
  );
  commandRegistry.registerAll();
  context.subscriptions.push(commandRegistry);

  // ── Polling setup ──────────────────────────────────────────────────────

  function startPolling(): void {
    stopPolling();
    const config = vscode.workspace.getConfiguration('portman');
    const interval = config.get<number>('refreshInterval', DEFAULT_REFRESH_INTERVAL);
    pollingTimer = setInterval(() => { refreshPorts(); }, interval);
  }

  function stopPolling(): void {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  // Window focus handling (FR-06)
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        startPolling();
        refreshPorts();
      } else {
        stopPolling();
      }
    })
  );

  // Configuration change handling
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('portman.refreshInterval')) {
        startPolling();
      }
      if (e.affectsConfiguration('portman.frameworkMappings')) {
        refreshPorts();
      }
    })
  );

  // Multi-root workspace folder removal auto-cleanup (FR-11)
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async (e) => {
      const config = vscode.workspace.getConfiguration('portman');
      if (!config.get<boolean>('autoCleanup', true)) {
        return;
      }

      if (e.removed.length > 0 && sidebarProviderInstance && killOrchestratorInstance) {
        const removedNames = new Set(e.removed.map(f => f.name));
        const activePorts = sidebarProviderInstance.getPortEntries();
        const orphanedDevPorts = activePorts.filter(
          p => p.category === 'dev' && p.workspaceFolder && removedNames.has(p.workspaceFolder)
        );

        if (orphanedDevPorts.length > 0) {
          const count = orphanedDevPorts.length;
          const processList = orphanedDevPorts.map(p => `  • Port ${p.port}: ${p.processName}`).join('\n');
          const confirm = await vscode.window.showInformationMessage(
            `Portman: ${count} dev process(es) still running for closed workspace folder(s). Release them?\n\n${processList}`,
            { modal: true },
            'Kill All'
          );

          if (confirm === 'Kill All') {
            await killOrchestratorInstance.killBulk(orphanedDevPorts);
            refreshPorts();
          }
        }
      }
    })
  );

  // ── Initialize Phase 2 components ──────────────────────────────────────

  conflictDetector.initialize().catch(err => {
    console.error('[Portman] Conflict detector init failed:', (err as Error).message);
  });
  context.subscriptions.push({ dispose: () => conflictDetector.dispose() });

  terminalWatcher.initialize();
  context.subscriptions.push({ dispose: () => terminalWatcher.dispose() });

  envScanner.initialize().catch(err => {
    console.error('[Portman] Env scanner init failed:', (err as Error).message);
  });
  context.subscriptions.push({ dispose: () => envScanner.dispose() });

  teamConfigManager.autoImport().catch(err => {
    console.error('[Portman] Team config import failed:', (err as Error).message);
  });

  context.subscriptions.push({ dispose: () => { stopPolling(); } });

  // Initial scan + start polling
  refreshPorts();
  startPolling();

  console.log('[Portman] Extension activated successfully (Phase 2 + Cards).');
}

export function deactivate(): Thenable<void> | undefined {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  
  // Synchronous auto-cleanup on extension deactivate (FR-11 full close)
  const config = vscode.workspace.getConfiguration('portman');
  if (config.get<boolean>('autoCleanup', true)) {
    if (killOrchestratorInstance && sidebarProviderInstance) {
      const activePorts = sidebarProviderInstance.getPortEntries();
      const devPorts = activePorts.filter(p => p.category === 'dev');
      if (devPorts.length > 0) {
        killOrchestratorInstance.killBulkSync(devPorts);
      }
    }
  }

  console.log('[Portman] Extension deactivated.');
  return undefined;
}
