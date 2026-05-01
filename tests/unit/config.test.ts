import { describe, it, expect } from 'vitest';
import {
  resolveConfig,
  REGION_BASE_URLS,
  DEFAULT_REGION,
  DEFAULT_RATE_LIMIT_CONFIG,
} from '../../src/config.js';

describe('resolveConfig', () => {
  it('throws when apiKey is missing', () => {
    // @ts-expect-error testing invalid input
    expect(() => resolveConfig({})).toThrow(/apiKey/);
  });

  it('defaults region to "us"', () => {
    const cfg = resolveConfig({ apiKey: 'k' });
    expect(cfg.region).toBe(DEFAULT_REGION);
    expect(cfg.region).toBe('us');
    expect(cfg.apiUrl).toBe(REGION_BASE_URLS.us);
  });

  it('resolves the EU base URL when region: "eu"', () => {
    const cfg = resolveConfig({ apiKey: 'k', region: 'eu' });
    expect(cfg.apiUrl).toBe(REGION_BASE_URLS.eu);
  });

  it('rejects unsupported regions', () => {
    // @ts-expect-error invalid region literal
    expect(() => resolveConfig({ apiKey: 'k', region: 'apac' })).toThrow(/region/);
  });

  it('apiUrl override takes precedence over region', () => {
    const cfg = resolveConfig({
      apiKey: 'k',
      region: 'us',
      apiUrl: 'https://staging.example.com/api/v1/',
    });
    expect(cfg.apiUrl).toBe('https://staging.example.com/api/v1');
  });

  it('merges rateLimit overrides on top of defaults', () => {
    const cfg = resolveConfig({ apiKey: 'k', rateLimit: { maxRequests: 30 } });
    expect(cfg.rateLimit.maxRequests).toBe(30);
    expect(cfg.rateLimit.maxConcurrency).toBe(DEFAULT_RATE_LIMIT_CONFIG.maxConcurrency);
  });
});
