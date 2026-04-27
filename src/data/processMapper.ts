/**
 * ProcessMapper — Enriches PIDs with process metadata.
 * SRS §3.2.2, FR-02
 *
 * Platform strategy:
 * - macOS/Linux: ps -p <pids> -o pid,ppid,comm,rss,args
 * - Windows: tasklist (primary) + wmic for command lines (enrichment)
 *
 * All commands have a 3000ms hard timeout (NFR-10).
 */

import { exec } from 'child_process';
import * as os from 'os';
import { ProcessInfo } from '../types.js';
import { COMMAND_TIMEOUT_MS, MAX_CMD_STORAGE_LENGTH } from '../constants.js';

/** Execute a shell command with timeout */
function execAsync(cmd: string, timeoutMs: number = COMMAND_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) {
        if (error.killed) {
          reject(new Error(`Command timed out after ${timeoutMs}ms: ${cmd}`));
        } else {
          resolve(stdout || '');
        }
      } else {
        resolve(stdout);
      }
    });
  });
}

/** Map PIDs to process info on macOS/Linux using ps */
async function mapProcessesUnix(pids: number[]): Promise<Map<number, ProcessInfo>> {
  const result = new Map<number, ProcessInfo>();
  if (pids.length === 0) { return result; }

  const batchSize = 50;
  for (let i = 0; i < pids.length; i += batchSize) {
    const batch = pids.slice(i, i + batchSize);
    const pidList = batch.join(',');

    try {
      const stdout = await execAsync(`ps -p ${pidList} -o pid=,ppid=,rss=,comm=,args=`);
      const lines = stdout.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { continue; }

        const parts = trimmed.split(/\s+/);
        if (parts.length < 4) { continue; }

        const pid = parseInt(parts[0], 10);
        const ppid = parseInt(parts[1], 10);
        const rss = parseInt(parts[2], 10); // in KB
        if (isNaN(pid)) { continue; }

        const comm = parts[3];
        const cmd = parts.slice(4).join(' ') || comm;

        result.set(pid, {
          pid,
          ppid: isNaN(ppid) ? 0 : ppid,
          name: comm.split('/').pop() || comm,
          cmd: cmd.substring(0, MAX_CMD_STORAGE_LENGTH),
          memoryMB: isNaN(rss) ? 0 : Math.round(rss / 1024),
        });
      }
    } catch (err) {
      console.error(`[Portman] ps lookup failed for batch:`, (err as Error).message);
    }
  }

  return result;
}

/** Map PIDs to process info on Windows using tasklist + wmic */
async function mapProcessesWindows(pids: number[]): Promise<Map<number, ProcessInfo>> {
  const result = new Map<number, ProcessInfo>();
  if (pids.length === 0) { return result; }

  const pidSet = new Set(pids);

  // Step 1: Get all process names + memory via tasklist
  try {
    const stdout = await execAsync('tasklist /FO CSV /NH');
    const lines = stdout.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { continue; }

      // CSV: "name.exe","PID","Session Name","Session#","Mem Usage"
      const match = trimmed.match(/"([^"]+)","(\d+)","[^"]*","[^"]*","([\d,]+)\s*K"/);
      if (!match) { continue; }

      const name = match[1];
      const pid = parseInt(match[2], 10);
      const memKB = parseInt(match[3].replace(/,/g, ''), 10);

      if (pidSet.has(pid)) {
        result.set(pid, {
          pid,
          ppid: 0,
          name: name.replace(/\.exe$/i, ''),
          cmd: name,
          memoryMB: isNaN(memKB) ? 0 : Math.round(memKB / 1024),
        });
      }
    }
  } catch (err) {
    console.error(`[Portman] tasklist failed:`, (err as Error).message);
  }

  // Step 2: Enrich with full command lines via wmic (best-effort, first 30)
  const enrichPids = [...result.keys()].slice(0, 30);

  for (const pid of enrichPids) {
    const info = result.get(pid);
    if (!info) { continue; }

    try {
      const stdout = await execAsync(
        `wmic process where "ProcessId=${pid}" get CommandLine /format:list`,
        2000
      );
      const match = stdout.match(/CommandLine=(.*)/);
      if (match && match[1].trim()) {
        info.cmd = match[1].trim().substring(0, MAX_CMD_STORAGE_LENGTH);
      }
    } catch {
      // wmic may not be available — that's fine
    }
  }

  return result;
}

/**
 * Enrich an array of PIDs with process metadata.
 * Returns a Map<pid, ProcessInfo>. PIDs not found are mapped to "Unknown Process".
 */
export async function mapProcesses(pids: number[]): Promise<Map<number, ProcessInfo>> {
  const uniquePids = [...new Set(pids.filter(p => p > 0))];

  const platform = os.platform();
  let processMap: Map<number, ProcessInfo>;

  if (platform === 'win32') {
    processMap = await mapProcessesWindows(uniquePids);
  } else {
    processMap = await mapProcessesUnix(uniquePids);
  }

  // Fill in "Unknown Process" for any PIDs we couldn't resolve
  for (const pid of uniquePids) {
    if (!processMap.has(pid)) {
      processMap.set(pid, {
        pid,
        ppid: 0,
        name: 'Unknown Process',
        cmd: `PID ${pid} — process terminated or inaccessible`,
        memoryMB: 0,
      });
    }
  }

  return processMap;
}
