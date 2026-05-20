/**
 * Backup / restore-point operations.
 */

import type { HttpClient } from '../http.js';
import type { SaasProtectionBackup } from '../types/backups.js';
import {
  PaginatedIterable,
  type PaginationParams,
  type PaginatedResponse,
  clampLimit,
} from '../pagination.js';

export class BackupsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  private path(seatId: string): string {
    return `/seats/${encodeURIComponent(seatId)}/backups`;
  }

  /** List backups for a seat (single page). */
  async list(
    seatId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<SaasProtectionBackup>> {
    const query: Record<string, string | number | boolean | undefined> = {
      limit: clampLimit(params?.limit),
    };
    if (params?.cursor != null && params.cursor !== '') query['cursor'] = params.cursor;
    return this.httpClient.get<PaginatedResponse<SaasProtectionBackup>>(this.path(seatId), query);
  }

  /** Iterate over every backup for a seat. */
  listAll(seatId: string, params?: PaginationParams): PaginatedIterable<SaasProtectionBackup> {
    return new PaginatedIterable<SaasProtectionBackup>(this.httpClient, this.path(seatId), params);
  }
}
