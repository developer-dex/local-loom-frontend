/**
 * Tradies slice — manages tradie list, detail, own profile, and stats.
 *
 * State shape:
 *   list            — TradieListItem[] from GET /tradies
 *   listStatus      — 'idle' | 'loading' | 'succeeded' | 'failed'
 *   listError       — last error message (null when no error)
 *   detail          — TradieProfile | null from GET /tradies/:id
 *   detailStatus    — 'idle' | 'loading' | 'succeeded' | 'failed'
 *   detailError     — last error message (null when no error)
 *   myProfile       — TradieProfile | null from GET /tradies/me/profile
 *   myProfileStatus — 'idle' | 'loading' | 'succeeded' | 'failed'
 *   stats           — TradieStats | null from GET /tradies/profile/stats
 *   statsStatus     — 'idle' | 'loading' | 'succeeded' | 'failed'
 *
 * Thunks:
 *   fetchTradiesThunk           — GET /tradies
 *   fetchTradieDetailThunk(id)  — GET /tradies/:id
 *   fetchMyTradieProfileThunk   — GET /tradies/me/profile
 *   setupBusinessProfileThunk   — POST /tradies/business/setup
 *   fetchTradieStatsThunk       — GET /tradies/profile/stats
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchTradiesApi,
  fetchTradieByIdApi,
  fetchMyTradieProfileApi,
  setupBusinessProfileApi,
  uploadWorkPhotosApi,
  fetchTradieStatsApi,
  type FetchTradiesParams,
} from '../../api/tradies';
import type {
  TradieListItem,
  TradieProfile,
  MyTradieProfile,
  TradieStats,
  BusinessSetupRequest,
} from '../../api/tradieTypes';
import { resolveMediaUrl } from '../../utils/mediaUrl';

function normalizeTradieListItem(item: TradieListItem): TradieListItem {
  if (!item.businessImage) return item;
  const resolved = resolveMediaUrl(item.businessImage);
  return resolved ? { ...item, businessImage: resolved } : item;
}

// ─── State ────────────────────────────────────────────────────────────────────

export type TradiesStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export type TradiesState = {
  list: TradieListItem[];
  listStatus: TradiesStatus;
  listError: string | null;
  detail: TradieProfile | null;
  detailStatus: TradiesStatus;
  detailError: string | null;
  myProfile: MyTradieProfile | null;
  myProfileStatus: TradiesStatus;
  myProfileError: string | null;
  stats: TradieStats | null;
  statsStatus: TradiesStatus;
  statsError: string | null;
};

const initialState: TradiesState = {
  list: [],
  listStatus: 'idle',
  listError: null,
  detail: null,
  detailStatus: 'idle',
  detailError: null,
  myProfile: null,
  myProfileStatus: 'idle',
  myProfileError: null,
  stats: null,
  statsStatus: 'idle',
  statsError: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/**
 * GET /tradies
 * Fetches the tradie list with optional filters.
 */
export const fetchTradiesThunk = createAsyncThunk(
  'tradies/fetchList',
  async (params: FetchTradiesParams | undefined, { rejectWithValue }) => {
    try {
      const res = await fetchTradiesApi(params);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tradies';
      return rejectWithValue(msg);
    }
  },
);

/**
 * GET /tradies/:id
 * Fetches the full profile for a single tradie.
 */
export const fetchTradieDetailThunk = createAsyncThunk(
  'tradies/fetchDetail',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetchTradieByIdApi(id);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tradie profile';
      return rejectWithValue(msg);
    }
  },
);

/**
 * GET /tradies/me/profile
 * Fetches the authenticated tradie's own profile.
 */
export const fetchMyTradieProfileThunk = createAsyncThunk(
  'tradies/fetchMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchMyTradieProfileApi();
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load your tradie profile';
      return rejectWithValue(msg);
    }
  },
);

/**
 * POST /tradies/business/setup
 * Creates or updates the tradie's business profile.
 */
