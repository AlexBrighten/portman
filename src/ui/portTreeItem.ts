/**
 * PortTreeItem — Tree item definitions for the Portman sidebar.
 * Supports categorized display with kill protection for system/IDE ports.
 */

import * as vscode from 'vscode';
import { PortEntry, TreeItemType } from '../types.js';
import { MAX_CMD_DISPLAY_LENGTH } from '../constants.js';

/** Port entry tree item — the primary interactive node */
export class PortTreeItem extends vscode.TreeItem {
  public readonly portEntry: PortEntry;

  constructor(entry: PortEntry, isProfilePort: boolean = false, isProtected: boolean = false) {
    const displayName = entry.frameworkLabel || entry.processName;
    super(displayName, vscode.TreeItemCollapsibleState.Collapsed);

    this.portEntry = entry;

    // Build description: ":port" + optional badges
    let desc = `:${entry.port}`;
    if (entry.isDockerPort) { desc += '  [Docker]'; }
    if (entry.envVarName) { desc += `  [.env: ${entry.envVarName}]`; }
    this.description = desc;

    // Icon: Docker gets package icon, others get status dots
    if (isProtected) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('disabledForeground'));
    } else if (entry.isDockerPort) {
      this.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.purple'));
    } else if (isProfilePort) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
    } else {
      const iconColor = entry.status === 'healthy'
        ? new vscode.ThemeColor('testing.iconPassed')
        : entry.status === 'conflict'
        ? new vscode.ThemeColor('testing.iconFailed')
        : new vscode.ThemeColor('testing.iconQueued');
      this.iconPath = new vscode.ThemeIcon('circle-filled', iconColor);
    }

    // Tooltip
    const tooltipLines = [
      `Port: ${entry.port} (${entry.protocol})`,
      `Address: ${entry.address}`,
      `PID: ${entry.pid}`,
      `Process: ${entry.processName}`,
      `Command: ${entry.processCmd}`,
    ];
    if (entry.frameworkLabel) { tooltipLines.push(`Framework: ${entry.frameworkLabel}`); }
    if (entry.annotation) { tooltipLines.push(`Annotation: ${entry.annotation}`); }
    if (entry.memoryMB > 0) { tooltipLines.push(`Memory: ${entry.memoryMB} MB`); }
    if (isProtected) { tooltipLines.push('\n⚠️ System/IDE process — kill is restricted'); }
    this.tooltip = tooltipLines.join('\n');

    // Context value — system/IDE ports get a different context (no kill in menu)
    this.contextValue = isProtected ? 'protectedPort' : ('portEntry' as TreeItemType);

    // Click to open detail panel (only for dev ports)
    if (!isProtected) {
      this.command = {
        command: 'portman.showDetail',
        title: 'Show Port Details',
        arguments: [entry],
      };
    }
  }
}

/** Metadata child node */
export class PortMetadataItem extends vscode.TreeItem {
  constructor(label: string, value: string, icon?: string) {
    super(`${label}: ${value}`, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(icon || 'info');
    this.contextValue = 'portMetadata' as TreeItemType;
    this.description = '';
  }
}

/** Create metadata children for a port entry */
export function createMetadataItems(entry: PortEntry): PortMetadataItem[] {
  const items: PortMetadataItem[] = [];

  items.push(new PortMetadataItem('PID', String(entry.pid), 'symbol-number'));
  items.push(new PortMetadataItem('Address', `${entry.address}:${entry.port}`, 'globe'));
  items.push(new PortMetadataItem('Protocol', entry.protocol, 'symbol-interface'));

  const cmdDisplay = entry.processCmd.length > MAX_CMD_DISPLAY_LENGTH
    ? entry.processCmd.substring(0, MAX_CMD_DISPLAY_LENGTH) + '…'
    : entry.processCmd;
  const cmdItem = new PortMetadataItem('Command', cmdDisplay, 'terminal');
  cmdItem.tooltip = entry.processCmd;
  items.push(cmdItem);

  if (entry.frameworkLabel) {
    items.push(new PortMetadataItem('Framework', entry.frameworkLabel, 'symbol-class'));
  }
  if (entry.memoryMB > 0) {
    items.push(new PortMetadataItem('Memory', `${entry.memoryMB} MB`, 'dashboard'));
  }
  if (entry.isDockerPort && entry.dockerContainerName) {
    items.push(new PortMetadataItem('Container', entry.dockerContainerName, 'package'));
  }
  if (entry.envVarName) {
    items.push(new PortMetadataItem('Env Variable', entry.envVarName, 'file-code'));
  }
  if (entry.annotation) {
    items.push(new PortMetadataItem('Annotation', entry.annotation, 'tag'));
  }

  return items;
}

/** Section header item with a stable ID for getChildren matching */
export class SectionHeaderItem extends vscode.TreeItem {
  public readonly sectionId: string;

  constructor(label: string, count?: number, icon?: string) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.sectionId = label;
    this.contextValue = 'sectionHeader';
    if (count !== undefined && count > 0) {
      this.description = `${count}`;
    }
    if (icon) {
      this.iconPath = new vscode.ThemeIcon(icon);
    }
  }
}

/** Free port chip item */
export class FreePortItem extends vscode.TreeItem {
  public readonly port: number;

  constructor(port: number) {
    super(String(port), vscode.TreeItemCollapsibleState.None);
    this.port = port;
    this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.blue'));
    this.description = 'available';
    this.contextValue = 'freePort' as TreeItemType;
    this.tooltip = `Port ${port} is available. Click to copy.`;
    this.command = {
      command: 'portman.copyFreePort',
      title: 'Copy Port',
      arguments: [port],
    };
  }
}

/** Empty state item */
export class EmptyStateItem extends vscode.TreeItem {
  constructor() {
    super('No dev servers running', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('check');
    this.description = 'Start a project to see ports here';
    this.contextValue = 'emptyState' as TreeItemType;
  }
}

/** Error state item */
export class ErrorStateItem extends vscode.TreeItem {
  constructor(message: string) {
    super('Scan error', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('warning');
    this.description = message;
    this.contextValue = 'emptyState' as TreeItemType;
  }
}
