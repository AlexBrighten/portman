/**
 * Core data types for Portman — VS Code Port Manager Extension.
 * Based on SRS v2.0 §7 Data Models.
 */

/** Raw output from OS port scan (lsof / netstat / ss) */
export interface RawPortEntry {
  port: number;
  protocol: 'TCP' | 'UDP';
  address: string;
  pid: number;
}

/** Enriched process information from the process mapper */
export interface ProcessInfo {
  pid: number;
  name: string;
  cmd: string;
  ppid: number;
  memoryMB: number;
}

/**
 * Primary data object representing a single active port binding.
 * SRS §7.1
 */
export interface PortEntry {
  port: number;
  protocol: 'TCP' | 'UDP';
  address: string;
  pid: number;
  processName: string;
  processCmd: string;
  frameworkLabel: string | null;
  annotation: string | null;
  isDockerPort: boolean;
  dockerContainerName: string | null;
  envVarName: string | null;
  isEnvExpected: boolean;
  detectedAt: Date;
  firstSeenAt: Date;
  memoryMB: number;
  status: 'healthy' | 'conflict' | 'unknown';
  category: 'dev' | 'ide' | 'system';
}

/**
 * Named port profile for saving/reusing sets of ports.
 * SRS §7.2
 */
export interface PortProfile {
  id: string;
  name: string;
  description: string | null;
  ports: number[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  source: 'local' | 'team';
}

/** Health state of a port profile */
export type ProfileHealth = 'green' | 'amber' | 'red';

/**
 * Kill history entry for the session audit trail.
 * SRS §7.4
 */
export interface KillHistoryEntry {
  timestamp: string;
  port: number;
  pid: number;
  processName: string;
  outcome: 'success' | 'failure' | 'cancelled';
  errorMessage: string | null;
  riskLevel: 'normal' | 'high_risk';
  source: 'sidebar' | 'command_palette' | 'bulk_profile' | 'conflict_prediction' | 'notification';
}

/** User-defined framework mapping from settings */
export interface FrameworkMapping {
  pattern: string;
  label: string;
}

/** Conflict event raised by ConflictDetector */
export interface ConflictEvent {
  port: number;
  taskName: string;
  occupyingPid: number;
  occupyingProcessName: string;
  source: string;
}

/** Environment variable port reference parsed from .env files */
export interface EnvPortRef {
  port: number;
  variableName: string;
  sourceFile: string;
}

/** Map of port number → env variable info */
export type EnvPortMap = Map<number, EnvPortRef>;

/** Tree item types used as contextValue for menu filtering */
export type TreeItemType = 'portEntry' | 'portMetadata' | 'workspaceGroup' | 'profileGroup' | 'emptyState' | 'freePort';

/** Per-port activity log entry */
export interface PortActivity {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}
