/**
 * Regions slice — manages service regions from GET /regions.
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchRegionsApi } from '../../api/regions';
import type { Region } from '../../api/regionTypes';

export type RegionsStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export type RegionsState = {
  items: Region[];
  status: RegionsStatus;
  error: string | null;
};

const initialState: RegionsState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchRegionsThunk = createAsyncThunk(
  'regions/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchRegionsApi();
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load regions';
      return rejectWithValue(msg);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as { regions: RegionsState };
      return state.regions.status !== 'succeeded';
    },
  },
);

const regionsSlice = createSlice({
  name: 'regions',
  initialState,
  reducers: {
    invalidateRegions(state) {
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRegionsThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRegionsThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchRegionsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { invalidateRegions } = regionsSlice.actions;
export default regionsSlice.reducer;
