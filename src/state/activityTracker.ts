/**
 * ActivityTracker — Per-port activity log for the detail panel.
 * Tracks process start times and notable events.
 */

import { PortActivity } from '../types.js';

/** Maximum activity entries per port */
const MAX_ENTRIES_PER_PORT = 50;

export class ActivityTracker {
  /** Map of port → first seen timestamp */
  private firstSeen: Map<number, Date> = new Map();

  /** Map of port → activity log */
  private activities: Map<number, PortActivity[]> = new Map();

  /** Record that a port was detected (tracks first-seen time) */
  portDetected(port: number, processName: string): void {
    if (!this.firstSeen.has(port)) {
      this.firstSeen.set(port, new Date());
      this.addActivity(port, {
        timestamp: new Date().toISOString(),
        message: `process started on :${port}`,
        type: 'info',
      });
    }
  }

  /** Record that a port is no longer active */
  portRemoved(port: number): void {
    this.addActivity(port, {
      timestamp: new Date().toISOString(),
      message: `:${port} process stopped`,
      type: 'info',
    });
    this.firstSeen.delete(port);
  }

  /** Record a conflict detected on a port */
  conflictDetected(port: number, conflictWith: string): void {
    this.addActivity(port, {
      timestamp: new Date().toISOString(),
      message: `port :${port} conflict detected${conflictWith ? ' with ' + conflictWith : ''}`,
      type: 'error',
    });
  }

  /** Record a kill event */
  killEvent(port: number, success: boolean, processName: string): void {
    this.addActivity(port, {
      timestamp: new Date().toISOString(),
      message: success ? `killed ${processName} on :${port}` : `failed to kill ${processName}`,
      type: success ? 'success' : 'error',
    });
  }

  /** Record an HTTP/network event (placeholder for future) */
  genericEvent(port: number, message: string, type: PortActivity['type'] = 'info'): void {
    this.addActivity(port, {
      timestamp: new Date().toISOString(),
      message,
      type,
    });
  }

  /** Get the first-seen time for a port */
  getFirstSeen(port: number): Date | undefined {
    return this.firstSeen.get(port);
  }

  /** Get the uptime string for a port */
  getUptime(port: number): string {
    const firstSeen = this.firstSeen.get(port);
    if (!firstSeen) { return 'just now'; }

    const diffMs = Date.now() - firstSeen.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  }

  /** Get activity log for a port */
  getActivities(port: number): PortActivity[] {
    return this.activities.get(port) || [];
  }

  /** Reconcile current ports — track new ones, remove stale ones */
  reconcile(currentPorts: number[], processNames: Map<number, string>): void {
    const currentSet = new Set(currentPorts);

    // Track new ports
    for (const port of currentPorts) {
      if (!this.firstSeen.has(port)) {
        this.portDetected(port, processNames.get(port) || 'unknown');
      }
    }

    // Remove stale ports
    for (const [port] of this.firstSeen) {
      if (!currentSet.has(port)) {
        this.portRemoved(port);
      }
    }
  }

  private addActivity(port: number, activity: PortActivity): void {
    if (!this.activities.has(port)) {
      this.activities.set(port, []);
    }
    const list = this.activities.get(port)!;
    list.push(activity);

    // Trim to max entries
    if (list.length > MAX_ENTRIES_PER_PORT) {
      list.splice(0, list.length - MAX_ENTRIES_PER_PORT);
    }
  }
}
