/**
 * Configuration types and defaults for the Datto SaaS Protection client.
 */

/**
 * Supported deployment regions.
 *
 * Datto SaaS Protection (Backupify) is split across two regional control
 * planes. An API key issued in one region cannot call the other region's
 * endpoints.
 */
export type DattoSaasProtectionRegion = 'us' | 'eu';

/**
 * Per-region base URLs.
 */
export const REGION_BASE_URLS: Readonly<Record<DattoSaasProtectionRegion, string>> = {
  us: 'https://api.dattobackup.com/api/v1',
  eu: 'https://api.eu.dattobackup.com/api/v1',
};

/** Default region if none is supplied. */
export const DEFAULT_REGION: DattoSaasProtectionRegion = 'us';

/**
 * Rate limiting configuration.
 *
 * Datto SaaS Protection enforces 60 requests/minute per API key. The defaults
 * here are intentionally conservative (cap concurrency at 4 in practice) and
 * back off aggressively on 429.
 */
export interface RateLimitConfig {
  /** Whether rate limiting is enabled (default: true) */
  enabled: boolean;
  /** Maximum requests per window (default: 60) */
  maxRequests: number;
  /** Window duration in milliseconds (default: 60000) */
  windowMs: number;
  /** Threshold percentage to start throttling (default: 0.8 = 80%) */
  throttleThreshold: number;
  /** Default delay between retries on 429 (default: 5000ms) */
  retryAfterMs: number;
  /** Maximum retry attempts on rate limit errors (default: 3) */
  maxRetries: number;
  /** Maximum concurrent in-flight requests (default: 4) */
  maxConcurrency: number;
}

/**
 * Default rate limit configuration tuned for Datto SaaS Protection (60/min).
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: true,
  maxRequests: 60,
  windowMs: 60_000,
  throttleThreshold: 0.8,
  retryAfterMs: 5_000,
  maxRetries: 3,
  maxConcurrency: 4,
};

/**
 * Configuration for the Datto SaaS Protection client.
 */
export interface DattoSaasProtectionConfig {
  /** Bearer API key issued from the SaaS Protection partner portal. */
  apiKey: string;
  /** Region to target (default: "us"). */
  region?: DattoSaasProtectionRegion;
  /**
   * Override the API base URL. When set, this takes precedence over `region`.
   * Provided for forward-compatibility with future regions.
   */
  apiUrl?: string;
  /** Rate limiting configuration overrides. */
  rateLimit?: Partial<RateLimitConfig>;
}

/**
 * Resolved configuration with defaults applied.
 */
export interface ResolvedConfig {
  apiKey: string;
  region: DattoSaasProtectionRegion;
  apiUrl: string;
  rateLimit: RateLimitConfig;
}

/**
 * Resolve a {@link DattoSaasProtectionConfig} by applying defaults.
 */
export function resolveConfig(config: DattoSaasProtectionConfig): ResolvedConfig {
  if (!config.apiKey) {
    throw new Error('apiKey must be provided');
  }
  const region = config.region ?? DEFAULT_REGION;
  if (region !== 'us' && region !== 'eu') {
    throw new Error(`Unsupported region: ${String(region)} (expected "us" or "eu")`);
  }
  const baseFromRegion = REGION_BASE_URLS[region];
  const apiUrl = (config.apiUrl ?? baseFromRegion).replace(/\/+$/, '');
  return {
    apiKey: config.apiKey,
    region,
    apiUrl,
    rateLimit: {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      ...config.rateLimit,
    },
  };
}
