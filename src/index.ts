/**
 * @wyre-ai/node-datto-saas-protection
 *
 * Comprehensive, fully-typed Node.js/TypeScript client library for the
 * Datto SaaS Protection (Backupify) REST API.
 */

// Main client
export { DattoSaasProtectionClient } from './client.js';

// Configuration
export type {
  DattoSaasProtectionConfig,
  DattoSaasProtectionRegion,
  RateLimitConfig,
  ResolvedConfig,
} from './config.js';
export {
  DEFAULT_REGION,
  DEFAULT_RATE_LIMIT_CONFIG,
  REGION_BASE_URLS,
} from './config.js';

// Errors
export {
  DattoSaasProtectionError,
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionConflictError,
  DattoSaasProtectionRateLimitError,
  DattoSaasProtectionServerError,
} from './errors.js';

// HTTP helper (exported for advanced users / testing)
export { buildUrl } from './http.js';

// Pagination
export {
  PaginatedIterable,
  clampLimit,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from './pagination.js';
export type { PaginationParams, PaginatedResponse } from './pagination.js';

// Resource classes (for typing)
export { ClientsResource } from './resources/clients.js';
export { DomainsResource } from './resources/domains.js';
export { SeatsResource } from './resources/seats.js';
export { BackupsResource } from './resources/backups.js';
export {
  RestoresResource,
  DEFAULT_RESTORE_POLL_INTERVAL_MS,
  isTerminal,
} from './resources/restores.js';
export type { WaitForRestoreOptions } from './resources/restores.js';
export { ActivityResource } from './resources/activity.js';
export { LicenseResource } from './resources/license.js';

// Domain types
export * from './types/index.js';
