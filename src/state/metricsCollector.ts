/**
 * MetricsCollector — Local-only telemetry for SRS §9 KPIs.
 *
 * Per review feedback: stores metrics in context.globalStorageUri (filesystem path)
 * instead of globalState, because globalState syncs across machines via Settings Sync.
 * This ensures metrics are truly local-only and match the privacy claim.
 *
 * All collection is gated behind portman.enableTelemetry (default: false).
 */

import * as vscode from 'vscode';
import * as path from 'path';

interface MetricsData {
  /** Total kill attempts */
  killAttempts: number;
  /** Successful kills */
  killSuccesses: number;
  /** Total conflict predictions surfaced */
  conflictPredictions: number;
  /** Predictions that resulted in an actual crash within 5s */
  conflictPredictionsAccurate: number;
  /** Total terminal EADDRINUSE events detected */
  terminalCrashesDetected: number;
  /** Terminal crashes where Portman fired before manual resolution */
  terminalInterceptions: number;
  /** Array of resolution times in ms (crash detection → port freed) */
  resolutionTimesMs: number[];
  /** Whether user has created a profile */
  hasCreatedProfile: boolean;
  /** Whether user has created an annotation */
  hasCreatedAnnotation: boolean;
  /** Timestamp of first metric event */
  firstEventAt: string | null;
  /** Timestamp of last metric event */
  lastEventAt: string | null;
}

const EMPTY_METRICS: MetricsData = {
  killAttempts: 0,
  killSuccesses: 0,
  conflictPredictions: 0,
  conflictPredictionsAccurate: 0,
  terminalCrashesDetected: 0,
  terminalInterceptions: 0,
  resolutionTimesMs: [],
  hasCreatedProfile: false,
  hasCreatedAnnotation: false,
  firstEventAt: null,
  lastEventAt: null,
};

export class MetricsCollector {
  private metrics: MetricsData = { ...EMPTY_METRICS };
  private storageUri: vscode.Uri;
  private metricsFilePath: vscode.Uri;
  private outputChannel: vscode.OutputChannel;
  private enabled: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.storageUri = context.globalStorageUri;
    this.metricsFilePath = vscode.Uri.joinPath(this.storageUri, 'metrics.json');
    this.outputChannel = vscode.window.createOutputChannel('Portman — Metrics');

    // Check if telemetry is enabled
    const config = vscode.workspace.getConfiguration('portman');
    this.enabled = config.get<boolean>('enableTelemetry', false);

