/**
 * Activity log operations.
 */

import type { HttpClient } from '../http.js';
import type { SaasProtectionActivityEntry } from '../types/activity.js';
import {
  PaginatedIterable,
  type PaginationParams,
  type PaginatedResponse,
  clampLimit,
} from '../pagination.js';

export class ActivityResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  private path(clientId: string): string {
    return `/clients/${encodeURIComponent(clientId)}/activity`;
  }

  /** List activity entries for a client (single page). */
  async list(
    clientId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<SaasProtectionActivityEntry>> {
    const query: Record<string, string | number | boolean | undefined> = {
      limit: clampLimit(params?.limit),
    };
    if (params?.cursor) query['cursor'] = params.cursor;
    return this.httpClient.get<PaginatedResponse<SaasProtectionActivityEntry>>(
      this.path(clientId),
      query
    );
  }

  /** Iterate over every activity entry for a client. */
  listAll(
    clientId: string,
    params?: PaginationParams
  ): PaginatedIterable<SaasProtectionActivityEntry> {
    return new PaginatedIterable<SaasProtectionActivityEntry>(
      this.httpClient,
      this.path(clientId),
      params
    );
  }
}
