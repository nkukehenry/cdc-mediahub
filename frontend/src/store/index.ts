import { configureStore } from '@reduxjs/toolkit';
import fileManagerReducer from './fileManagerSlice';

export const store = configureStore({
  reducer: {
    fileManager: fileManagerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['fileManager/setUploadProgress'],
        ignoredPaths: ['fileManager.uploadProgress'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
