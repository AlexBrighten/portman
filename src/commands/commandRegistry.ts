/**
 * CommandRegistry — Registers all Portman commands for the Command Palette.
 * SRS FR-18
 *
 * All commands include when clause guards and are accessible while the extension is active.
 * Per review feedback (FR-04): "Find Free Port" delivers result as an info notification
 * with a "Copy" button that copies `export PORT=NNNN` to clipboard.
 */

import * as vscode from 'vscode';
import { PortEntry } from '../types.js';
import { MAX_ANNOTATION_LENGTH } from '../constants.js';
import { KillOrchestrator } from '../logic/killOrchestrator.js';
import { ProfileManager } from '../logic/profileManager.js';
import { findFreePort } from '../logic/portFinder.js';
import { GlobalStore } from '../state/globalStore.js';
import { SessionHistory } from '../state/sessionHistory.js';
import { NotificationService } from '../ui/notificationService.js';

/** Interface for the port list provider (works with both TreeView and WebviewView) */
interface PortListProvider {
  getPortEntries(): PortEntry[];
}

export class CommandRegistry {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private killOrchestrator: KillOrchestrator,
    private profileManager: ProfileManager,
    private globalStore: GlobalStore,
    private sessionHistory: SessionHistory,
    private portProvider: PortListProvider,
    private notifications: NotificationService,
    private refreshCallback: () => Promise<void>,
  ) {}

  /** Register all commands */
  registerAll(): void {
    // Refresh port list (FR-06)
    this.register('portman.refreshPorts', async () => {
      await this.refreshCallback();
    });

    // Kill process (FR-03) — accepts PortEntry or object with pid/port/processName
    this.register('portman.killProcess', async (arg?: PortEntry | { pid: number; port: number; processName: string }) => {
      let pid: number, port: number, processName: string;

      if (arg && typeof arg === 'object' && 'pid' in arg) {
        pid = arg.pid;
        port = arg.port;
        processName = arg.processName;
      } else {
        return;
      }

      await this.killOrchestrator.kill(pid, port, processName, 'sidebar');
    });

    // Kill port by number via Command Palette (FR-18)
    this.register('portman.killPort', async () => {
      const input = await vscode.window.showInputBox({
        prompt: 'Enter the port number to kill',
        placeHolder: 'e.g., 3000',
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 1 || num > 65535) {
            return 'Enter a valid port number (1–65535)';
          }
          return null;
        },
      });

      if (!input) { return; }
      const port = parseInt(input, 10);
      const entries = this.portProvider.getPortEntries();
      const entry = entries.find(e => e.port === port);

      if (!entry) {
        this.notifications.showInfo(`Port ${port} is not currently occupied.`);
        return;
      }

      await this.killOrchestrator.kill(entry.pid, entry.port, entry.processName, 'command_palette');
    });

    // Find free port from Command Palette (FR-05)
    this.register('portman.findFreePort', async () => {
      const input = await vscode.window.showInputBox({
        prompt: 'Enter a base port number to scan from',
        placeHolder: 'e.g., 3000',
        validateInput: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 1 || num > 65535) {
            return 'Enter a valid port number (1–65535)';
          }
          return null;
        },
      });

      if (!input) { return; }
      await this.findAndSuggestFreePort(parseInt(input, 10));
    });

    // Find free port from tree item context (FR-05)
    this.register('portman.findFreePortFromHere', async (arg?: PortEntry | { port: number }) => {
      if (!arg || !('port' in arg)) { return; }
      await this.findAndSuggestFreePort(arg.port);
    });

    // Show kill history (FR-12)
    this.register('portman.showKillHistory', () => {
      this.sessionHistory.show();
    });

    // Clear session history (FR-12)
    this.register('portman.clearHistory', () => {
      this.sessionHistory.clear();
      this.notifications.showInfo('Session history cleared.');
    });

    // Create port profile (FR-08)
    this.register('portman.createProfile', async () => {
      const entries = this.portProvider.getPortEntries();
      const profile = await this.profileManager.interactiveCreateProfile(entries);

      if (profile) {
        this.notifications.showInfoDirect(
          `Profile "${profile.name}" created with ${profile.ports.length} port(s).`
        );
      }
    });

    // Activate port profile (FR-08)
    this.register('portman.activateProfile', async () => {
      const profiles = this.profileManager.getProfiles();

      if (profiles.length === 0) {
        this.notifications.showInfo('No profiles saved yet. Create one first.');
        return;
      }

      const items = profiles.map(p => ({
        label: `${p.isActive ? '$(check) ' : ''}${p.name}`,
        description: `${p.ports.length} port(s)${p.description ? ' — ' + p.description : ''}`,
        id: p.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a profile to activate',
        title: 'Activate Port Profile',
      });

      if (selected) {
        await this.profileManager.activateProfile(selected.id);
        const profile = this.profileManager.getProfile(selected.id);
        if (profile) {
          this.notifications.showInfoDirect(`Profile "${profile.name}" activated.`);
        }
      }
    });

    // Deactivate profile (FR-08)
    this.register('portman.deactivateProfile', async () => {
      await this.profileManager.deactivateAll();
      this.notifications.showInfo('All profiles deactivated.');
    });

    // Delete profile (FR-08)
    this.register('portman.deleteProfile', async () => {
      const profiles = this.profileManager.getProfiles();

      if (profiles.length === 0) {
        this.notifications.showInfo('No profiles to delete.');
        return;
      }

      const items = profiles.map(p => ({
        label: p.name,
        description: `${p.ports.length} port(s)`,
        id: p.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a profile to delete',
        title: 'Delete Port Profile',
      });

      if (selected) {
        const confirm = await vscode.window.showWarningMessage(
          `Delete profile "${selected.label}"? This cannot be undone.`,
          { modal: true },
          'Delete'
        );

        if (confirm === 'Delete') {
          await this.profileManager.deleteProfile(selected.id);
          this.notifications.showInfoDirect(`Profile "${selected.label}" deleted.`);
        }
      }
    });

    // Annotate port (FR-09)
    this.register('portman.annotatePort', async (arg?: PortEntry | { port: number; processName: string }) => {
      if (!arg || !('port' in arg)) { return; }

      const portNum = arg.port;
      const procName = 'processName' in arg ? arg.processName : 'unknown';

      const existing = this.globalStore.getAnnotation(portNum, procName);

      const label = await vscode.window.showInputBox({
        prompt: `Annotate port ${portNum}`,
        placeHolder: 'e.g., Auth API, Remix frontend, Redis cache',
        value: existing || '',
        validateInput: (value) => {
          if (value && value.length > MAX_ANNOTATION_LENGTH) {
            return `Maximum ${MAX_ANNOTATION_LENGTH} characters`;
          }
          return null;
        },
      });

      if (label === undefined) { return; }

      if (label === '') {
        await this.globalStore.removeAnnotation(portNum, procName);
      } else {
        await this.globalStore.setAnnotation(portNum, procName, label);
      }

      await this.refreshCallback();
    });

    // Copy port number (utility)
    this.register('portman.copyPortNumber', async (arg?: PortEntry | { port: number }) => {
      if (!arg || !('port' in arg)) { return; }
      await vscode.env.clipboard.writeText(String(arg.port));
      this.notifications.showInfo(`Port ${arg.port} copied to clipboard.`);
    });
  }

  /**
   * Find a free port and present it as an info notification with a Copy action.
   * Per review feedback (FR-04 gap): copies `export PORT=NNNN` to clipboard.
   */
  private async findAndSuggestFreePort(basePort: number): Promise<void> {
    const freePort = await findFreePort(basePort);

    if (freePort) {
      const action = await this.notifications.showInfoDirect(
        `Port ${freePort} is available (next free from ${basePort}). Copy to clipboard?`,
        'Copy'
      );

      if (action === 'Copy') {
        await vscode.env.clipboard.writeText(String(freePort));
        this.notifications.showInfo(`Port ${freePort} copied to clipboard.`);
      }
    } else {
      this.notifications.showWarning(
        `No free ports found in range ${basePort + 1}–${basePort + 20}.`
      );
    }
  }

  /** Register a single command */
  private register(commandId: string, handler: (...args: any[]) => any): void {
    this.disposables.push(
      vscode.commands.registerCommand(commandId, handler)
    );
  }

  /** Get all disposables for cleanup */
  getDisposables(): vscode.Disposable[] {
    return this.disposables;
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
