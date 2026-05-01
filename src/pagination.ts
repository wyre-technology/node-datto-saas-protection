/**
 * Pagination utilities for the Datto SaaS Protection API.
 *
 * SaaS Protection list endpoints use cursor-based pagination. Responses have
 * shape:
 *
 *     { items: T[], nextCursor: string | null }
 *
 * Default limit is 50; maximum is 250. Iteration stops when `nextCursor` is
 * null, undefined, or an empty string.
 */

import type { HttpClient } from './http.js';

/** Default page size when none is specified. */
export const DEFAULT_PAGE_LIMIT = 50;
/** Maximum allowed page size. */
export const MAX_PAGE_LIMIT = 250;

/**
 * Pagination request parameters.
 */
export interface PaginationParams {
  /** Items per page (default 50, max 250). */
  limit?: number;
  /** Opaque cursor returned from a previous page. */
  cursor?: string;
}

/**
 * Generic cursor-paginated response shape.
 */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string | null;
}

/**
 * Async iterable over every item in a paginated endpoint, automatically
 * fetching subsequent pages as needed.
 */
export class PaginatedIterable<T> implements AsyncIterable<T> {
  private readonly httpClient: HttpClient;
  private readonly path: string;
  private readonly extraParams: Record<string, string | number | boolean | undefined>;
  private readonly limit: number;
  private readonly startCursor: string | undefined;

  constructor(
    httpClient: HttpClient,
    path: string,
    params: PaginationParams | undefined,
    extraParams?: Record<string, string | number | boolean | undefined>
  ) {
    this.httpClient = httpClient;
    this.path = path;
    this.extraParams = extraParams ?? {};
    this.limit = clampLimit(params?.limit);
    this.startCursor = params?.cursor;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let cursor: string | undefined = this.startCursor;
    while (true) {
      const params: Record<string, string | number | boolean | undefined> = {
        ...this.extraParams,
        limit: this.limit,
      };
      if (cursor !== undefined && cursor !== '') params['cursor'] = cursor;

      const response = await this.httpClient.get<PaginatedResponse<T>>(this.path, params);

      const items = response.items ?? [];
      for (const item of items) yield item;

      const next = response.nextCursor;
      if (next === null || next === undefined || next === '') return;
      cursor = next;
    }
  }

  /** Collect every item into an array. */
  async toArray(): Promise<T[]> {
    const out: T[] = [];
    for await (const item of this) out.push(item);
    return out;
  }
}

/** Clamp a requested limit into the valid range. */
export function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PAGE_LIMIT;
  if (limit < 1) return 1;
  if (limit > MAX_PAGE_LIMIT) return MAX_PAGE_LIMIT;
  return Math.floor(limit);
}
