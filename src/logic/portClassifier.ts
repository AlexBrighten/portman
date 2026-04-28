import { 
  SYSTEM_PID_THRESHOLD, 
  SYSTEM_PROCESS_NAMES, 
  IDE_PROCESS_NAMES,
  PERSISTENT_SERVICE_NAMES,
  DEV_TOOL_PROCESS_NAMES
} from '../constants.js';

/**
 * Determines the category of a process ('dev', 'ide', 'system', 'service').
 * 
 * Heuristics:
 * 1. PIDs <= SYSTEM_PID_THRESHOLD are 'system'.
 * 2. Process names in SYSTEM_PROCESS_NAMES are 'system'.
 * 3. Process names in IDE_PROCESS_NAMES are 'ide'.
 * 4. Process names in PERSISTENT_SERVICE_NAMES (databases, etc.) are 'service'.
 * 5. Process names in DEV_TOOL_PROCESS_NAMES are 'dev'.
 * 6. Ports > 1024 are conditionally 'dev' if they don't match the above.
 */
export function classifyPort(port: number, processName: string, pid: number): 'dev' | 'ide' | 'system' | 'service' {
  if (pid <= SYSTEM_PID_THRESHOLD) {
    return 'system';
  }

  const normalized = processName.replace(/\.exe$/i, '');
  const lowerName = normalized.toLowerCase();

  for (const sysName of SYSTEM_PROCESS_NAMES) {
    if (sysName.toLowerCase() === lowerName) {
      return 'system';
    }
  }

  for (const ideName of IDE_PROCESS_NAMES) {
    if (ideName.toLowerCase() === lowerName) {
      return 'ide';
    }
  }

  for (const serviceName of PERSISTENT_SERVICE_NAMES) {
    if (serviceName.toLowerCase() === lowerName || serviceName.toLowerCase() === processName.toLowerCase()) {
      return 'service';
    }
  }

  for (const devName of DEV_TOOL_PROCESS_NAMES) {
    if (devName.toLowerCase() === lowerName || devName.toLowerCase() === processName.toLowerCase()) {
      return 'dev';
    }
  }

  if (port > 1024) {
    return 'dev';
  }

  return 'dev'; // Default fallback
}
