/**
 * WorkspaceStore — Maps ports to workspace folders in multi-root setups.
 * SRS FR-10
 *
 * Matches process command paths against workspace folder URIs to determine
 * which workspace a port belongs to. Falls back to "Unknown Workspace"
 * for processes that don't match any workspace path.
 */

import * as vscode from 'vscode';
import { PortEntry } from '../types.js';

export class WorkspaceStore {
  /**
   * Check if the current VS Code window has multiple workspace folders.
   */
  isMultiRoot(): boolean {
    const folders = vscode.workspace.workspaceFolders;
    return !!folders && folders.length > 1;
  }

  /**
   * Get all workspace folder names and paths.
   */
  getWorkspaceFolders(): Array<{ name: string; path: string }> {
    const folders = vscode.workspace.workspaceFolders || [];
    return folders.map(f => ({
      name: f.name,
      path: f.uri.fsPath,
    }));
  }

  /**
   * Determine which workspace folder a port entry belongs to,
   * based on its process command path.
   *
   * @returns The workspace folder name, or null if not matched.
   */
  matchWorkspaceFolder(entry: PortEntry): string | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length <= 1) {
      return null; // Not multi-root
    }

    const cmd = entry.processCmd.toLowerCase();

    // Match against each workspace folder path
    for (const folder of folders) {
      const folderPath = folder.uri.fsPath.toLowerCase();

      // Check if the process command contains the workspace folder path
      if (cmd.includes(folderPath)) {
        return folder.name;
      }

      // Also check just the folder name (for processes that use relative paths)
      const folderName = folder.name.toLowerCase();
      if (cmd.includes(folderName)) {
        return folder.name;
      }
    }

    return null;
  }

  /**
   * Group port entries by workspace folder.
   * Returns a map of folderName → PortEntry[].
   * Ports not matching any workspace go under "Other".
   */
  groupByWorkspace(entries: PortEntry[]): Map<string, PortEntry[]> {
    const groups = new Map<string, PortEntry[]>();

    for (const entry of entries) {
      const folder = this.matchWorkspaceFolder(entry) || 'Other';

      if (!groups.has(folder)) {
        groups.set(folder, []);
      }
      groups.get(folder)!.push(entry);
    }

    return groups;
  }
}
