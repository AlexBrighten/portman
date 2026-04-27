/**
 * EnvScanner — Parses .env files for port variable references.
 * SRS FR-16
 *
 * Scans workspace .env files for PORT=NNNN patterns and cross-references
 * them with active ports to show [.env] badges and expected port labels.
 */

import * as vscode from 'vscode';
import { EnvPortRef, EnvPortMap } from '../types.js';
import { ENV_FILE_NAMES, ENV_PORT_VARIABLE_PATTERNS } from '../constants.js';

export class EnvScanner {
  private envPortMap: EnvPortMap = new Map();
  private disposables: vscode.Disposable[] = [];

  /** Initialize scanner and set up file watchers */
  async initialize(): Promise<void> {
    await this.scanAllEnvFiles();

    // Watch for .env file changes
    for (const envFile of ENV_FILE_NAMES) {
      const watcher = vscode.workspace.createFileSystemWatcher(`**/${envFile}`);
      watcher.onDidChange(() => this.scanAllEnvFiles());
      watcher.onDidCreate(() => this.scanAllEnvFiles());
      watcher.onDidDelete(() => this.scanAllEnvFiles());
      this.disposables.push(watcher);
    }
  }

  /** Get the current env port map */
  getEnvPorts(): EnvPortMap {
    return this.envPortMap;
  }

  /** Check if a port is referenced in .env files */
  getEnvRef(port: number): EnvPortRef | undefined {
    return this.envPortMap.get(port);
  }

  /** Scan all .env files in the workspace */
  private async scanAllEnvFiles(): Promise<void> {
    this.envPortMap.clear();

    for (const envFileName of ENV_FILE_NAMES) {
      const files = await vscode.workspace.findFiles(
        `**/${envFileName}`,
        '**/node_modules/**',
        10 // limit
      );

      for (const uri of files) {
        try {
          const content = await vscode.workspace.fs.readFile(uri);
          const text = Buffer.from(content).toString('utf-8');
          this.parseEnvFile(text, uri.fsPath);
        } catch {
          // File read error — skip
        }
      }
    }
  }

  /** Parse a single .env file for port variables */
  private parseEnvFile(content: string, filePath: string): void {
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) { continue; }

      // Parse KEY=VALUE
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) { continue; }

      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

      // Check if the key matches a port variable pattern
      const isPortVar = ENV_PORT_VARIABLE_PATTERNS.some(pattern => pattern.test(key));
      if (!isPortVar) { continue; }

      // Parse the port number
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) { continue; }

      // Store in the map (last-write-wins if multiple .env files define the same port)
      this.envPortMap.set(port, {
        port,
        variableName: key,
        sourceFile: filePath,
      });
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
