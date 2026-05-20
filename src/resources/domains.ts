/**
 * Domain (M365 tenant / Google Workspace) operations.
 */

import type { HttpClient } from '../http.js';
import type { SaasProtectionDomain } from '../types/domains.js';
import {
  PaginatedIterable,
  type PaginationParams,
  type PaginatedResponse,
  clampLimit,
} from '../pagination.js';

export class DomainsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  private path(clientId: string): string {
    return `/clients/${encodeURIComponent(clientId)}/domains`;
  }

  /** List domains for a client (single page). */
  async list(
    clientId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<SaasProtectionDomain>> {
    const query: Record<string, string | number | boolean | undefined> = {
      limit: clampLimit(params?.limit),
    };
    if (params?.cursor != null && params.cursor !== '') query['cursor'] = params.cursor;
    return this.httpClient.get<PaginatedResponse<SaasProtectionDomain>>(this.path(clientId), query);
  }

  /** Iterate over every domain for a client. */
  listAll(clientId: string, params?: PaginationParams): PaginatedIterable<SaasProtectionDomain> {
    return new PaginatedIterable<SaasProtectionDomain>(this.httpClient, this.path(clientId), params);
  }
}
