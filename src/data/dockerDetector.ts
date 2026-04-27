/**
 * DockerDetector — Identifies Docker-proxied ports and container names.
 * SRS FR-17
 *
 * Runs `docker ps` to map container ports to host ports.
 * Gracefully fails if Docker is not installed or not running.
 */

import { exec } from 'child_process';
import { COMMAND_TIMEOUT_MS } from '../constants.js';

export interface DockerPortMapping {
  containerName: string;
  containerId: string;
  containerPort: number;
  hostPort: number;
  protocol: string;
}

/** Execute a shell command with timeout */
function execAsync(cmd: string, timeoutMs: number = COMMAND_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

export class DockerDetector {
  private isAvailable: boolean | null = null;
  private portMappings: Map<number, DockerPortMapping> = new Map();

  /**
   * Check if Docker CLI is available.
   * Caches the result to avoid repeated checks.
   */
  async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      await execAsync('docker version --format "{{.Server.Version}}"', 2000);
      this.isAvailable = true;
    } catch {
      this.isAvailable = false;
    }

    return this.isAvailable;
  }

  /**
   * Scan running Docker containers for port mappings.
   * Returns a Map<hostPort, DockerPortMapping>.
   */
  async scan(): Promise<Map<number, DockerPortMapping>> {
    this.portMappings.clear();

    if (!(await this.checkAvailability())) {
      return this.portMappings;
    }

    try {
      const stdout = await execAsync(
        'docker ps --format "{{.ID}}|{{.Names}}|{{.Ports}}"',
        COMMAND_TIMEOUT_MS
      );

      const lines = stdout.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { continue; }

        const parts = trimmed.split('|');
        if (parts.length < 3) { continue; }

        const containerId = parts[0];
        const containerName = parts[1];
        const portsStr = parts[2];

        // Parse port mappings like "0.0.0.0:3000->3000/tcp, :::3000->3000/tcp"
        const portEntries = portsStr.split(',');

        for (const portEntry of portEntries) {
          const portTrimmed = portEntry.trim();

          // Match patterns like:
          // 0.0.0.0:3000->3000/tcp
          // :::3000->3000/tcp
          // 8080->80/tcp
          const match = portTrimmed.match(
            /(?:[\d.]+:|:::)?(\d+)->(\d+)\/(\w+)/
          );

          if (match) {
            const hostPort = parseInt(match[1], 10);
            const containerPort = parseInt(match[2], 10);
            const protocol = match[3];

            this.portMappings.set(hostPort, {
              containerName,
              containerId,
              containerPort,
              hostPort,
              protocol,
            });
          }
        }
      }
    } catch (err) {
      // Docker command failed — silently continue
      console.log('[Portman] Docker scan skipped:', (err as Error).message);
    }

    return this.portMappings;
  }

  /** Get Docker mapping for a specific host port */
  getMapping(hostPort: number): DockerPortMapping | undefined {
    return this.portMappings.get(hostPort);
  }

  /** Get all current mappings */
  getMappings(): Map<number, DockerPortMapping> {
    return this.portMappings;
  }

  /** Reset availability cache (e.g., after Docker is installed/started) */
  resetAvailability(): void {
    this.isAvailable = null;
  }
}
