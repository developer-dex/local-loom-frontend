/**
 * Chat module error mapping and diagnostic logging.
 *
 * Two helpers:
 *
 *  - {@link mapApiError} converts any error thrown by the chat REST or socket
 *    transports (or surfaced from local validation) into the documented
 *    {@link ChatErrorOutcome} union, which the rest of the chat module
 *    branches on for UX handling and logging.
 *
 *  - {@link logChatError} writes an outcome through the diagnostic logger
 *    with a redacting walker that removes auth tokens and local URIs before
 *    they ever reach the sink.
 *
 * Design references: design.md "Error Handling" / "Logging" sections.
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8.
 */

import type { ChatErrorCode } from './chatTypes';
import { ApiError, extractErrorMessage } from './errors';
import { extractChatErrorCode } from './chatHelpers';

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Where the error originated. Drives both UX (e.g. inline vs banner) and the
 * log line so support tooling can correlate a frontend report with a server
 * trace.
 *
 *  - `rest`         — thrown by `authenticated{Get,Post,...}` / `ApiError`.
 *  - `socket-ack`   — `chat:send-message` / `chat:mark-read` ack with
 *                     `success: false`.
 *  - `socket-event` — server-pushed `error` event on the socket
 *                     (e.g. `CHAT_AUTOSUBSCRIBE_FAILED`, `CHAT_JOIN_FORBIDDEN`).
 *  - `client`       — local validation or payload-size rejection (no network
 *                     call ever issued).
 *  - `auth`         — escalated 401 after refresh + retry, or a socket
 *                     handshake auth failure.
 */
export type ChatErrorSource =
  | 'rest'
  | 'socket-ack'
  | 'socket-event'
  | 'client'
  | 'auth';

/**
 * Canonical error outcome handed to the UI layer and the logger. Always
 * carries enough information to render a user-facing message and (for
 * diagnostics) classify the failure without re-inspecting the original error.
 */
export type ChatErrorOutcome = {
  source: ChatErrorSource;
  /**
   * The most specific code we could derive. Falls back to:
   *  - `'CLIENT_VALIDATION'` for client-side rejections, and
   *  - `'UNKNOWN'` for transport / unparseable errors.
   */
  code: ChatErrorCode | 'CLIENT_VALIDATION' | 'UNKNOWN';
  /** Human-readable message suitable for direct display. */
  message: string;
  /** HTTP status when {@link source} is `'rest'`. */
  status?: number;
  /**
   * Optional structured payload — mirrors the server `errors` array, the raw
   * ack body, etc. The {@link logChatError} redactor walks this tree before
   * forwarding it to the diagnostic sink.
   */
  details?: Record<string, unknown>;
};

// ─── mapApiError ─────────────────────────────────────────────────────────────

/**
 * Loose description of an `ApiError.body` envelope (we read both the chat
 * server's documented shape and the legacy `code` echo on socket-ack errors).
 */
type ErrorBody = {
  message?: unknown;
  errors?: unknown;
  code?: unknown;
};

/**
 * Best-effort recovery of a human-readable message from the server response.
 * Falls back to the `Error.message` and finally to a generic transport
 * message so the UI never has an empty banner.
 */
function pickMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return extractErrorMessage(err.body, err.message || fallback);
  }
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim().length > 0) return m;
  }
  return fallback;
}

/** Pulls the server-supplied `errors` array off an envelope when present. */
function pickErrorsArray(body: unknown): string[] | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const arr = (body as ErrorBody).errors;
  if (!Array.isArray(arr)) return undefined;
  const filtered = arr.filter((e): e is string => typeof e === 'string');
  return filtered.length > 0 ? filtered : undefined;
}

/**
 * Converts an arbitrary error into a {@link ChatErrorOutcome} tagged with
 * the supplied {@link ChatErrorSource}.
 *
 * - For `ApiError` instances the HTTP `status` is preserved and the code is
 *   derived via {@link extractChatErrorCode}; the response `errors` array
 *   (when present) is attached to `details` for diagnostic log forwarding.
 * - For socket ack / event objects of shape `{ code, message }` the `code`
 *   field is propagated when it matches the documented chat union.
 * - For local validation rejections (`source === 'client'`) the code is
 *   `'CLIENT_VALIDATION'` unless the caller already supplied a more
 *   specific one in `err.code`.
 * - All other inputs degrade to `'UNKNOWN'`.
 */
