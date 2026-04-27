/**
 * PortScanner — Data acquisition layer for detecting active port bindings.
 * SRS §3.2.1, FR-01
 *
 * Platform strategy:
 * - macOS/Linux: lsof → fallback to ss (per review NFR-05)
 * - Windows: netstat -ano
 *
 * All commands have a 3000ms hard timeout (NFR-10).
 */

import { exec } from 'child_process';
import * as os from 'os';
import { RawPortEntry } from '../types.js';
import { COMMAND_TIMEOUT_MS } from '../constants.js';

/** Execute a shell command with timeout, returning stdout */
function execAsync(cmd: string, timeoutMs: number = COMMAND_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        // Timeout kills the process — error.killed will be true
        if (error.killed) {
          reject(new Error(`Command timed out after ${timeoutMs}ms: ${cmd}`));
        } else {
          // Some commands return non-zero but still have useful output
          resolve(stdout || '');
        }
      } else {
        resolve(stdout);
      }
    });
  });
}

/** Parse lsof output into RawPortEntry[] */
function parseLsofOutput(stdout: string): RawPortEntry[] {
  const entries: RawPortEntry[] = [];
  const lines = stdout.split('\n');

  for (const line of lines) {
    // lsof -nP -iTCP -iUDP -sTCP:LISTEN output format:
    // COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
    // node    1234 user 22u IPv4 12345 0t0 TCP *:3000 (LISTEN)
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) { continue; }

    const name = parts[parts.length - 1]; // e.g., "*:3000" or "127.0.0.1:3000"
    const state = parts[parts.length - 1]; // check for LISTEN is done by lsof flags
    const node = parts[parts.length - 2]; // TCP or UDP

    // Extract address and port from NAME field (second-to-last or embedded)
    const nameField = parts.find(p => p.includes(':') && /\d+/.test(p) && !p.startsWith('0t'));
    if (!nameField) { continue; }

    // Handle formats like "*:3000", "127.0.0.1:3000", "[::1]:3000"
    const lastColon = nameField.lastIndexOf(':');
    if (lastColon === -1) { continue; }

    const address = nameField.substring(0, lastColon).replace(/[\[\]]/g, '') || '0.0.0.0';
    const portStr = nameField.substring(lastColon + 1);
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port <= 0 || port > 65535) { continue; }

    const pid = parseInt(parts[1], 10);
    if (isNaN(pid)) { continue; }

    // Determine protocol from the NODE column
    const protocolField = parts[7] || parts[8] || '';
    const protocol: 'TCP' | 'UDP' = protocolField.toUpperCase().includes('UDP') ? 'UDP' : 'TCP';

    entries.push({
      port,
      protocol,
      address: address === '*' ? '0.0.0.0' : address,
      pid,
    });
  }

  return entries;
}

/** Parse ss output into RawPortEntry[] (Linux fallback when lsof is absent) */
function parseSsOutput(stdout: string): RawPortEntry[] {
  const entries: RawPortEntry[] = [];
  const lines = stdout.split('\n');

  for (const line of lines) {
    // ss -tlnp output:
    // State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
    // LISTEN 0       128     0.0.0.0:3000        0.0.0.0:*          users:(("node",pid=1234,fd=22))
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || !parts[0].includes('LISTEN')) { continue; }

    const localAddr = parts[3];
    const lastColon = localAddr.lastIndexOf(':');
    if (lastColon === -1) { continue; }

    const address = localAddr.substring(0, lastColon).replace(/[\[\]]/g, '') || '0.0.0.0';
    const port = parseInt(localAddr.substring(lastColon + 1), 10);
    if (isNaN(port) || port <= 0 || port > 65535) { continue; }

    // Extract PID from Process column: users:(("node",pid=1234,fd=22))
    const processInfo = parts.slice(5).join(' ');
    const pidMatch = processInfo.match(/pid=(\d+)/);
    const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;

    entries.push({
      port,
      protocol: 'TCP', // ss -t only shows TCP; would need -u for UDP
      address: address === '*' ? '0.0.0.0' : address,
      pid,
    });
  }

  return entries;
}

/** Parse Windows netstat -ano output into RawPortEntry[] */
function parseNetstatOutput(stdout: string): RawPortEntry[] {
  const entries: RawPortEntry[] = [];
  const lines = stdout.split('\n');

  for (const line of lines) {
    // netstat -ano output:
    //   TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    1234
    //   TCP    [::]:3000       [::]:0       LISTENING    1234
    const trimmed = line.trim();
    if (!trimmed.includes('LISTENING')) { continue; }

    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) { continue; }

    const proto = parts[0].toUpperCase();
    const protocol: 'TCP' | 'UDP' = proto === 'UDP' ? 'UDP' : 'TCP';

    const localAddr = parts[1];
    const lastColon = localAddr.lastIndexOf(':');
    if (lastColon === -1) { continue; }

    let address = localAddr.substring(0, lastColon).replace(/[\[\]]/g, '');
    const port = parseInt(localAddr.substring(lastColon + 1), 10);
    if (isNaN(port) || port <= 0 || port > 65535) { continue; }

    // Normalize addresses
    if (address === '::' || address === '::1') {
      address = address;
    } else if (!address) {
      address = '0.0.0.0';
    }

    const pid = parseInt(parts[parts.length - 1], 10);
    if (isNaN(pid)) { continue; }

    entries.push({ port, protocol, address, pid });
  }

  return entries;
}

/**
 * Scan all active listening ports on the local machine.
 * Returns deduplicated RawPortEntry[] sorted by port number.
 */
export async function scanPorts(): Promise<RawPortEntry[]> {
  const platform = os.platform();
  let entries: RawPortEntry[] = [];

  if (platform === 'win32') {
    // Windows: netstat -ano
    try {
      const stdout = await execAsync('netstat -ano');
      entries = parseNetstatOutput(stdout);
    } catch (err) {
      console.error('[Portman] netstat scan failed:', (err as Error).message);
      return [];
    }
  } else {
    // macOS / Linux: try lsof first, fall back to ss
    try {
      const stdout = await execAsync('lsof -nP -iTCP -iUDP -sTCP:LISTEN');
      entries = parseLsofOutput(stdout);
    } catch {
      // lsof failed — try ss as fallback (Linux)
      try {
        const stdout = await execAsync('ss -tlnp');
        entries = parseSsOutput(stdout);
      } catch (err) {
        console.error('[Portman] Port scan failed (both lsof and ss):', (err as Error).message);
        return [];
      }
    }
  }

  // Deduplicate by port+protocol+pid (lsof can produce duplicate lines)
  const seen = new Set<string>();
  const deduplicated = entries.filter(e => {
    const key = `${e.port}:${e.protocol}:${e.pid}`;
    if (seen.has(key)) { return false; }
    seen.add(key);
    return true;
  });

  // Sort by port number
  deduplicated.sort((a, b) => a.port - b.port);

  return deduplicated;
}
