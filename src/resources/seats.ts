/**
 * Seat (mailbox / OneDrive / SharePoint / Google user) operations.
 */

import type { HttpClient } from '../http.js';
import type { SaasProtectionSeat, SeatListParams } from '../types/seats.js';
import {
  PaginatedIterable,
  type PaginationParams,
  type PaginatedResponse,
  clampLimit,
} from '../pagination.js';

export class SeatsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  private path(clientId: string, domainId: string): string {
    return `/clients/${encodeURIComponent(clientId)}/domains/${encodeURIComponent(domainId)}/seats`;
  }

  /**
   * List seats for a domain (single page).
   *
   * By default only active seats are returned. Pass `includeArchived: true`
   * to include retained-but-deleted seats.
   */
  async list(
    clientId: string,
    domainId: string,
    params?: PaginationParams & SeatListParams
  ): Promise<PaginatedResponse<SaasProtectionSeat>> {
    const query: Record<string, string | number | boolean | undefined> = {
      limit: clampLimit(params?.limit),
    };
    if (params?.cursor) query['cursor'] = params.cursor;
    if (params?.includeArchived) query['includeArchived'] = true;
    return this.httpClient.get<PaginatedResponse<SaasProtectionSeat>>(
      this.path(clientId, domainId),
      query
    );
  }

  /** Iterate over every seat for a domain. */
  listAll(
    clientId: string,
    domainId: string,
    params?: PaginationParams & SeatListParams
  ): PaginatedIterable<SaasProtectionSeat> {
    const extra: Record<string, string | number | boolean | undefined> = {};
    if (params?.includeArchived) extra['includeArchived'] = true;
    return new PaginatedIterable<SaasProtectionSeat>(
      this.httpClient,
      this.path(clientId, domainId),
      params,
      extra
    );
  }

  /** Get a single seat by ID. */
  async get(seatId: string): Promise<SaasProtectionSeat> {
    return this.httpClient.get<SaasProtectionSeat>(`/seats/${encodeURIComponent(seatId)}`);
  }
}