export function mapApiError(
  err: unknown,
  source: ChatErrorSource,
): ChatErrorOutcome {
  // 1. REST / ApiError path.
  if (err instanceof ApiError) {
    const code = extractChatErrorCode(err) ?? 'UNKNOWN';
    const message = pickMessage(err, defaultRestMessage(err.status));
    const errors = pickErrorsArray(err.body);
    const outcome: ChatErrorOutcome = {
      source,
      code,
      message,
      status: err.status,
    };
    if (errors) {
      outcome.details = { errors };
    }
    return outcome;
  }

  // 2. Socket ack / event path. These arrive as plain objects, often shaped
  //    `{ code: 'CHAT_RATE_LIMITED', message: '...' }` or wrapped as
  //    `{ error: { code, message } }`.
  if (err && typeof err === 'object') {
    // Some callers hand us the full ack envelope (`{ success, error }`).
    const wrapped = (err as { error?: unknown }).error;
    const candidate =
      wrapped && typeof wrapped === 'object' ? (wrapped as ErrorBody) : (err as ErrorBody);

    const code = extractChatErrorCode(candidate);
    if (code !== null) {
      return {
        source,
        code,
        message: pickMessage(candidate, defaultSocketMessage(source)),
      };
    }

    // Client validation — caller supplies CLIENT_VALIDATION-shaped errors.
    if (source === 'client') {
      const rawCode = (candidate as ErrorBody).code;
      const clientCode =
        typeof rawCode === 'string' && rawCode === 'CLIENT_VALIDATION'
          ? 'CLIENT_VALIDATION'
          : isChatErrorCodeString(rawCode)
            ? rawCode
            : 'CLIENT_VALIDATION';
      return {
        source,
        code: clientCode,
        message: pickMessage(candidate, 'Validation failed'),
      };
    }
  }

  // 3. Bare strings (rare) and everything else.
  if (source === 'client') {
    return {
      source,
      code: 'CLIENT_VALIDATION',
      message: pickMessage(err, 'Validation failed'),
    };
  }

  return {
    source,
    code: 'UNKNOWN',
    message: pickMessage(err, defaultSocketMessage(source)),
  };
}

function isChatErrorCodeString(value: unknown): value is ChatErrorCode {
  if (typeof value !== 'string') return false;
  return (
    value === 'CHAT_VALIDATION_ERROR' ||
    value === 'CHAT_UNAUTHORIZED' ||
    value === 'CHAT_FORBIDDEN' ||
    value === 'CHAT_NOT_FOUND' ||
    value === 'CHAT_CONFLICT' ||
    value === 'CHAT_RATE_LIMITED' ||
    value === 'CHAT_PAYLOAD_TOO_LARGE' ||
    value === 'CHAT_UPLOAD_FAILED' ||
    value === 'CHAT_AUTOSUBSCRIBE_FAILED' ||
    value === 'CHAT_JOIN_FORBIDDEN'
  );
}

function defaultRestMessage(status: number): string {
  if (status >= 500) return 'Server error';
  if (status === 408) return 'Request timed out';
  return `Request failed (${status})`;
}

function defaultSocketMessage(source: ChatErrorSource): string {
  switch (source) {
    case 'auth':
      return 'Authentication failed';
    case 'socket-ack':
      return 'Chat operation failed';
    case 'socket-event':
      return 'Chat event error';
    default:
      return 'Unknown chat error';
  }
}

// ─── logChatError ────────────────────────────────────────────────────────────

/**
 * Underlying diagnostic sink. Defaults to `console.warn` (the only sink
 * available today; design notes plan an injected sink). Tests can swap this
 * via {@link setChatErrorLogger}.
 */
export type ChatErrorSink = (...args: unknown[]) => void;

let currentSink: ChatErrorSink = (...args) => {
  // eslint-disable-next-line no-console
  console.warn(...args);
};

/**
 * Replaces the diagnostic sink. Returns the previous sink so callers can
 * restore it after the test.
 */
