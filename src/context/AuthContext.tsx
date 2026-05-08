/**
 * AuthContext — thin bridge between the existing `useAuth()` API and Redux.
 *
 * On mount it dispatches `hydrateAuthThunk` which:
 *  1. Reads tokens from SecureStore
 *  2. Calls GET /auth/profile (auto-refreshes access token if expired)
 *  3. Restores user + tokens to Redux state
 *
 * `isReady` is false until hydration completes — RootNavigator waits for this
 * before deciding the initial route, preventing a flash of the wrong screen.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAppDispatch, useAppSelector, selectIsLoggedIn } from '../store/hooks';
import { hydrateAuthThunk, logoutThunk } from '../store/slices/authSlice';

type AuthContextValue = {
  /** True once token hydration + profile fetch has completed. */
  isReady: boolean;
  isLoggedIn: boolean;
  /** @deprecated Use `logoutThunk` via `useAppDispatch` for new code. */
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Hydrate session: reads SecureStore → fetches profile → restores Redux state.
    // Always resolves (never throws) — sets isReady when done.
    dispatch(hydrateAuthThunk()).finally(() => setIsReady(true));
  }, [dispatch]);

  // Kept for backward-compat — verifyOtpThunk already sets user in Redux.
  const login = useCallback(async () => {}, []);

  const logout = useCallback(async () => {
    await dispatch(logoutThunk());
  }, [dispatch]);

  const value = useMemo(
    () => ({ isReady, isLoggedIn, login, logout }),
    [isReady, isLoggedIn, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
