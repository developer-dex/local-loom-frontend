import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import categoriesReducer from './slices/categoriesSlice';
import chatReducer from './slices/chatSlice';
import regionsReducer from './slices/regionsSlice';
import tradiesReducer from './slices/tradiesSlice';
import usersReducer from './slices/usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    categories: categoriesReducer,
    chat: chatReducer,
    regions: regionsReducer,
    tradies: tradiesReducer,
    users: usersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