export function setChatErrorLogger(sink: ChatErrorSink): ChatErrorSink {
  const previous = currentSink;
  currentSink = sink;
  return previous;
}

/** Sentinel inserted in place of redacted fields and values. */
export const REDACTED = '[REDACTED]';

/** Field names (case-insensitive) whose values are always redacted. */
const REDACTED_FIELD_NAMES: ReadonlySet<string> = new Set(
  ['accessToken', 'refreshToken', 'token', 'auth', 'Authorization'].map((s) =>
    s.toLowerCase(),
  ),
);

/** Local URI prefixes — paths to on-device files that must never be logged. */
const LOCAL_URI_PREFIXES: readonly string[] = ['file://', 'content://', 'ph://'];

/**
 * Returns whether a string value matches a local URI prefix and therefore
 * needs redaction (Req 21.5 mirror — same list as persistence).
 */
function isLocalUri(value: string): boolean {
  for (const prefix of LOCAL_URI_PREFIXES) {
    if (value.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Deep-walks a value and returns a structurally-similar copy with all
 * redaction rules applied:
 *
 *  - Any object key whose lowercased name is in {@link REDACTED_FIELD_NAMES}
 *    has its value replaced with {@link REDACTED}, regardless of value type.
 *  - Any string value that begins with a local URI prefix is replaced with
 *    {@link REDACTED}.
 *
 * Non-plain objects (Maps, Sets, class instances) are stringified to their
 * constructor name to avoid leaking internal fields. Cycles are handled via
 * a visited set so the redactor is safe to call on arbitrary user payloads.
 */
export function redactForLog(value: unknown): unknown {
  return redactInner(value, new WeakSet());
}

function redactInner(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return isLocalUri(value) ? REDACTED : value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value;
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const out = value.map((entry) => redactInner(entry, seen));
    seen.delete(value);
    return out;
  }

  // From here on `value` is an object. Guard against non-plain objects.
  const obj = value as Record<string, unknown>;
  if (seen.has(obj)) return '[Circular]';

  // Allow `Error` to expose its name + message but nothing else.
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
    };
  }

  const proto = Object.getPrototypeOf(obj);
  const isPlain = proto === Object.prototype || proto === null;
  if (!isPlain) {
    // Don't traverse class instances — log a tag instead. Avoids leaking
    // internal fields on e.g. ApiError or Socket instances.
    return `[${(obj.constructor?.name ?? 'Object')}]`;
  }

  seen.add(obj);
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(obj)) {
    if (REDACTED_FIELD_NAMES.has(key.toLowerCase())) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = redactInner(child, seen);
  }
  seen.delete(obj);
  return out;
}

/**
 * Forwards a chat error outcome to the diagnostic sink with all redaction
 * rules applied.
 *
 * The shape of the log line is:
 * ```
 * [chat] <source> <code> [status=<n>] <message> { details... }
 * ```
 * where `details` is the redacted copy of `outcome.details` (omitted when
 * absent or empty).
 */
export function logChatError(outcome: ChatErrorOutcome): void {
  const safeMessage =
    typeof outcome.message === 'string' && isLocalUri(outcome.message)
      ? REDACTED
      : outcome.message;

  const parts: unknown[] = ['[chat]', outcome.source, outcome.code];
  if (typeof outcome.status === 'number') {
    parts.push(`status=${outcome.status}`);
  }
  parts.push(safeMessage);

  if (outcome.details) {
    const safeDetails = redactInner(outcome.details, new WeakSet());
    if (safeDetails && typeof safeDetails === 'object') {
      const keys = Object.keys(safeDetails as Record<string, unknown>);
      if (keys.length > 0) parts.push(safeDetails);
    }
  }

  currentSink(...parts);
}

/**
 * Convenience wrapper used by transport layers that want to map and log in
 * a single call. Returns the produced {@link ChatErrorOutcome} so callers can
 * branch on `code` afterwards (e.g. set rate-limit cooldown, navigate away).
 */
export function reportChatError(
  err: unknown,
  source: ChatErrorSource,
): ChatErrorOutcome {
  const outcome = mapApiError(err, source);
  logChatError(outcome);
  return outcome;
}
