import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { fetchFolderTree, setFoldersSilently } from '@/store/fileManagerSlice';
import { apiClient } from '@/utils/apiClient';
import { FolderWithFiles, FileWithUrls } from '@/types/fileManager';

interface UseFileUploadOptions {
  currentFolder?: string | null;
  onUploadComplete?: (uploadedFiles: File[]) => void | Promise<void>;
  silentRefresh?: boolean;
}

/**
 * Reusable hook for handling file upload completion and refresh logic
 */
export function useFileUpload(options: UseFileUploadOptions = {}) {
  const dispatch = useDispatch();
  const { currentFolder = null, onUploadComplete, silentRefresh = true } = options;

  const refreshAfterUpload = useCallback(async () => {
    try {
      if (silentRefresh) {
        // Try silent refresh first (no loading state)
        try {
          const treeRes = await apiClient.getFolderTree(undefined);
          if (treeRes.success && treeRes.data?.folders) {
            dispatch(setFoldersSilently(treeRes.data.folders as FolderWithFiles[]));
          }
        } catch (treeError) {
          // Fallback to regular refresh if silent fails
          console.error('Silent tree refresh failed, using regular refresh:', treeError);
          dispatch(fetchFolderTree(null) as any);
        }
      } else {
        // Regular refresh with loading state
        dispatch(fetchFolderTree(null) as any);
      }

      // Also refresh files if we're at root or need to update specific folder
      if (currentFolder === null) {
        // This is handled by FileManager's useEffect that watches currentFolder
        // But we can trigger it by refreshing the tree
      } else {
        // Force refresh the folder tree from root to ensure all folders and files are updated
        // This is necessary for shared folders where files might be uploaded by different users
        if (!silentRefresh) {
          dispatch(fetchFolderTree(null) as any);
        }
      }
    } catch (error) {
      console.error('Failed to refresh files after upload:', error);
    }
  }, [dispatch, currentFolder, silentRefresh]);

  const handleUploadComplete = useCallback(async (uploadedFiles: File[]) => {
    // Refresh file list
    await refreshAfterUpload();
    
    // Call custom callback if provided
    if (onUploadComplete) {
      await onUploadComplete(uploadedFiles);
    }
  }, [refreshAfterUpload, onUploadComplete]);

  /**
   * Get uploaded files by their original names
   * Useful for auto-selecting files after upload
   */
  const getUploadedFilesByName = useCallback(async (
    fileNames: string[],
    folderId?: string | null
  ): Promise<FileWithUrls[]> => {
    try {
      const response = await apiClient.getFiles(folderId || undefined);
      if (response.success && response.data?.files) {
        const allFiles = response.data.files as FileWithUrls[];
        // Find files that match the uploaded file names
        return allFiles.filter(file => 
          fileNames.some(name => name === file.originalName)
        );
      }
      return [];
    } catch (error) {
      console.error('Failed to get uploaded files:', error);
      return [];
    }
  }, []);

  return {
    handleUploadComplete,
    refreshAfterUpload,
    getUploadedFilesByName,
  };
}

