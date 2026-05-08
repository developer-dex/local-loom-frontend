export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body?: unknown;

  constructor(message: string, init: { status: number; url: string; body?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = init.status;
    this.url = init.url;
    this.body = init.body;
  }
}

/**
 * Extracts a human-readable message from an API error response body.
 * The server always returns `{ success: false, message: "..." }` on errors.
 * Falls back to the HTTP status line if no message is present.
 */
export function extractErrorMessage(
  body: unknown,
  fallback: string,
): string {
  if (
    body !== null &&
    typeof body === 'object' &&
    'message' in body &&
    typeof (body as Record<string, unknown>).message === 'string' &&
    ((body as Record<string, unknown>).message as string).trim() !== ''
  ) {
    return (body as Record<string, unknown>).message as string;
  }
  return fallback;
}
