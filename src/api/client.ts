/**
 * Authenticated HTTP client.
 *
 * Wraps the base HTTP helpers and:
 *  1. Injects the stored access token as a Bearer header.
 *  2. On 401, attempts a single token refresh then retries the original request.
 *  3. On refresh failure, clears tokens (forces re-login).
 *
 * Import `authenticatedGet/Post/Put/Patch/Delete` for protected endpoints.
 */
import { env } from '../config/env';
import { ApiError, extractErrorMessage } from './errors';
import { tokenStorage } from '../storage/tokenStorage';
import type { ApiRequestOptions } from './types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const base = env.apiBaseUrl.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ─── Token refresh ────────────────────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const url = resolveUrl('/auth/refresh-token');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await tokenStorage.clearTokens();
    throw new ApiError('Token refresh failed', { status: res.status, url });
  }

  const body = await parseBody<{ data: { accessToken: string; refreshToken: string } }>(res);
  await tokenStorage.setTokens(body.data.accessToken, body.data.refreshToken);
  return body.data.accessToken;
}

/** Deduplicated refresh — concurrent requests share one refresh call. */
async function refreshOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ─── Core authenticated request ───────────────────────────────────────────────

async function authenticatedRequest<T>(
  method: HttpMethod,
  endpoint: string,
  options?: ApiRequestOptions,
  isRetry = false,
): Promise<T> {
  const url = resolveUrl(endpoint);
  const accessToken = await tokenStorage.getAccessToken();

  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options?.headers,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  const init: RequestInit = { method, headers, signal: options?.signal };

  const methodAllowsBody = method !== 'GET';
  if (options?.body !== undefined && methodAllowsBody) {
    if (options.body instanceof FormData) {
      headers.delete('Content-Type'); // let the browser set multipart boundary
      init.body = options.body;
    } else {
      init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, init);

  // Auto-refresh on 401 (once)
  if (res.status === 401 && !isRetry) {
    try {
      await refreshOnce();
      return authenticatedRequest<T>(method, endpoint, options, true);
    } catch {
      throw new ApiError('Session expired. Please sign in again.', { status: 401, url });
    }
  }

  if (!res.ok) {
    let errBody: unknown;
    try { errBody = await parseBody<unknown>(res); } catch { errBody = undefined; }
    const message = extractErrorMessage(errBody, `HTTP ${res.status} ${res.statusText}`);
    throw new ApiError(message, {
      status: res.status,
      url,
      body: errBody,
    });
  }

  return parseBody<T>(res);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function authenticatedGet<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return authenticatedRequest<T>('GET', endpoint, options);
}

export function authenticatedPost<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return authenticatedRequest<T>('POST', endpoint, options);
}

export function authenticatedPut<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return authenticatedRequest<T>('PUT', endpoint, options);
}

export function authenticatedPatch<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return authenticatedRequest<T>('PATCH', endpoint, options);
}

export function authenticatedDelete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return authenticatedRequest<T>('DELETE', endpoint, options);
}
