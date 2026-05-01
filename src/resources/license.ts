/**
 * License / usage operations.
 */

import type { HttpClient } from '../http.js';
import type { SaasProtectionUsage } from '../types/license.js';

export class LicenseResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** Get current seat usage / licensing for a client. */
  async getUsage(clientId: string): Promise<SaasProtectionUsage> {
    return this.httpClient.get<SaasProtectionUsage>(
      `/clients/${encodeURIComponent(clientId)}/usage`
    );
  }
}
