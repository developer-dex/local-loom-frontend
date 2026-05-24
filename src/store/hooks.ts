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

// ─── Regions selectors ────────────────────────────────────────────────────────

export const selectRegions = (state: RootState) => state.regions.items;
export const selectRegionsStatus = (state: RootState) => state.regions.status;
export const selectRegionsError = (state: RootState) => state.regions.error;
export const selectRegionsLoading = (state: RootState) => state.regions.status === 'loading';

// ─── Users selectors ──────────────────────────────────────────────────────────

export const selectUserMe = (state: RootState) => state.users.me;
export const selectUsersStatus = (state: RootState) => state.users.status;
export const selectUsersError = (state: RootState) => state.users.error;
export const selectUsersLoading = (state: RootState) => state.users.status === 'loading';

// ─── Tradies selectors ────────────────────────────────────────────────────────

export const selectTradieList = (state: RootState) => state.tradies.list;
export const selectTradieListStatus = (state: RootState) => state.tradies.listStatus;
export const selectTradieListError = (state: RootState) => state.tradies.listError;
export const selectTradieDetail = (state: RootState) => state.tradies.detail;
export const selectTradieDetailStatus = (state: RootState) => state.tradies.detailStatus;
export const selectTradieDetailError = (state: RootState) => state.tradies.detailError;
export const selectMyTradieProfile = (state: RootState) => state.tradies.myProfile;
export const selectMyTradieProfileStatus = (state: RootState) => state.tradies.myProfileStatus;
export const selectTradieStats = (state: RootState) => state.tradies.stats;
