/**
 * Main Datto SaaS Protection client.
 */

import type { DattoSaasProtectionConfig, ResolvedConfig } from './config.js';
import { resolveConfig } from './config.js';
import { HttpClient } from './http.js';
import { RateLimiter } from './rate-limiter.js';
import { ClientsResource } from './resources/clients.js';
import { DomainsResource } from './resources/domains.js';
import { SeatsResource } from './resources/seats.js';
import { BackupsResource } from './resources/backups.js';
import { RestoresResource } from './resources/restores.js';
import { ActivityResource } from './resources/activity.js';
import { LicenseResource } from './resources/license.js';

/**
 * Datto SaaS Protection (Backupify) API client.
 *
 * @example
 * ```typescript
 * import { DattoSaasProtectionClient } from '@wyre-technology/node-datto-saas-protection';
 *
 * const client = new DattoSaasProtectionClient({
 *   apiKey: process.env.DATTO_SAAS_API_KEY!,
 *   region: 'us', // or 'eu'
 * });
 *
 * for await (const customer of client.clients.listAll()) {
 *   console.log(customer.id, customer.name);
 * }
 * ```
 */
export class DattoSaasProtectionClient {
  private readonly config: ResolvedConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly httpClient: HttpClient;

  /** Customer client (organization) operations. */
  readonly clients: ClientsResource;
  /** Domain (M365 tenant / Google domain) operations. */
  readonly domains: DomainsResource;
  /** Seat (mailbox / OneDrive / SharePoint / Google user) operations. */
  readonly seats: SeatsResource;
  /** Backup / restore-point operations. */
  readonly backups: BackupsResource;
  /** Restore (queue + poll) operations. */
  readonly restores: RestoresResource;
  /** Per-client activity log. */
  readonly activity: ActivityResource;
  /** License / seat-usage report. */
  readonly license: LicenseResource;

  constructor(config: DattoSaasProtectionConfig) {
    this.config = resolveConfig(config);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.httpClient = new HttpClient(this.config, this.rateLimiter);

    this.clients = new ClientsResource(this.httpClient);
    this.domains = new DomainsResource(this.httpClient);
    this.seats = new SeatsResource(this.httpClient);
    this.backups = new BackupsResource(this.httpClient);
    this.restores = new RestoresResource(this.httpClient);
    this.activity = new ActivityResource(this.httpClient);
    this.license = new LicenseResource(this.httpClient);
  }

  /** Get the resolved configuration. */
  getConfig(): Readonly<ResolvedConfig> {
    return this.config;
  }
}