export const setupBusinessProfileThunk = createAsyncThunk(
  'tradies/setupBusinessProfile',
  async (req: BusinessSetupRequest, { rejectWithValue }) => {
    try {
      const res = await setupBusinessProfileApi(req);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set up business profile';
      return rejectWithValue(msg);
    }
  },
);

/**
 * POST /tradies/profile/work-photos
 * Uploads 1–20 work images (multipart `images` field).
 */
export const uploadWorkPhotosThunk = createAsyncThunk(
  'tradies/uploadWorkPhotos',
  async (uris: string[], { rejectWithValue }) => {
    try {
      const res = await uploadWorkPhotosApi(uris);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload work images';
      return rejectWithValue(msg);
    }
  },
);

/**
 * GET /tradies/profile/stats
 * Fetches visit count, review count, and average rating for the authenticated tradie.
 */
export const fetchTradieStatsThunk = createAsyncThunk(
  'tradies/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchTradieStatsApi();
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tradie stats';
      return rejectWithValue(msg);
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const tradiesSlice = createSlice({
  name: 'tradies',
  initialState,
  reducers: {
    /** Clear the current detail so the next navigation starts fresh. */
    clearTradieDetail(state) {
      state.detail = null;
      state.detailStatus = 'idle';
      state.detailError = null;
    },
    /** Clear list errors. */
    clearListError(state) {
      state.listError = null;
    },
    /** Clear the tradie list (e.g. before AI-filtered fetch). */
    clearTradieList(state) {
      state.list = [];
      state.listStatus = 'idle';
      state.listError = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetchTradies ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchTradiesThunk.pending, (state) => {
        state.listStatus = 'loading';
        state.listError = null;
      })
      .addCase(fetchTradiesThunk.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        const payload = action.payload;
        const raw = Array.isArray(payload) ? payload : (payload as { items?: TradieListItem[] })?.items ?? [];
        state.list = raw.map(normalizeTradieListItem);
      })
      .addCase(fetchTradiesThunk.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.listError = action.payload as string;
      });

    // ── fetchTradieDetail ────────────────────────────────────────────────────
    builder
      .addCase(fetchTradieDetailThunk.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchTradieDetailThunk.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchTradieDetailThunk.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload as string;
      });

    // ── fetchMyTradieProfile ─────────────────────────────────────────────────
    builder
      .addCase(fetchMyTradieProfileThunk.pending, (state) => {
        state.myProfileStatus = 'loading';
        state.myProfileError = null;
      })
      .addCase(fetchMyTradieProfileThunk.fulfilled, (state, action) => {
        state.myProfileStatus = 'succeeded';
        state.myProfile = action.payload;
      })
      .addCase(fetchMyTradieProfileThunk.rejected, (state, action) => {
        state.myProfileStatus = 'failed';
        state.myProfileError = action.payload as string;
      });

    // ── setupBusinessProfile ─────────────────────────────────────────────────
    builder
      .addCase(setupBusinessProfileThunk.pending, (state) => {
        state.myProfileStatus = 'loading';
        state.myProfileError = null;
      })
      .addCase(setupBusinessProfileThunk.fulfilled, (state) => {
        state.myProfileStatus = 'succeeded';
      })
      .addCase(setupBusinessProfileThunk.rejected, (state, action) => {
        state.myProfileStatus = 'failed';
        state.myProfileError = action.payload as string;
      });

    // ── fetchTradieStats ─────────────────────────────────────────────────────
    builder
      .addCase(fetchTradieStatsThunk.pending, (state) => {
        state.statsStatus = 'loading';
        state.statsError = null;
      })
      .addCase(fetchTradieStatsThunk.fulfilled, (state, action) => {
        state.statsStatus = 'succeeded';
        state.stats = action.payload;
      })
      .addCase(fetchTradieStatsThunk.rejected, (state, action) => {
        state.statsStatus = 'failed';
        state.statsError = action.payload as string;
      });
  },
});

export const { clearTradieDetail, clearListError, clearTradieList } = tradiesSlice.actions;
export default tradiesSlice.reducer;
