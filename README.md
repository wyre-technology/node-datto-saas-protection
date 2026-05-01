# @wyre-technology/node-datto-saas-protection

Comprehensive, fully-typed Node.js / TypeScript client library for the
[Datto SaaS Protection (Backupify) REST API](https://api.dattobackup.com/api/v1).

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

## Features

- Full coverage of SaaS Protection endpoints: clients, domains, seats, backups, restores, activity, license
- Bearer-token authentication
- Cursor-based pagination via async iterators
- Rate limiting tuned for the 60 req/min SaaS Protection limit, with concurrency capped at 4
- Async restore queue + poll helpers (`restores.queue`, `restores.get`, `restores.waitFor`)
- Typed error hierarchy with a region-mismatch hint baked into 401 messages
- ESM and CommonJS dual exports, full `.d.ts` types
- Zero `any` in the public API

## Install

```bash
npm install @wyre-technology/node-datto-saas-protection
```

The package is published to GitHub Packages under the `@wyre-technology` scope.
Add this to a project-local `.npmrc`:

```
@wyre-technology:registry=https://npm.pkg.github.com
```

## Quick start

```typescript
import { DattoSaasProtectionClient } from '@wyre-technology/node-datto-saas-protection';

const client = new DattoSaasProtectionClient({
  apiKey: process.env.DATTO_SAAS_API_KEY!,
  region: 'us', // or 'eu'
});

// Iterate every customer client, fetching pages on demand
for await (const customer of client.clients.listAll({ limit: 100 })) {
  console.log(customer.id, customer.name);
}
```

## Configuration

```typescript
new DattoSaasProtectionClient({
  apiKey: 'bearer-token',

  // Region selection — picks the regional base URL
  region: 'us', // 'us' | 'eu', default 'us'

  // Optional — override the base URL entirely (forward-compat)
  apiUrl: 'https://api.dattobackup.com/api/v1',

  // Optional — tune client-side rate limiting
  rateLimit: {
    enabled: true,
    maxRequests: 60,
    windowMs: 60_000,
    throttleThreshold: 0.8,
    retryAfterMs: 5_000,
    maxRetries: 3,
    maxConcurrency: 4,
  },
});
```

## Regions

Datto SaaS Protection is split across two regional control planes:

| Region | Base URL                                  |
| ------ | ----------------------------------------- |
| `us`   | `https://api.dattobackup.com/api/v1`      |
| `eu`   | `https://api.eu.dattobackup.com/api/v1`   |

> **Region stickiness**: an API key issued in one region cannot call the
> other region's endpoints. The upstream API surfaces this as a generic
> `401 Unauthorized` — the SDK includes a hint in
> `DattoSaasProtectionAuthenticationError.message` to verify the configured
> region matches the key.

## Pagination

Cursor-based:

```
GET /clients?limit=100
→ { items: [...], nextCursor: "abc123" }

GET /clients?limit=100&cursor=abc123
```

Default `limit` is 50, max is 250. Iteration stops automatically when
`nextCursor` is `null`.

```typescript
// Single page
const page = await client.clients.list({ limit: 100 });

// Async iterator across all pages
for await (const c of client.clients.listAll({ limit: 250 })) { /* ... */ }
```

## Restores: queue + poll workflow

Restores are asynchronous. Queue with `restores.queue`, then wait for the
restore to leave the `queued`/`running` state.

```typescript
const { restoreId } = await client.restores.queue('seat-123', {
  backupId: 'backup-789',
});

const final = await client.restores.waitFor(restoreId, {
  intervalMs: 30_000,    // default — do not poll faster
  timeoutMs: 60 * 60_000,
});

if (final.status === 'failed') {
  console.error('Restore failed:', final.error);
}
```

> **Workflow gotcha**: M365 restores into existing users require Graph API
> permissions on the target tenant. If those permissions are missing the
> upstream API does NOT reject at queue time — the restore is accepted,
> transitions to `running`, and then surfaces a `400` once it tries to write.
> Check `final.status === 'failed'` and `final.error` after `waitFor`.

## Archived seats

Seat list endpoints return only active seats by default. Pass
`includeArchived: true` to include retained-but-deleted seats:

```typescript
for await (const seat of client.seats.listAll(clientId, domainId, {
  includeArchived: true,
})) {
  // ...
}
```

## API surface

```typescript
client.clients.list(params)
client.clients.listAll(params)

client.domains.list(clientId, params)
client.domains.listAll(clientId, params)

client.seats.list(clientId, domainId, { includeArchived?, ...params })
client.seats.listAll(clientId, domainId, { includeArchived?, ...params })
client.seats.get(seatId)

client.backups.list(seatId, params)
client.backups.listAll(seatId, params)

client.restores.queue(seatId, payload)
client.restores.get(restoreId)
client.restores.waitFor(restoreId, { intervalMs?, timeoutMs? })

client.activity.list(clientId, params)
client.activity.listAll(clientId, params)

client.license.getUsage(clientId)
```

## Error handling

```typescript
import {
  DattoSaasProtectionError,
  DattoSaasProtectionAuthenticationError,
  DattoSaasProtectionForbiddenError,
  DattoSaasProtectionNotFoundError,
  DattoSaasProtectionConflictError,
  DattoSaasProtectionRateLimitError,
  DattoSaasProtectionServerError,
} from '@wyre-technology/node-datto-saas-protection';

try {
  await client.seats.get('seat-123');
} catch (err) {
  if (err instanceof DattoSaasProtectionAuthenticationError) {
    // Region mismatch? Wrong key? Read err.message for the hint.
  } else if (err instanceof DattoSaasProtectionConflictError) {
    // A restore is already queued for this seat
  } else if (err instanceof DattoSaasProtectionRateLimitError) {
    await new Promise((r) => setTimeout(r, err.retryAfter));
  }
}
```

## Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

## License

Apache-2.0
