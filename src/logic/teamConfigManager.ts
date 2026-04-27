/**
 * TeamConfigManager — Import/export port profiles from .devcontainer/portman.json.
 * SRS FR-20
 *
 * Supports team-shared port configurations via a checked-in JSON file.
 * Team profiles are imported as read-only (source: 'team').
 */

import * as vscode from 'vscode';
import { PortProfile } from '../types.js';
import { ProfileManager } from './profileManager.js';

/** Schema for .devcontainer/portman.json */
interface TeamConfig {
  profiles: Array<{
    name: string;
    description?: string;
    ports: number[];
  }>;
  defaultProfile?: string;
}

export class TeamConfigManager {
  private profileManager: ProfileManager;

  constructor(profileManager: ProfileManager) {
    this.profileManager = profileManager;
  }

  /**
   * Auto-import team profiles on workspace open.
   * Called at activation if portman.useTeamConfig is enabled.
   */
  async autoImport(): Promise<void> {
    const config = vscode.workspace.getConfiguration('portman');
    if (!config.get<boolean>('useTeamConfig', false)) {
      return;
    }

    const files = await vscode.workspace.findFiles(
      '.devcontainer/portman.json',
      null,
      1
    );

    if (files.length === 0) {
      return;
    }

    try {
      const content = await vscode.workspace.fs.readFile(files[0]);
      const teamConfig: TeamConfig = JSON.parse(Buffer.from(content).toString('utf-8'));

      await this.importProfiles(teamConfig);
      console.log('[Portman] Team config imported from .devcontainer/portman.json');
    } catch (err) {
      console.error('[Portman] Failed to import team config:', (err as Error).message);
    }
  }

  /** Import profiles from a team config, merging with existing profiles */
  private async importProfiles(teamConfig: TeamConfig): Promise<void> {
    if (!teamConfig.profiles || !Array.isArray(teamConfig.profiles)) {
      return;
    }

    const existingProfiles = this.profileManager.getProfiles();
    const existingTeamNames = new Set(
      existingProfiles.filter(p => p.source === 'team').map(p => p.name)
    );

    for (const teamProfile of teamConfig.profiles) {
      if (!teamProfile.name || !Array.isArray(teamProfile.ports)) {
        continue;
      }

      // Skip if already imported (by name)
      if (existingTeamNames.has(teamProfile.name)) {
        // Update existing team profile's ports
        const existing = existingProfiles.find(
          p => p.source === 'team' && p.name === teamProfile.name
        );
        if (existing) {
          await this.profileManager.updateProfile(existing.id, {
            ports: teamProfile.ports,
            description: teamProfile.description,
          });
        }
        continue;
      }

      // Create new team profile
      const profile = await this.profileManager.createProfile(
        teamProfile.name,
        teamProfile.ports,
        teamProfile.description
      );

      // Mark as team source (need to update after creation)
      const profiles = this.profileManager.getProfiles();
      const created = profiles.find(p => p.id === profile.id);
      if (created) {
        created.source = 'team';
        // Save the updated profiles list via a re-save
        await this.profileManager.updateProfile(created.id, {
          name: created.name, // no-op update to trigger save
        });
      }
    }

    // Activate default profile if specified
    if (teamConfig.defaultProfile) {
      const allProfiles = this.profileManager.getProfiles();
      const defaultP = allProfiles.find(p => p.name === teamConfig.defaultProfile);
      if (defaultP) {
        await this.profileManager.activateProfile(defaultP.id);
      }
    }
  }

  /**
   * Export current profiles to .devcontainer/portman.json.
   * Creates the .devcontainer directory if it doesn't exist.
   */
  async exportProfiles(): Promise<boolean> {
    const profiles = this.profileManager.getProfiles();

    if (profiles.length === 0) {
      vscode.window.showWarningMessage('No profiles to export.');
      return false;
    }

    // Select profiles to export
    const items = profiles.map(p => ({
      label: p.name,
      description: `${p.ports.length} port(s)${p.source === 'team' ? ' [team]' : ''}`,
      picked: true,
      profile: p,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select profiles to export',
      title: 'Export to .devcontainer/portman.json',
    });

    if (!selected || selected.length === 0) {
      return false;
    }

    // Build the team config
    const teamConfig: TeamConfig = {
      profiles: selected.map(s => ({
        name: s.profile.name,
        description: s.profile.description || undefined,
        ports: s.profile.ports,
      })),
    };

    // Check for active profile to set as default
    const activeProfile = this.profileManager.getActiveProfile();
    if (activeProfile && selected.some(s => s.profile.id === activeProfile.id)) {
      teamConfig.defaultProfile = activeProfile.name;
    }

    // Write to .devcontainer/portman.json
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open.');
      return false;
    }

    const devcontainerDir = vscode.Uri.joinPath(workspaceFolder.uri, '.devcontainer');
    const configFile = vscode.Uri.joinPath(devcontainerDir, 'portman.json');

    try {
      // Create .devcontainer directory if needed
      try {
        await vscode.workspace.fs.stat(devcontainerDir);
      } catch {
        await vscode.workspace.fs.createDirectory(devcontainerDir);
      }

      const content = JSON.stringify(teamConfig, null, 2) + '\n';
      await vscode.workspace.fs.writeFile(
        configFile,
        Buffer.from(content, 'utf-8')
      );

      vscode.window.showInformationMessage(
        `Exported ${selected.length} profile(s) to .devcontainer/portman.json`
      );
      return true;
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to export: ${(err as Error).message}`
      );
      return false;
    }
  }
}
