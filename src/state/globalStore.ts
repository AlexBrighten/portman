/**
 * GlobalStore — Type-safe wrapper around VS Code's globalState API.
 * SRS §3 State Management Layer
 *
 * Per review feedback (FR-09): Annotation key schema is
 * `annotation:{port}:{processName}` to survive port number reuse.
 */

import * as vscode from 'vscode';

const ANNOTATIONS_PREFIX = 'portman.annotations';

export class GlobalStore {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get the annotation for a port+process combination.
   * Key schema: annotation:{port}:{processName} (FR-09 review gap)
   */
  getAnnotation(port: number, processName: string): string | null {
    const key = `${ANNOTATIONS_PREFIX}.${port}_${processName}`;
    return this.context.globalState.get<string>(key, null as unknown as string) || null;
  }

  /**
   * Set an annotation for a port+process combination.
   */
  async setAnnotation(port: number, processName: string, label: string): Promise<void> {
    const key = `${ANNOTATIONS_PREFIX}.${port}_${processName}`;
    await this.context.globalState.update(key, label);
  }

  /**
   * Remove an annotation.
   */
  async removeAnnotation(port: number, processName: string): Promise<void> {
    const key = `${ANNOTATIONS_PREFIX}.${port}_${processName}`;
    await this.context.globalState.update(key, undefined);
  }

  /**
   * Get all annotations (for search/filter matching).
   * Returns a map of `{port}_{processName}` → label.
   */
  getAllAnnotations(): Map<string, string> {
    const result = new Map<string, string>();
    const keys = this.context.globalState.keys();

    for (const key of keys) {
      if (key.startsWith(ANNOTATIONS_PREFIX + '.')) {
        const suffix = key.substring(ANNOTATIONS_PREFIX.length + 1);
        const value = this.context.globalState.get<string>(key);
        if (value) {
          result.set(suffix, value);
        }
      }
    }

    return result;
  }

  /**
   * Generic get from globalState.
   */
  get<T>(key: string, defaultValue: T): T {
    return this.context.globalState.get<T>(key, defaultValue);
  }

  /**
   * Generic set to globalState.
   */
  async set<T>(key: string, value: T): Promise<void> {
    await this.context.globalState.update(key, value);
  }
}
