/**
 * Auth slice — manages authentication state via Redux Toolkit.
 *
 * State shape:
 *   user        — authenticated user object (null when logged out)
 *   tokens      — { accessToken, refreshToken } (null when logged out)
 *   status      — 'idle' | 'loading' | 'succeeded' | 'failed'
 *   error       — last error message (null when no error)
 *   pendingOtp  — identifier + type stored between login/signup and OTP verify
 *
 * Thunks (async actions):
 *   signupThunk       — POST /auth/signup
 *   loginThunk        — POST /auth/login
 *   verifyOtpThunk    — POST /auth/verify-otp
 *   logoutThunk       — POST /auth/logout
 *   fetchProfileThunk — GET  /auth/profile
 *   hydrateAuthThunk  — restore tokens from secure storage on app start
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { signupApi, loginApi, verifyOtpApi, logoutApi, getProfileApi } from '../../api/auth';
import { tokenStorage } from '../../storage/tokenStorage';
import type { AuthUser, AuthTokens, IdentifierType, UserRole } from '../../api/authTypes';

// ─── State ────────────────────────────────────────────────────────────────────

export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export type PendingOtp = {
  identifier: string;
  identifierType: IdentifierType;
  /** Kept so OtpVerificationScreen can display the masked destination. */
  maskedIdentifier?: string;
};

export type AuthState = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  status: AuthStatus;
  error: string | null;
  /** Set after signup/login, cleared after verify-otp. */
  pendingOtp: PendingOtp | null;
};

const initialState: AuthState = {
  user: null,
  tokens: null,
  status: 'idle',
  error: null,
  pendingOtp: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/**
 * Restore session on app start.
 *
 * Flow:
 *  1. Read access + refresh tokens from SecureStore.
 *  2. If none → user is logged out, return null.
 *  3. Call GET /auth/profile with the stored access token.
 *     - client.ts auto-refreshes on 401 (expired access token) and retries.
 *     - If refresh also fails (refresh token expired/revoked) → clear tokens, return null.
 *  4. Return { user, tokens } so Redux state is fully restored.
 */
export const hydrateAuthThunk = createAsyncThunk('auth/hydrate', async () => {
  const [accessToken, refreshToken] = await Promise.all([
    tokenStorage.getAccessToken(),
    tokenStorage.getRefreshToken(),
  ]);

  // No tokens stored — not logged in
  if (!accessToken || !refreshToken) return null;

  try {
    // Fetch profile using stored token. client.ts handles auto-refresh on 401.
    const res = await getProfileApi();
    // Re-read tokens after potential refresh
    const [newAccess, newRefresh] = await Promise.all([
      tokenStorage.getAccessToken(),
      tokenStorage.getRefreshToken(),
    ]);
    return {
      user: res.data,
      tokens: {
        accessToken: newAccess ?? accessToken,
        refreshToken: newRefresh ?? refreshToken,
      },
    };
  } catch {
    // Refresh token expired or revoked — clear everything and force re-login
    await tokenStorage.clearTokens();
    return null;
  }
});

/**
 * POST /auth/signup
 * Creates account and sends OTP. Stores pending OTP state for the next step.
 */
export const signupThunk = createAsyncThunk(
  'auth/signup',
  async (
    payload: {
      fullName: string;
      phone: string;
      role: UserRole;
      email?: string;
      profilePhotoUri?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const res = await signupApi(payload);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      return rejectWithValue(msg);
    }
  },
);

/**
 * POST /auth/login
 * Sends OTP to an existing account. Stores pending OTP state.
 */
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    payload: { identifier: string; identifierType: IdentifierType },
    { rejectWithValue },
  ) => {
    try {
      const res = await loginApi(payload);
      return { ...res.data, identifier: payload.identifier };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return rejectWithValue(msg);
    }
  },
);

/**
 * POST /auth/verify-otp
 * Verifies OTP, persists tokens to secure storage, and stores user in state.
 */
export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async (
    payload: { identifier: string; identifierType: IdentifierType; code: string },
    { rejectWithValue },
  ) => {
    try {
      const res = await verifyOtpApi(payload);
      const { user, tokens } = res.data;
      await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      return { user, tokens };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OTP verification failed';
      return rejectWithValue(msg);
    }
  },
);

/**
 * POST /auth/logout
 * Invalidates server session and clears local tokens.
 */
export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try {
    await logoutApi();
  } catch {
    // Best-effort — clear local state regardless of server response
  } finally {
    await tokenStorage.clearTokens();
  }
});

/**
 * GET /auth/profile
 * Fetches and refreshes the user object in state.
 */
export const fetchProfileThunk = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getProfileApi();
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch profile';
      return rejectWithValue(msg);
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Manually clear any error (e.g. when user dismisses an error banner). */
    clearError(state) {
      state.error = null;
    },
    /** Reset to initial state (used after logout completes). */
    resetAuth(state) {
      state.user = null;
      state.tokens = null;
      state.status = 'idle';
      state.error = null;
      state.pendingOtp = null;
    },
  },
  extraReducers: (builder) => {
    // ── hydrateAuth ──────────────────────────────────────────────────────────
    builder.addCase(hydrateAuthThunk.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.status = 'succeeded';
      }
    });

    // ── signup ───────────────────────────────────────────────────────────────
    builder
      .addCase(signupThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.pendingOtp = {
          identifier: action.payload.phone,
          identifierType: 'phone',
        };
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // ── login ────────────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.pendingOtp = {
          identifier: action.payload.identifier,
          identifierType: action.payload.identifierType,
          maskedIdentifier: action.payload.maskedIdentifier,
        };
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // ── verifyOtp ────────────────────────────────────────────────────────────
    builder
      .addCase(verifyOtpThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.pendingOtp = null;
      })
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // ── logout ───────────────────────────────────────────────────────────────
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.user = null;
      state.tokens = null;
      state.status = 'idle';
      state.error = null;
      state.pendingOtp = null;
    });

    // ── fetchProfile ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchProfileThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(fetchProfileThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;
