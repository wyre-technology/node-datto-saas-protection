/**
 * Client (customer organization) operations.
 */

import type { HttpClient } from '../http.js';
import type { SaasProtectionClient } from '../types/clients.js';
import {
  PaginatedIterable,
  type PaginationParams,
  type PaginatedResponse,
  clampLimit,
} from '../pagination.js';

/**
 * Operations on customer clients.
 */
export class ClientsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List clients (single page). */
  async list(params?: PaginationParams): Promise<PaginatedResponse<SaasProtectionClient>> {
    const query: Record<string, string | number | boolean | undefined> = {
      limit: clampLimit(params?.limit),
    };
    if (params?.cursor != null && params.cursor !== '') query['cursor'] = params.cursor;
    return this.httpClient.get<PaginatedResponse<SaasProtectionClient>>('/clients', query);
  }

  /** Iterate over every client, fetching pages on demand. */
  listAll(params?: PaginationParams): PaginatedIterable<SaasProtectionClient> {
    return new PaginatedIterable<SaasProtectionClient>(this.httpClient, '/clients', params);
  }
}
