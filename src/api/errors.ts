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
