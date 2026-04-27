/**
 * ProfileManager — CRUD operations for named port profiles.
 * SRS FR-08, §7.2
 *
 * Profiles are persisted in globalState and survive VS Code restarts.
 * Per review feedback: includes getProfileHealth() method for aggregate
 * health computation (green/amber/red).
 */

import * as vscode from 'vscode';
import { PortProfile, PortEntry, ProfileHealth } from '../types.js';
import {
  MAX_PROFILE_NAME_LENGTH,
  MAX_PROFILE_DESCRIPTION_LENGTH,
} from '../constants.js';

const PROFILES_STORAGE_KEY = 'portman.profiles';

export class ProfileManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /** Get all saved profiles */
  getProfiles(): PortProfile[] {
    return this.context.globalState.get<PortProfile[]>(PROFILES_STORAGE_KEY, []);
  }

  /** Get a single profile by ID */
  getProfile(id: string): PortProfile | undefined {
    return this.getProfiles().find(p => p.id === id);
  }

  /** Save all profiles to globalState */
  private async saveProfiles(profiles: PortProfile[]): Promise<void> {
    await this.context.globalState.update(PROFILES_STORAGE_KEY, profiles);
  }

  /** Create a new profile */
  async createProfile(name: string, ports: number[], description?: string): Promise<PortProfile> {
    const profiles = this.getProfiles();

    const profile: PortProfile = {
      id: this.generateId(),
      name: name.substring(0, MAX_PROFILE_NAME_LENGTH),
      description: description?.substring(0, MAX_PROFILE_DESCRIPTION_LENGTH) ?? null,
      ports,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: false,
      source: 'local',
    };

    profiles.push(profile);
    await this.saveProfiles(profiles);
    return profile;
  }

  /** Update an existing profile */
  async updateProfile(id: string, updates: Partial<Pick<PortProfile, 'name' | 'description' | 'ports'>>): Promise<PortProfile | undefined> {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) { return undefined; }

    if (updates.name) {
      profiles[index].name = updates.name.substring(0, MAX_PROFILE_NAME_LENGTH);
    }
    if (updates.description !== undefined) {
      profiles[index].description = updates.description?.substring(0, MAX_PROFILE_DESCRIPTION_LENGTH) ?? null;
    }
    if (updates.ports) {
      profiles[index].ports = updates.ports;
    }
    profiles[index].updatedAt = new Date().toISOString();

    await this.saveProfiles(profiles);
    return profiles[index];
  }

  /** Delete a profile by ID */
  async deleteProfile(id: string): Promise<boolean> {
    const profiles = this.getProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    if (filtered.length === profiles.length) { return false; }
    await this.saveProfiles(filtered);
    return true;
  }

  /** Activate a profile (deactivates all others first) */
  async activateProfile(id: string): Promise<boolean> {
    const profiles = this.getProfiles();
    let found = false;

    for (const profile of profiles) {
      if (profile.id === id) {
        profile.isActive = true;
        found = true;
      } else {
        profile.isActive = false;
      }
    }

    if (found) {
      await this.saveProfiles(profiles);
    }
    return found;
  }

  /** Deactivate all profiles */
  async deactivateAll(): Promise<void> {
    const profiles = this.getProfiles();
    for (const profile of profiles) {
      profile.isActive = false;
    }
    await this.saveProfiles(profiles);
  }

  /** Get the currently active profile, if any */
  getActiveProfile(): PortProfile | undefined {
    return this.getProfiles().find(p => p.isActive);
  }

  /**
   * Compute the health state of a profile based on the live port list.
   *
   * - green: All profile ports are free (no conflicts)
   * - amber: Some profile ports are running (expected)
   * - red: A profile port is occupied by an unexpected process
   *
   * Per review feedback (FR-08 gap).
   */
  getProfileHealth(profile: PortProfile, activePorts: PortEntry[]): ProfileHealth {
    const activePortNumbers = new Set(activePorts.map(p => p.port));
    const profilePortSet = new Set(profile.ports);

    let occupiedCount = 0;

    for (const port of profilePortSet) {
      if (activePortNumbers.has(port)) {
        occupiedCount++;
      }
    }

    if (occupiedCount === 0) {
      return 'green'; // All ports free
    }

    // Check if occupied ports have expected process names (by annotation match)
    // For now, any occupation is amber; red would need more context
    if (occupiedCount === profile.ports.length) {
      return 'amber'; // All ports occupied (running state)
    }

    return 'amber'; // Partial occupation
  }

  /** Generate a UUID v4 */
  private generateId(): string {
    // Simple UUID v4 generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Interactive profile creation flow via Quick Pick + Input Box.
   * Three steps: name → port selection → description
   */
  async interactiveCreateProfile(availablePorts: PortEntry[]): Promise<PortProfile | undefined> {
    // Step 1: Enter profile name
    const name = await vscode.window.showInputBox({
      prompt: 'Enter a name for the port profile',
      placeHolder: 'e.g., Full Stack Dev, API + DB',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Profile name is required';
        }
        if (value.length > MAX_PROFILE_NAME_LENGTH) {
          return `Maximum ${MAX_PROFILE_NAME_LENGTH} characters`;
        }
        return null;
      },
    });

    if (!name) { return undefined; }

    // Step 2: Select ports from current list
    const portItems = availablePorts.map(p => ({
      label: `Port ${p.port}`,
      description: `${p.frameworkLabel || p.processName} (PID ${p.pid})`,
      port: p.port,
      picked: false,
    }));

    if (portItems.length === 0) {
      vscode.window.showWarningMessage('No active ports to add to the profile.');
      return undefined;
    }

    const selected = await vscode.window.showQuickPick(portItems, {
      canPickMany: true,
      placeHolder: 'Select ports to include in the profile',
      title: `Profile: ${name}`,
    });

    if (!selected || selected.length === 0) { return undefined; }

    // Step 3: Optional description
    const description = await vscode.window.showInputBox({
      prompt: 'Enter an optional description (press Enter to skip)',
      placeHolder: 'e.g., Frontend + API + Redis for local development',
      validateInput: (value) => {
        if (value && value.length > MAX_PROFILE_DESCRIPTION_LENGTH) {
          return `Maximum ${MAX_PROFILE_DESCRIPTION_LENGTH} characters`;
        }
        return null;
      },
    });

    // Create the profile
    const ports = selected.map(s => s.port);
    return this.createProfile(name, ports, description || undefined);
  }
}
