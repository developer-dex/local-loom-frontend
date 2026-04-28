export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type ApiRequestOptions = {
  /** URL query string values (undefined / null keys are skipped). */
  query?: QueryParams;
  /** JSON body (objects are stringified). Ignored for GET. */
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};
