import { describe, it, expect } from 'vitest';
import {
  DattoSaasProtectionError,
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionConflictError,
  DattoSaasProtectionRateLimitError,
  DattoSaasProtectionServerError,
} from '../../src/errors.js';

describe('error hierarchy', () => {
  it('all errors inherit from DattoSaasProtectionError', () => {
    expect(new DattoSaasProtectionAuthenticationError('x')).toBeInstanceOf(DattoSaasProtectionError);
    expect(new DattoSaasProtectionForbiddenError('x')).toBeInstanceOf(DattoSaasProtectionError);
    expect(new DattoSaasProtectionNotFoundError('x')).toBeInstanceOf(DattoSaasProtectionError);
    expect(new DattoSaasProtectionConflictError('x')).toBeInstanceOf(DattoSaasProtectionError);
    expect(new DattoSaasProtectionRateLimitError('x')).toBeInstanceOf(DattoSaasProtectionError);
    expect(new DattoSaasProtectionServerError('x')).toBeInstanceOf(DattoSaasProtectionError);
  });

  it('captures statusCode and response body', () => {
    const err = new DattoSaasProtectionNotFoundError('missing', { hint: 'check id' });
    expect(err.statusCode).toBe(404);
    expect(err.response).toEqual({ hint: 'check id' });
  });

  it('rate limit error exposes retryAfter ms', () => {
    const err = new DattoSaasProtectionRateLimitError('slow down', 7500);
    expect(err.retryAfter).toBe(7500);
    expect(err.statusCode).toBe(429);
  });

  it('conflict error defaults to 409', () => {
    const err = new DattoSaasProtectionConflictError('dup');
    expect(err.statusCode).toBe(409);
  });
});
