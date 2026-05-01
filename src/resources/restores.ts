/**
 * Restore operations.
 *
 * Restores are asynchronous: queue one with {@link queue}, then poll with
 * {@link get} or use {@link waitFor} to block until terminal status. Default
 * polling interval is 30 seconds — do NOT poll faster than that to stay
 * within the 60 req/min API budget.
 */

import type { HttpClient } from '../http.js';
import type {
  QueuedRestore,
  RestoreRequest,
  RestoreStatus,
  SaasProtectionRestore,
} from '../types/restores.js';
import { TERMINAL_RESTORE_STATUSES } from '../types/restores.js';

/** Default polling interval. */
export const DEFAULT_RESTORE_POLL_INTERVAL_MS = 30_000;

/**
 * Options accepted by {@link RestoresResource.waitFor}.
 */
export interface WaitForRestoreOptions {
  /** Polling interval in milliseconds. Default: 30000 (30s). */
  intervalMs?: number;
  /** Total wait timeout in milliseconds. When exceeded a {@link Error} is thrown. */
  timeoutMs?: number;
  /** Override Date.now (used for testing). */
  now?: () => number;
  /** Override sleep helper (used for testing). */
  sleep?: (ms: number) => Promise<void>;
}

export class RestoresResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Queue a new restore for a seat.
   *
   * @returns The new restore's ID and initial (typically `"queued"`) status.
   */
  async queue(seatId: string, payload: RestoreRequest): Promise<QueuedRestore> {
    const created = await this.httpClient.post<SaasProtectionRestore>(
      `/seats/${encodeURIComponent(seatId)}/restores`,
      payload
    );
    return {
      restoreId: created.id,
      status: created.status ?? 'queued',
    };
  }

  /** Get the current state of a restore. */
  async get(restoreId: string): Promise<SaasProtectionRestore> {
    return this.httpClient.get<SaasProtectionRestore>(
      `/restores/${encodeURIComponent(restoreId)}`
    );
  }

  /**
   * Poll a restore until it reaches a terminal status (`completed`, `failed`,
   * or `cancelled`) — or until `timeoutMs` elapses.
   *
   * Defaults to 30s polling. The 30s default exists because the SaaS
   * Protection API allows only 60 req/min per key.
   */
  async waitFor(restoreId: string, options: WaitForRestoreOptions = {}): Promise<SaasProtectionRestore> {
    const intervalMs = options.intervalMs ?? DEFAULT_RESTORE_POLL_INTERVAL_MS;
    const timeoutMs = options.timeoutMs;
    const now = options.now ?? Date.now;
    const sleep = options.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
    const start = now();

    while (true) {
      const restore = await this.get(restoreId);
      if (isTerminal(restore.status)) return restore;

      if (timeoutMs !== undefined && now() - start >= timeoutMs) {
        throw new Error(
          `Timed out after ${timeoutMs}ms waiting for restore ${restoreId} to finish (last status: ${restore.status})`
        );
      }

      await sleep(intervalMs);
    }
  }
}

/** Whether a restore status is terminal (no further state changes expected). */
export function isTerminal(status: RestoreStatus): boolean {
  return TERMINAL_RESTORE_STATUSES.includes(status);
}
