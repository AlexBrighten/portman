/**
 * PortTreeProvider — TreeDataProvider with categorized port groups.
 *
 * Groups:
 * - "Dev Ports" (expanded) — user's project servers, databases, etc.
 * - "IDE / Tools" (collapsed) — VS Code, language servers, etc.
 * - "System" (collapsed) — OS services, kill-protected
 * - "Free nearby" (collapsed) — available ports
 */

import * as vscode from 'vscode';
import { PortEntry } from '../types.js';
import {
  PortTreeItem,
  PortMetadataItem,
  EmptyStateItem,
  ErrorStateItem,
  SectionHeaderItem,
  FreePortItem,
  createMetadataItems,
} from './portTreeItem.js';

type TreeNode = PortTreeItem | PortMetadataItem | EmptyStateItem | ErrorStateItem | SectionHeaderItem | FreePortItem;

export class PortTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private portEntries: PortEntry[] = [];
  private filterText: string = '';
  private scanError: string | null = null;
  private activeProfilePorts: Set<number> = new Set();
  private nearbyFreePorts: number[] = [];

  // Section nodes (stable references for getChildren)
  private devSection = new SectionHeaderItem('Dev Ports', 0, 'pulse');
  private ideSection = new SectionHeaderItem('IDE / Tools', 0, 'tools');
  private systemSection = new SectionHeaderItem('System', 0, 'shield');
  private freeSection = new SectionHeaderItem('Free nearby', 0, 'sparkle');

  setPortEntries(entries: PortEntry[]): void {
    this.portEntries = entries;
    this.scanError = null;
    this._onDidChangeTreeData.fire();
  }

  setScanError(error: string): void {
    this.scanError = error;
    this._onDidChangeTreeData.fire();
  }

  setFilter(text: string): void {
    this.filterText = text.toLowerCase();
    this._onDidChangeTreeData.fire();
  }

  clearFilter(): void {
    this.filterText = '';
    this._onDidChangeTreeData.fire();
  }

  setActiveProfilePorts(ports: number[]): void {
    this.activeProfilePorts = new Set(ports);
    this._onDidChangeTreeData.fire();
  }

  setNearbyFreePorts(ports: number[]): void {
    this.nearbyFreePorts = ports;
    this._onDidChangeTreeData.fire();
  }

  getPortEntries(): PortEntry[] {
    return this.portEntries;
  }

  getFreePorts(): number[] {
    return this.nearbyFreePorts;
  }

  /** Get only dev ports count (for status bar) */
  getDevPortCount(): number {
    return this.portEntries.filter(e => e.category === 'dev').length;
  }

  private getFilteredEntries(): PortEntry[] {
    if (!this.filterText) { return this.portEntries; }

    return this.portEntries.filter(entry => {
      const searchFields = [
        String(entry.port), String(entry.pid),
        entry.processName, entry.processCmd,
        entry.frameworkLabel || '', entry.annotation || '',
        entry.dockerContainerName || '', entry.envVarName || '',
      ];
      return searchFields.some(f => f.toLowerCase().includes(this.filterText));
    });
  }

  private getByCategory(entries: PortEntry[], category: string): PortEntry[] {
    return entries.filter(e => e.category === category);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      // Root level — build category sections
      if (this.scanError) {
        return [new ErrorStateItem(this.scanError)];
      }

      const filtered = this.getFilteredEntries();

      if (filtered.length === 0 && !this.filterText) {
        return [new EmptyStateItem()];
      }
      if (filtered.length === 0 && this.filterText) {
        return [new ErrorStateItem(`No ports match "${this.filterText}"`)];
      }

      const devPorts = this.getByCategory(filtered, 'dev');
      const idePorts = this.getByCategory(filtered, 'ide');
      const systemPorts = this.getByCategory(filtered, 'system');

      const nodes: TreeNode[] = [];

      // Dev Ports section (always expanded)
      this.devSection = new SectionHeaderItem(
        devPorts.length > 0 ? 'Dev Ports' : 'Dev Ports',
        devPorts.length,
        'pulse'
      );
      this.devSection.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      nodes.push(this.devSection);

      // IDE section (collapsed)
      if (idePorts.length > 0) {
        this.ideSection = new SectionHeaderItem('IDE / Tools', idePorts.length, 'tools');
        this.ideSection.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        nodes.push(this.ideSection);
      }

      // System section (collapsed)
      if (systemPorts.length > 0) {
        this.systemSection = new SectionHeaderItem('System', systemPorts.length, 'shield');
        this.systemSection.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        nodes.push(this.systemSection);
      }

      // Free nearby section
      if (this.nearbyFreePorts.length > 0) {
        this.freeSection = new SectionHeaderItem('Free nearby', undefined, 'sparkle');
        this.freeSection.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        nodes.push(this.freeSection);
      }

      return nodes;
    }

    // Children of section headers
    if (element instanceof SectionHeaderItem) {
      const filtered = this.getFilteredEntries();
      const label = element.sectionId;

      if (label === 'Dev Ports') {
        const devPorts = this.getByCategory(filtered, 'dev');
        if (devPorts.length === 0) {
          const empty = new EmptyStateItem();
          empty.label = 'No dev servers running';
          empty.description = 'Start a project to see ports here';
          return [empty];
        }
        return devPorts.map(e => new PortTreeItem(e, this.activeProfilePorts.has(e.port)));
      }

      if (label === 'IDE / Tools') {
        return this.getByCategory(filtered, 'ide').map(e => new PortTreeItem(e, false, true));
      }

      if (label === 'System') {
        return this.getByCategory(filtered, 'system').map(e => new PortTreeItem(e, false, true));
      }

      if (label === 'Free nearby') {
        return this.nearbyFreePorts.map(p => new FreePortItem(p));
      }
    }

    // Children of port entry → metadata items
    if (element instanceof PortTreeItem) {
      return createMetadataItems(element.portEntry);
    }

    return [];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getMatchCountText(): string {
    const devCount = this.portEntries.filter(e => e.category === 'dev').length;
    if (!this.filterText) {
      return devCount > 0 ? `${devCount} dev port${devCount !== 1 ? 's' : ''}` : 'no dev ports';
    }
    const filtered = this.getFilteredEntries();
    return `${filtered.length} of ${this.portEntries.length} ports`;
  }
}
