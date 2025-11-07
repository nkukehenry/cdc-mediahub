import { configureStore } from '@reduxjs/toolkit';
import fileManagerReducer from './fileManagerSlice';
import publicationsReducer from './publicationsSlice';
import navLinksReducer from './navLinksSlice';
import analyticsReducer from './analyticsSlice';
import youtubeReducer from './youtubeSlice';
import settingsReducer from './settingsSlice';
import { errorMiddleware } from './middleware/errorMiddleware';

export const store = configureStore({
  reducer: {
    fileManager: fileManagerReducer,
    publications: publicationsReducer,
    navLinks: navLinksReducer,
    analytics: analyticsReducer,
    youtube: youtubeReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['fileManager/setUploadProgress'],
        ignoredPaths: ['fileManager.uploadProgress'],
      },
    }).concat(errorMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
