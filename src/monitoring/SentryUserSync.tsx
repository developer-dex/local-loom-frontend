import { useEffect } from 'react';

import { env } from '../config/env';
import { useAppSelector, selectAuthUser } from '../store/hooks';
import { Sentry } from './sentry';

/** Keeps Sentry user context in sync with the authenticated session. */
export function SentryUserSync() {
  const user = useAppSelector(selectAuthUser);

  useEffect(() => {
    if (!env.sentryDsn) return;

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
        username: user.name,
      });
      Sentry.setTag('role', user.role);
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return null;
}
