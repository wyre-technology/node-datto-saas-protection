/**
 * Vitest test setup.
 */
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server.js';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
