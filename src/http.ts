/**
 * HTTP layer for the Datto SaaS Protection API.
 *
 * Authentication is HTTP Basic with a public/secret key pair issued from the
 * SaaS Protection partner portal. Pagination is cursor-based (see
 * {@link ./pagination.ts}).
 */

import type { ResolvedConfig } from './config.js';
import type { RateLimiter } from './rate-limiter.js';
import {
  DattoSaasProtectionError,
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionConflictError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionRateLimitError,
  DattoSaasProtectionServerError,
} from './errors.js';

/**
 * Options for an HTTP request.
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Authenticated HTTP client for the Datto SaaS Protection API.
 */
export class HttpClient {
  private readonly config: ResolvedConfig;
  private readonly rateLimiter: RateLimiter;

  constructor(config: ResolvedConfig, rateLimiter: RateLimiter) {
    this.config = config;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Make an authenticated request.
   *
   * @param path - API path beginning with "/", relative to the configured base URL
   *               (e.g. "/clients").
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;
    const url = buildUrl(this.config.apiUrl, path, params);
    const bodyString = body === undefined ? '' : JSON.stringify(body);
    return this.executeRequest<T>(url, method, bodyString, 0);
  }

  /** Make a JSON GET. */
  async get<T>(path: string, params?: RequestOptions['params']): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  /** Make a JSON POST. */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  private async executeRequest<T>(
    url: string,
    method: string,
    bodyString: string,
    retryCount: number
  ): Promise<T> {
    await this.rateLimiter.waitForSlot();

    const basic = Buffer.from(
      `${this.config.publicKey}:${this.config.secretKey}`,
      'utf8',
    ).toString('base64');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    };
    if (bodyString) headers['Content-Type'] = 'application/json';

    this.rateLimiter.recordRequest();

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: bodyString || undefined,
      });
    } finally {
      this.rateLimiter.release();
    }

    return this.handleResponse<T>(response, url, method, bodyString, retryCount);
  }

  private async handleResponse<T>(
    response: Response,
    url: string,
    method: string,
    bodyString: string,
    retryCount: number
  ): Promise<T> {
    if (response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }
      const text = await response.text();
      return (text === '' ? ({} as T) : (text as unknown as T));
    }

    let responseBody: unknown;
    try {
      responseBody = await response.clone().json();
    } catch {
      try {
        responseBody = await response.text();
      } catch {
        responseBody = undefined;
      }
    }

    switch (response.status) {
      case 401:
        throw new DattoSaasProtectionAuthenticationError(
          `Authentication failed (401). Verify the API key is correct AND that the configured region (currently "${this.config.region}") matches the region where the key was issued — a US key cannot call EU endpoints (and vice versa) and the upstream API surfaces that as a generic 401.`,
          401,
          responseBody
        );
      case 403:
        throw new DattoSaasProtectionForbiddenError(
          'Access forbidden — API key is out of scope for this client/resource',
          responseBody
        );
      case 404:
        throw new DattoSaasProtectionNotFoundError('Resource not found', responseBody);
      case 409:
        throw new DattoSaasProtectionConflictError(
          'Conflict (409) — a restore may already be queued for this seat',
          responseBody
        );
      case 429: {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        if (this.rateLimiter.shouldRetry(retryCount)) {
          const delay = this.rateLimiter.calculateRetryDelay(retryCount, retryAfterSeconds);
          await this.sleep(delay);
          return this.executeRequest<T>(url, method, bodyString, retryCount + 1);
        }
        throw new DattoSaasProtectionRateLimitError(
          'Rate limit exceeded and max retries reached',
          (retryAfterSeconds ?? 5) * 1000,
          responseBody
        );
      }
      default:
        if (response.status >= 500 && response.status <= 599) {
          if (retryCount === 0) {
            await this.sleep(1000);
            return this.executeRequest<T>(url, method, bodyString, 1);
          }
          throw new DattoSaasProtectionServerError(
            `Server error: ${response.status} ${response.statusText}`,
            response.status,
            responseBody
          );
        }
        throw new DattoSaasProtectionError(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          responseBody
        );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Build a full URL from a base URL, path, and optional query params.
 * Skips parameters whose value is `undefined`.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const base = `${baseUrl}${path}`;
  if (!params) return base;
  const search = new URLSearchParams();
  let any = false;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.append(key, String(value));
    any = true;
  }
  return any ? `${base}?${search.toString()}` : base;
}
