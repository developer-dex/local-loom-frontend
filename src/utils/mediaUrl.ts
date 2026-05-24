import { env } from '../config/env';

function getApiOrigin(): URL | null {
  const base = env.apiBaseUrl.replace(/\/$/, '');
  if (!base) return null;
  try {
    return new URL(base.includes('://') ? base : `http://${base}`);
  } catch {
    return null;
  }
}

/** Turn relative upload paths (`/public/...`) into absolute URLs; fix `localhost` to match API host. */
export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path?.trim()) return undefined;

  const origin = getApiOrigin();
  let url = path.trim();

  if (!/^https?:\/\//i.test(url)) {
    if (!origin) return url;
    const hostRoot = `${origin.protocol}//${origin.host}`;
    const publicRoot = origin.pathname.replace(/\/api\/v1$/i, '');
    url = url.startsWith('/') ? `${hostRoot}${publicRoot}${url}` : `${hostRoot}${publicRoot}/${url}`;
  }

  if (origin) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        parsed.hostname = origin.hostname;
        parsed.port = origin.port;
        parsed.protocol = origin.protocol;
        return parsed.toString();
      }
    } catch {
      /* keep url as-is */
    }
  }

  return url;
}
