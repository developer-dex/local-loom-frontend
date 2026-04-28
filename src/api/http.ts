import { env } from '../config/env';
import { ApiError } from './errors';
import type { ApiRequestOptions, HttpMethod, QueryParams } from './types';

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

function appendQuery(url: string, query?: QueryParams): string {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

function resolveUrl(endpoint: string, query?: QueryParams): string {
  let full: string;
  if (/^https?:\/\//i.test(endpoint)) {
    full = endpoint;
  } else {
    const base = env.apiBaseUrl.replace(/\/$/, '');
    if (!base) {
      throw new Error(
        'Missing API base URL: set EXPO_PUBLIC_API_URL or pass an absolute https URL as `endpoint`.',
      );
    }
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    full = `${base}${path}`;
  }
  return appendQuery(full, query);
}

function hasJsonContentType(headers: Headers): boolean {
  const ct = headers.get('content-type');
  return ct != null && ct.includes('application/json');
}

async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  if (
    hasJsonContentType(res.headers) ||
    text.trimStart().startsWith('{') ||
    text.trimStart().startsWith('[')
  ) {
    return JSON.parse(text) as T;
  }
  return text as unknown as T;
}

async function request<T>(method: HttpMethod, endpoint: string, options?: ApiRequestOptions): Promise<T> {
  const url = resolveUrl(endpoint, options?.query);
  const headers = new Headers({ ...JSON_HEADERS, ...options?.headers });

  const init: RequestInit = {
    method,
    headers,
    signal: options?.signal,
  };

  const methodAllowsBody = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (options?.body !== undefined && methodAllowsBody) {
    init.body =
      typeof options.body === 'string' || options.body instanceof FormData
        ? (options.body as BodyInit)
        : JSON.stringify(options.body);
    if (options.body instanceof FormData) {
      headers.delete('Content-Type');
    }
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await parseBody<unknown>(res);
    } catch {
      errBody = undefined;
    }
    throw new ApiError(`HTTP ${res.status} ${res.statusText}`, {
      status: res.status,
      url,
      body: errBody,
    });
  }

  return parseBody<T>(res);
}

export function apiGet<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return request<T>('GET', endpoint, options);
}

export function apiPost<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return request<T>('POST', endpoint, options);
}

export function apiPut<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return request<T>('PUT', endpoint, options);
}

export function apiPatch<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return request<T>('PATCH', endpoint, options);
}

export function apiDelete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return request<T>('DELETE', endpoint, options);
}
