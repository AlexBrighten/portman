/**
 * PortFinder — Wrapper around get-port-please for finding available ports.
 * SRS FR-05
 *
 * Per review feedback: uses get-port-please v3 API with correct options shape,
 * and provides the result as an info notification with a "Copy" action.
 */

import { getPort } from 'get-port-please';
import { FREE_PORT_SCAN_RANGE } from '../constants.js';

/**
 * Find the next available port starting from a given base port.
 *
 * @param basePort - The port number to start scanning from
 * @param excludePorts - Ports to exclude (e.g., profile ports)
 * @returns The next available port number, or null if none found in range
 */
export async function findFreePort(
  basePort: number,
  excludePorts: number[] = []
): Promise<number | null> {
  try {
    // get-port-please v3 API
    const port = await getPort({
      port: basePort + 1,
      portRange: [basePort + 1, basePort + FREE_PORT_SCAN_RANGE],
    });

    // Verify it's not in the exclude list
    if (excludePorts.includes(port)) {
      // Try again with a wider range
      for (let candidate = basePort + 1; candidate <= basePort + FREE_PORT_SCAN_RANGE; candidate++) {
        if (excludePorts.includes(candidate)) { continue; }
        const available = await getPort({ port: candidate });
        if (available === candidate) {
          return candidate;
        }
      }
      return null;
    }

    return port;
  } catch (err) {
    console.error('[Portman] Free port scan failed:', (err as Error).message);
    return null;
  }
}

/**
 * Check if a specific port is available.
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const available = await getPort({ port });
    return available === port;
  } catch {
    return false;
  }
}
