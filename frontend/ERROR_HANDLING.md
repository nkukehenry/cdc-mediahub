# Global Error Handling & Toast Notifications

This project uses a centralized error handling system with toast notifications powered by `react-hot-toast`.

## Installation

Make sure to install the required dependency:

```bash
npm install react-hot-toast
```

## Architecture

### 1. Error Handler Utility (`utils/errorHandler.ts`)

The `ErrorHandler` class provides methods for displaying different types of notifications:

- `handleError(error, defaultMessage)` - Shows error toast (AU Red)
- `showSuccess(message)` - Shows success toast (AU Green)
- `showInfo(message)` - Shows info toast (AU Corporate Green)
- `showWarning(message)` - Shows warning toast (AU Gold)

### 2. Redux Error Middleware (`store/middleware/errorMiddleware.ts`)

Automatically catches errors from rejected Redux thunks and displays them in toast notifications. No need to manually handle errors from async thunks.

### 3. Toast Provider (`components/ToastProvider.tsx`)

Wrapper component that provides the toast context to the entire application. Already added to the root layout.

## Usage

### In Components

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, showSuccess } = useErrorHandler();

  const handleAction = async () => {
    try {
      await someAsyncOperation();
      showSuccess('Operation completed successfully!');
    } catch (error) {
      handleError(error, 'Operation failed');
    }
  };
}
```

### Direct Import

```typescript
import { handleError, showSuccess } from '@/utils/errorHandler';

// Show error
handleError(error, 'Default error message');

// Show success
showSuccess('Success message');
```

### Redux Thunks (Automatic)

Errors from Redux thunks are automatically caught by the middleware and displayed:

```typescript
// No need to manually catch - middleware handles it
dispatch(fetchFolderTree(null)); // Error toast shown automatically if fails
```

### Manual Error Handling

For specific cases where you want to show custom messages:

```typescript
import { showSuccess, showWarning } from '@/utils/errorHandler';

// After successful folder creation
showSuccess('Folder created successfully');

// Show warning
showWarning('This action cannot be undone');
```

## Toast Styling

All toasts use the AU brand colors:

- **Error**: AU Red (#9F2241)
- **Success**: AU Green (#348F41)
- **Info**: AU Corporate Green (#1A5632)
- **Warning**: AU Gold (#B4A269)

Toasts appear in the top-right corner and have appropriate durations:
- Error: 5 seconds
- Success: 3 seconds
- Info: 3 seconds
- Warning: 4 seconds

## Best Practices

1. **Use Redux middleware** for async operations - errors are handled automatically
2. **Show success messages** for user actions (e.g., "Folder created successfully")
3. **Use warnings** for actions that have consequences (e.g., "This will delete all files")
4. **Don't show error toasts** for validation errors - use inline form errors instead
5. **Log errors** in development mode for debugging

## Examples

See these files for implementation examples:

- `components/CreateFolderModal.tsx` - Success toast after folder creation
- `store/fileManagerSlice.ts` - Errors caught by middleware
- `utils/apiClient.ts` - API errors bubble up to middleware

