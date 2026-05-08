/**
 * Categories slice — manages the list of service categories from the API.
 *
 * State shape:
 *   items   — Category[] fetched from GET /categories
 *   status  — 'idle' | 'loading' | 'succeeded' | 'failed'
 *   error   — last error message (null when no error)
 *
 * Thunks:
 *   fetchCategoriesThunk — GET /categories
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchCategoriesApi } from '../../api/categories';
import type { Category } from '../../api/categoryTypes';

// ─── State ────────────────────────────────────────────────────────────────────

export type CategoriesStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export type CategoriesState = {
  items: Category[];
  status: CategoriesStatus;
  error: string | null;
};

const initialState: CategoriesState = {
  items: [],
  status: 'idle',
  error: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/**
 * GET /categories
 * Fetches all active categories. Results are already sorted by the server
 * (sortOrder asc, name asc) — no client-side sorting needed.
 *
 * Skips the network call if categories are already loaded (status === 'succeeded').
 * Pass `force: true` to bypass the cache and always refetch.
 */
export const fetchCategoriesThunk = createAsyncThunk(
  'categories/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      const res = await fetchCategoriesApi();
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load categories';
      return rejectWithValue(msg);
    }
  },
  {
    // Don't re-fetch if we already have data
    condition: (_, { getState }) => {
      const state = getState() as { categories: CategoriesState };
      return state.categories.status !== 'succeeded';
    },
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    /** Force a re-fetch on next call to fetchCategoriesThunk. */
    invalidateCategories(state) {
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoriesThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCategoriesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { invalidateCategories } = categoriesSlice.actions;
export default categoriesSlice.reducer;
