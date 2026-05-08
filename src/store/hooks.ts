/**
 * Typed Redux hooks — use these instead of the plain `useDispatch` / `useSelector`
 * so TypeScript knows the full store shape.
 */
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);

// ─── Auth selectors ───────────────────────────────────────────────────────────

export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthTokens = (state: RootState) => state.auth.tokens;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectPendingOtp = (state: RootState) => state.auth.pendingOtp;
export const selectIsLoggedIn = (state: RootState) => state.auth.user !== null || state.auth.tokens !== null;
export const selectIsAuthLoading = (state: RootState) => state.auth.status === 'loading';

// ─── Categories selectors ─────────────────────────────────────────────────────

export const selectCategories = (state: RootState) => state.categories.items;
export const selectCategoriesStatus = (state: RootState) => state.categories.status;
export const selectCategoriesError = (state: RootState) => state.categories.error;
export const selectCategoriesLoading = (state: RootState) => state.categories.status === 'loading';
