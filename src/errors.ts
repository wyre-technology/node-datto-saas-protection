/**
 * Custom error classes for the Datto SaaS Protection client.
 */

/**
 * Base error class for all Datto SaaS Protection errors.
 */
export class DattoSaasProtectionError extends Error {
  /** HTTP status code (0 for non-HTTP failures). */
  readonly statusCode: number;
  /** Raw response body, if available. */
  readonly response: unknown;

  constructor(message: string, statusCode: number = 0, response?: unknown) {
    super(message);
    this.name = 'DattoSaasProtectionError';
    this.statusCode = statusCode;
    this.response = response;
    Object.setPrototypeOf(this, DattoSaasProtectionError.prototype);
  }
}

/**
 * Authentication error (401 unauthorized).
 *
 * Note: a region mismatch (US key calling EU endpoint or vice versa) is also
 * surfaced as a generic 401 by the upstream API. The error message includes a
 * hint to verify the configured region.
 */
export class DattoSaasProtectionAuthenticationError extends DattoSaasProtectionError {
  constructor(message: string, statusCode: number = 401, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'DattoSaasProtectionAuthenticationError';
    Object.setPrototypeOf(this, DattoSaasProtectionAuthenticationError.prototype);
  }
}

/**
 * Forbidden (403) — API key is valid but out of scope for the requested client.
 */
export class DattoSaasProtectionForbiddenError extends DattoSaasProtectionError {
  constructor(message: string, response?: unknown) {
    super(message, 403, response);
    this.name = 'DattoSaasProtectionForbiddenError';
    Object.setPrototypeOf(this, DattoSaasProtectionForbiddenError.prototype);
  }
}

/**
 * Resource not found (404).
 */
export class DattoSaasProtectionNotFoundError extends DattoSaasProtectionError {
  constructor(message: string, response?: unknown) {
    super(message, 404, response);
    this.name = 'DattoSaasProtectionNotFoundError';
    Object.setPrototypeOf(this, DattoSaasProtectionNotFoundError.prototype);
  }
}

/**
 * Conflict (409) — typically returned when a restore is already queued for the seat.
 */
export class DattoSaasProtectionConflictError extends DattoSaasProtectionError {
  constructor(message: string, response?: unknown) {
    super(message, 409, response);
    this.name = 'DattoSaasProtectionConflictError';
    Object.setPrototypeOf(this, DattoSaasProtectionConflictError.prototype);
  }
}

/**
 * Rate limit exceeded (429).
 */
export class DattoSaasProtectionRateLimitError extends DattoSaasProtectionError {
  /** Suggested retry delay in milliseconds (parsed from Retry-After). */
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 5000, response?: unknown) {
    super(message, 429, response);
    this.name = 'DattoSaasProtectionRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, DattoSaasProtectionRateLimitError.prototype);
  }
}

/**
 * Server error (500-503).
 */
export class DattoSaasProtectionServerError extends DattoSaasProtectionError {
  constructor(message: string, statusCode: number = 500, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'DattoSaasProtectionServerError';
    Object.setPrototypeOf(this, DattoSaasProtectionServerError.prototype);
  }
}
