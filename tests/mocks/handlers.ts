/**
 * MSW handlers mocking the Datto SaaS Protection API.
 *
 * Both regional base URLs are mocked so we can verify region resolution.
 */

import { http, HttpResponse } from 'msw';

const US = 'https://api.datto.com/api/v1';
const EU = 'https://api.eu.datto.com/api/v1';

interface RestoreRecord {
  id: string;
  seatId: string;
  status: string;
  pollsRemainingBeforeTerminal: number;
  terminalStatus: string;
  error?: string;
}

const restores = new Map<string, RestoreRecord>();

export function resetMockState(): void {
  restores.clear();
}

export const handlers = [
  // ---------- US ----------

  // Clients — paginated across two pages
  http.get(`${US}/clients`, ({ request }) => {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    if (!cursor) {
      return HttpResponse.json({
        items: [
          { id: 'c1', name: 'Acme Co' },
          { id: 'c2', name: 'Beta Inc' },
        ],
        nextCursor: 'page-2',
      });
    }
    if (cursor === 'page-2') {
      return HttpResponse.json({
        items: [{ id: 'c3', name: 'Gamma LLC' }],
        nextCursor: null,
      });
    }
    return HttpResponse.json({ items: [], nextCursor: null });
  }),

  // Domains
  http.get(`${US}/clients/c1/domains`, () =>
    HttpResponse.json({
      items: [{ id: 'd1', clientId: 'c1', name: 'acme.com', provider: 'm365' }],
      nextCursor: null,
    })
  ),

  // Seats — supports includeArchived
  http.get(`${US}/clients/c1/domains/d1/seats`, ({ request }) => {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const items: Array<{
      id: string;
      domainId: string;
      clientId: string;
      type: string;
      email: string;
      archived?: boolean;
    }> = [
      { id: 's1', domainId: 'd1', clientId: 'c1', type: 'mailbox', email: 'a@acme.com' },
      { id: 's2', domainId: 'd1', clientId: 'c1', type: 'mailbox', email: 'b@acme.com' },
    ];
    if (includeArchived) {
      items.push({
        id: 's-archived',
        domainId: 'd1',
        clientId: 'c1',
        type: 'mailbox',
        email: 'gone@acme.com',
        archived: true,
      });
    }
    return HttpResponse.json({ items, nextCursor: null });
  }),

  http.get(`${US}/seats/s1`, () =>
    HttpResponse.json({
      id: 's1',
      domainId: 'd1',
      clientId: 'c1',
      type: 'mailbox',
      email: 'a@acme.com',
    })
  ),

  // Backups
  http.get(`${US}/seats/s1/backups`, () =>
    HttpResponse.json({
      items: [
        { id: 'b1', seatId: 's1', startedAt: '2025-04-30T00:00:00Z', status: 'success' },
        { id: 'b2', seatId: 's1', startedAt: '2025-04-29T00:00:00Z', status: 'success' },
      ],
      nextCursor: null,
    })
  ),

  // Restores — POST queues
  http.post(`${US}/seats/:seatId/restores`, async ({ params }) => {
    const seatId = String(params['seatId']);
    if (seatId === 'seat-conflict') {
      return HttpResponse.json(
        { message: 'Restore already in progress for seat' },
        { status: 409 }
      );
    }
    const id = `r-${Math.random().toString(36).slice(2, 8)}`;
    restores.set(id, {
      id,
      seatId,
      status: 'queued',
      pollsRemainingBeforeTerminal: 1,
      terminalStatus: 'completed',
    });
    return HttpResponse.json({ id, seatId, status: 'queued' });
  }),

  // Restores — GET polls
  http.get(`${US}/restores/:restoreId`, ({ params }) => {
    const restoreId = String(params['restoreId']);
    const rec = restores.get(restoreId);
    if (!rec) {
      return HttpResponse.json({ message: 'Restore not found' }, { status: 404 });
    }
    if (rec.pollsRemainingBeforeTerminal > 0) {
      rec.pollsRemainingBeforeTerminal -= 1;
      rec.status = 'running';
    } else {
      rec.status = rec.terminalStatus;
    }
    return HttpResponse.json({ ...rec });
  }),

  // Activity
  http.get(`${US}/clients/c1/activity`, () =>
    HttpResponse.json({
      items: [{ id: 'a1', clientId: 'c1', timestamp: '2025-04-30T00:00:00Z', type: 'backup' }],
      nextCursor: null,
    })
  ),

  // License
  http.get(`${US}/clients/c1/usage`, () =>
    HttpResponse.json({ clientId: 'c1', licensedSeats: 100, usedSeats: 42 })
  ),

  // Error fixtures
  http.get(`${US}/clients/UNAUTH`, () =>
    HttpResponse.json({ message: 'unauthorized' }, { status: 401 })
  ),
  http.get(`${US}/clients/FORBIDDEN`, () =>
    HttpResponse.json({ message: 'forbidden' }, { status: 403 })
  ),
  http.get(`${US}/clients/MISSING`, () =>
    HttpResponse.json({ message: 'not found' }, { status: 404 })
  ),
  http.get(`${US}/clients/RATE_LIMITED`, () =>
    HttpResponse.json(
      { message: 'rate limited' },
      { status: 429, headers: { 'Retry-After': '0' } }
    )
  ),
  http.get(`${US}/clients/SERVER_ERROR`, () =>
    HttpResponse.json({ message: 'boom' }, { status: 500 })
  ),

  // Direct GET on /clients/<id> for error fixtures (not a real endpoint, used in tests)
  // The test calls the activity endpoint with the bogus id which 404s naturally;
  // but to keep things simple we use /clients/{id}/usage to provoke errors.
  http.get(`${US}/clients/UNAUTH/usage`, () =>
    HttpResponse.json({ message: 'unauthorized' }, { status: 401 })
  ),
  http.get(`${US}/clients/FORBIDDEN/usage`, () =>
    HttpResponse.json({ message: 'forbidden' }, { status: 403 })
  ),
  http.get(`${US}/clients/MISSING/usage`, () =>
    HttpResponse.json({ message: 'not found' }, { status: 404 })
  ),
  http.get(`${US}/clients/RATE_LIMITED/usage`, () =>
    HttpResponse.json(
      { message: 'rate limited' },
      { status: 429, headers: { 'Retry-After': '0' } }
    )
  ),
  http.get(`${US}/clients/SERVER_ERROR/usage`, () =>
    HttpResponse.json({ message: 'boom' }, { status: 500 })
  ),

  // ---------- EU ----------

  http.get(`${EU}/clients`, () =>
    HttpResponse.json({
      items: [{ id: 'eu-1', name: 'Euro Co' }],
      nextCursor: null,
    })
  ),
];
