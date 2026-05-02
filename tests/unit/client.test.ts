import { describe, it, expect } from 'vitest';
import { DattoSaasProtectionClient } from '../../src/client.js';
import {
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionConflictError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionRateLimitError,
  DattoSaasProtectionServerError,
} from '../../src/errors.js';

function makeClient(
  overrides: Partial<ConstructorParameters<typeof DattoSaasProtectionClient>[0]> = {}
): DattoSaasProtectionClient {
  return new DattoSaasProtectionClient({
    apiKey: 'test-bearer',
    region: 'us',
    rateLimit: { maxRetries: 0, retryAfterMs: 1, enabled: false },
    ...overrides,
  });
}

describe('DattoSaasProtectionClient', () => {
  it('exposes all resource namespaces', () => {
    const c = makeClient();
    expect(c.clients).toBeDefined();
    expect(c.domains).toBeDefined();
    expect(c.seats).toBeDefined();
    expect(c.backups).toBeDefined();
    expect(c.restores).toBeDefined();
    expect(c.activity).toBeDefined();
    expect(c.license).toBeDefined();
  });

  it('uses the US base URL by default', () => {
    const c = makeClient();
    expect(c.getConfig().apiUrl).toBe('https://api.datto.com/api/v1');
  });

  it('uses the EU base URL when region: "eu"', async () => {
    const c = makeClient({ region: 'eu' });
    expect(c.getConfig().apiUrl).toBe('https://api.eu.datto.com/api/v1');
    const page = await c.clients.list({ limit: 50 });
    expect(page.items[0]?.id).toBe('eu-1');
  });

  it('lists clients (single page)', async () => {
    const c = makeClient();
    const page = await c.clients.list({ limit: 50 });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe('page-2');
  });

  it('iterates clients across cursors with listAll', async () => {
    const c = makeClient();
    const ids: string[] = [];
    for await (const cust of c.clients.listAll({ limit: 50 })) {
      ids.push(cust.id);
    }
    expect(ids).toEqual(['c1', 'c2', 'c3']);
  });

  it('lists domains, backups, activity, and gets a seat / usage', async () => {
    const c = makeClient();
    expect((await c.domains.list('c1')).items).toHaveLength(1);
    expect((await c.backups.list('s1')).items).toHaveLength(2);
    expect((await c.activity.list('c1')).items).toHaveLength(1);
    expect(await c.seats.get('s1')).toMatchObject({ id: 's1', email: 'a@acme.com' });
    expect(await c.license.getUsage('c1')).toMatchObject({ usedSeats: 42 });
  });

  it('lists seats without archived by default', async () => {
    const c = makeClient();
    const page = await c.seats.list('c1', 'd1');
    expect(page.items).toHaveLength(2);
    expect(page.items.every((s) => !s.archived)).toBe(true);
  });

  it('includes archived seats when includeArchived: true', async () => {
    const c = makeClient();
    const page = await c.seats.list('c1', 'd1', { includeArchived: true });
    expect(page.items).toHaveLength(3);
    expect(page.items.some((s) => s.archived === true)).toBe(true);
  });

  it('queues a restore and returns the queued status', async () => {
    const c = makeClient();
    const queued = await c.restores.queue('s1', { backupId: 'b1' });
    expect(queued.restoreId).toMatch(/^r-/);
    expect(queued.status).toBe('queued');
  });

  it('polls a restore to completion via waitFor', async () => {
    const c = makeClient();
    const { restoreId } = await c.restores.queue('s1', { backupId: 'b1' });
    const final = await c.restores.waitFor(restoreId, {
      intervalMs: 1,
      sleep: () => Promise.resolve(),
    });
    expect(final.status).toBe('completed');
  });

  it('times out waitFor when the restore never reaches a terminal status', async () => {
    const c = makeClient();
    // Use a non-existent restore so polling 404s — but actually that would throw a different error.
    // Instead, simulate by overriding now() to advance past timeout immediately.
    const { restoreId } = await c.restores.queue('s1', { backupId: 'b1' });
    let nowVal = 0;
    await expect(
      c.restores.waitFor(restoreId, {
        intervalMs: 1,
        timeoutMs: 10,
        now: () => {
          // First call returns 0 (start), subsequent calls return 100 to force timeout
          const v = nowVal;
          nowVal = 100;
          return v;
        },
        sleep: () => Promise.resolve(),
      })
    ).rejects.toThrow(/Timed out/);
  });

  it('maps 404 to DattoSaasProtectionNotFoundError', async () => {
    const c = makeClient();
    await expect(c.license.getUsage('MISSING')).rejects.toBeInstanceOf(DattoSaasProtectionNotFoundError);
  });

  it('maps 401 with region-mismatch hint in the message', async () => {
    const c = makeClient();
    const err = await c.license.getUsage('UNAUTH').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DattoSaasProtectionAuthenticationError);
    const message = (err as Error).message;
    expect(message).toMatch(/region/i);
    expect(message).toMatch(/"us"/);
  });

  it('maps 403 to DattoSaasProtectionForbiddenError', async () => {
    const c = makeClient();
    await expect(c.license.getUsage('FORBIDDEN')).rejects.toBeInstanceOf(DattoSaasProtectionForbiddenError);
  });

  it('maps 409 to DattoSaasProtectionConflictError when restore already queued', async () => {
    const c = makeClient();
    await expect(c.restores.queue('seat-conflict', { backupId: 'b1' })).rejects.toBeInstanceOf(
      DattoSaasProtectionConflictError
    );
  });

  it('maps 429 (after retries exhausted) to DattoSaasProtectionRateLimitError', async () => {
    const c = makeClient();
    await expect(c.license.getUsage('RATE_LIMITED')).rejects.toBeInstanceOf(
      DattoSaasProtectionRateLimitError
    );
  });

  it('maps 500 to DattoSaasProtectionServerError after one retry', async () => {
    const c = makeClient();
    await expect(c.license.getUsage('SERVER_ERROR')).rejects.toBeInstanceOf(
      DattoSaasProtectionServerError
    );
  });

  it('sends the Authorization: Bearer header (verified via successful list call)', async () => {
    // The handlers do not assert on the header, so this is a smoke test —
    // a missing header would fail unauthenticated against a real server.
    const c = makeClient();
    const page = await c.clients.list();
    expect(page.items.length).toBeGreaterThan(0);
  });
});