    // Watch for config changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('portman.enableTelemetry')) {
        this.enabled = vscode.workspace.getConfiguration('portman')
          .get<boolean>('enableTelemetry', false);
      }
    });

    // Load existing metrics
    this.load();
  }

  /** Record a kill attempt */
  recordKillAttempt(success: boolean): void {
    if (!this.enabled) { return; }
    this.metrics.killAttempts++;
    if (success) { this.metrics.killSuccesses++; }
    this.touch();
    this.save();
  }

  /** Record a conflict prediction surfaced to the user */
  recordConflictPrediction(): void {
    if (!this.enabled) { return; }
    this.metrics.conflictPredictions++;
    this.touch();
    this.save();
  }

  /** Record that a predicted conflict actually occurred */
  recordConflictPredictionAccurate(): void {
    if (!this.enabled) { return; }
    this.metrics.conflictPredictionsAccurate++;
    this.touch();
    this.save();
  }

  /** Record a terminal crash detection */
  recordTerminalCrash(interceptedByPortman: boolean): void {
    if (!this.enabled) { return; }
    this.metrics.terminalCrashesDetected++;
    if (interceptedByPortman) { this.metrics.terminalInterceptions++; }
    this.touch();
    this.save();
  }

  /** Record time from crash detection to port freed */
  recordResolutionTime(durationMs: number): void {
    if (!this.enabled) { return; }
    this.metrics.resolutionTimesMs.push(durationMs);
    // Keep only last 100 entries
    if (this.metrics.resolutionTimesMs.length > 100) {
      this.metrics.resolutionTimesMs = this.metrics.resolutionTimesMs.slice(-100);
    }
    this.touch();
    this.save();
  }

  /** Record profile creation */
  recordProfileCreated(): void {
    if (!this.enabled) { return; }
    this.metrics.hasCreatedProfile = true;
    this.touch();
    this.save();
  }

  /** Record annotation creation */
  recordAnnotationCreated(): void {
    if (!this.enabled) { return; }
    this.metrics.hasCreatedAnnotation = true;
    this.touch();
    this.save();
  }

  /** Get a formatted metrics summary for the output channel */
  getMetricsSummary(): string {
    const m = this.metrics;
    const lines: string[] = [];

    lines.push('╔══════════════════════════════════════════╗');
    lines.push('║         PORTMAN — LOCAL METRICS          ║');
    lines.push('╚══════════════════════════════════════════╝');
    lines.push('');

    // Kill success rate
    const killRate = m.killAttempts > 0
      ? ((m.killSuccesses / m.killAttempts) * 100).toFixed(1)
      : 'N/A';
    lines.push(`  Kill Success Rate:          ${killRate}% (${m.killSuccesses}/${m.killAttempts})`);
    lines.push(`  Target:                     ≥ 95%`);
    lines.push('');

    // Conflict prediction accuracy
    const predictionAccuracy = m.conflictPredictions > 0
      ? ((m.conflictPredictionsAccurate / m.conflictPredictions) * 100).toFixed(1)
      : 'N/A';
    lines.push(`  Prediction Accuracy:        ${predictionAccuracy}% (${m.conflictPredictionsAccurate}/${m.conflictPredictions})`);
    lines.push(`  Target:                     ≥ 80%`);
    lines.push('');

    // Terminal interception rate
    const interceptionRate = m.terminalCrashesDetected > 0
      ? ((m.terminalInterceptions / m.terminalCrashesDetected) * 100).toFixed(1)
      : 'N/A';
    lines.push(`  Terminal Interception Rate:  ${interceptionRate}% (${m.terminalInterceptions}/${m.terminalCrashesDetected})`);
    lines.push(`  Target:                     ≥ 60%`);
    lines.push('');

    // Median time-to-resolution
    if (m.resolutionTimesMs.length > 0) {
      const sorted = [...m.resolutionTimesMs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      lines.push(`  Median Time-to-Resolution:  ${(median / 1000).toFixed(1)}s`);
      lines.push(`  Target:                     < 5s`);
    } else {
      lines.push(`  Median Time-to-Resolution:  N/A`);
    }
    lines.push('');

    // Retention markers
    lines.push(`  Profile Created:            ${m.hasCreatedProfile ? '✓ Yes' : '✗ No'}`);
    lines.push(`  Annotation Created:         ${m.hasCreatedAnnotation ? '✓ Yes' : '✗ No'}`);
    lines.push('');

    // Timestamps
    if (m.firstEventAt) {
      lines.push(`  First event:                ${new Date(m.firstEventAt).toLocaleString()}`);
    }
    if (m.lastEventAt) {
      lines.push(`  Last event:                 ${new Date(m.lastEventAt).toLocaleString()}`);
    }

    lines.push('');
    lines.push('  All data stored locally. Nothing leaves this machine.');

    return lines.join('\n');
  }

  /** Show the metrics in an output channel */
  showMetrics(): void {
    if (!this.enabled) {
      vscode.window.showInformationMessage(
        'Telemetry is disabled. Enable portman.enableTelemetry to collect metrics.'
      );
      return;
    }
    this.outputChannel.clear();
    this.outputChannel.appendLine(this.getMetricsSummary());
    this.outputChannel.show(true);
  }

  private touch(): void {
    const now = new Date().toISOString();
    if (!this.metrics.firstEventAt) {
      this.metrics.firstEventAt = now;
    }
    this.metrics.lastEventAt = now;
  }

  /** Save metrics to globalStorageUri filesystem (NOT globalState) */
  private async save(): Promise<void> {
    try {
      // Ensure directory exists
      try {
        await vscode.workspace.fs.stat(this.storageUri);
      } catch {
        await vscode.workspace.fs.createDirectory(this.storageUri);
      }

      const content = JSON.stringify(this.metrics, null, 2);
      await vscode.workspace.fs.writeFile(
        this.metricsFilePath,
        Buffer.from(content, 'utf-8')
      );
    } catch (err) {
      console.error('[Portman] Failed to save metrics:', (err as Error).message);
    }
  }

  /** Load metrics from globalStorageUri filesystem */
  private async load(): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(this.metricsFilePath);
      const data = JSON.parse(Buffer.from(content).toString('utf-8'));
      this.metrics = { ...EMPTY_METRICS, ...data };
    } catch {
      // No existing metrics file — start fresh
      this.metrics = { ...EMPTY_METRICS };
    }
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
