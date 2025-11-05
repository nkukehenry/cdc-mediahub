'use client';

import { Toaster } from 'react-hot-toast';

/**
 * Toast provider component that wraps the application with react-hot-toast
 * This component should be added to the root layout
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options for all toasts
        className: '',
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '400px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        // Success toast
        success: {
          duration: 3000,
          style: {
            background: '#348F41', // AU Green
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#348F41',
          },
        },
        // Error toast
        error: {
          duration: 5000,
          style: {
            background: '#9F2241', // AU Red
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#9F2241',
          },
        },
        // Loading toast
        loading: {
          style: {
            background: '#3b82f6',
          },
        },
      }}
    />
  );
}

