/**
 * Users slice — GET/PATCH/DELETE /users/me and avatar upload (customers).
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { logoutThunk } from './authSlice';
import {
  deleteUserMeApi,
  getUserMeApi,
  updateUserAvatarApi,
  updateUserMeApi,
} from '../../api/users';
import type { UpdateUserRequest, UserProfile } from '../../api/userTypes';
import { normalizeAuthUser } from '../../utils/authUser';

export type UsersStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export type UsersState = {
  me: UserProfile | null;
  status: UsersStatus;
  error: string | null;
};

const initialState: UsersState = {
  me: null,
  status: 'idle',
  error: null,
};

export const fetchUserMeThunk = createAsyncThunk(
  'users/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getUserMeApi();
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile';
      return rejectWithValue(msg);
    }
  },
);

export const updateUserMeThunk = createAsyncThunk(
  'users/updateMe',
  async (body: UpdateUserRequest, { rejectWithValue }) => {
    try {
      const res = await updateUserMeApi(body);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      return rejectWithValue(msg);
    }
  },
);

export const updateUserAvatarThunk = createAsyncThunk(
  'users/updateAvatar',
  async (avatarUri: string, { rejectWithValue }) => {
    try {
      const res = await updateUserAvatarApi(avatarUri);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update avatar';
      return rejectWithValue(msg);
    }
  },
);

export const deleteUserMeThunk = createAsyncThunk(
  'users/deleteMe',
  async (_, { rejectWithValue }) => {
    try {
      await deleteUserMeApi();
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      return rejectWithValue(msg);
    }
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUsers(state) {
      state.me = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const onPending = (state: UsersState) => {
      state.status = 'loading';
      state.error = null;
    };
    const onRejected = (state: UsersState, action: { payload: unknown }) => {
      state.status = 'failed';
      state.error = action.payload as string;
    };

    builder
      .addCase(fetchUserMeThunk.pending, onPending)
      .addCase(fetchUserMeThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.me = normalizeAuthUser(action.payload);
      })
      .addCase(fetchUserMeThunk.rejected, onRejected);

    builder
      .addCase(updateUserMeThunk.pending, onPending)
      .addCase(updateUserMeThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.me = normalizeAuthUser(action.payload);
      })
      .addCase(updateUserMeThunk.rejected, onRejected);

    builder
      .addCase(updateUserAvatarThunk.pending, onPending)
      .addCase(updateUserAvatarThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.me = normalizeAuthUser(action.payload);
      })
      .addCase(updateUserAvatarThunk.rejected, onRejected);

    builder.addCase(deleteUserMeThunk.fulfilled, (state) => {
      state.me = null;
      state.status = 'idle';
    });

    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.me = null;
      state.status = 'idle';
      state.error = null;
    });
  },
});

export const { clearUsers } = usersSlice.actions;
export default usersSlice.reducer;
