import { HistoryItem, PlantFolder } from '../types';

const GUEST_KEY_HISTORY = 'plantHistory_guest';
const GUEST_KEY_FOLDERS = 'plantFolders_guest';

// Helper to get keys based on user ID
const getKeys = (userId?: string) => {
  if (!userId) {
    return {
      historyKey: GUEST_KEY_HISTORY,
      foldersKey: GUEST_KEY_FOLDERS
    };
  }
  return {
    historyKey: `plantHistory_${userId}`,
    foldersKey: `plantFolders_${userId}`
  };
};

export const StorageService = {
  getHistory: (userId?: string): HistoryItem[] => {
    const { historyKey } = getKeys(userId);
    try {
      const data = localStorage.getItem(historyKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Storage Read Error", e);
      return [];
    }
  },

  saveHistory: (history: HistoryItem[], userId?: string) => {
    const { historyKey } = getKeys(userId);
    localStorage.setItem(historyKey, JSON.stringify(history));
  },

  getFolders: (userId?: string): PlantFolder[] => {
    const { foldersKey } = getKeys(userId);
    try {
      const data = localStorage.getItem(foldersKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Storage Read Error", e);
      return [];
    }
  },

  saveFolders: (folders: PlantFolder[], userId?: string) => {
    const { foldersKey } = getKeys(userId);
    localStorage.setItem(foldersKey, JSON.stringify(folders));
  },
  
  // Method to migrate guest data to user account upon registration/first login if desired
  migrateGuestData: (userId: string) => {
    const guestHistory = StorageService.getHistory();
    const guestFolders = StorageService.getFolders();
    
    if (guestHistory.length > 0 || guestFolders.length > 0) {
      // Merge logic could go here, for now we just overwrite/copy if the user account is empty
      // Or we can choose to append. Let's append to be safe.
      const userHistory = StorageService.getHistory(userId);
      const userFolders = StorageService.getFolders(userId);
      
      const newHistory = [...userHistory, ...guestHistory];
      const newFolders = [...userFolders, ...guestFolders];
      
      StorageService.saveHistory(newHistory, userId);
      StorageService.saveFolders(newFolders, userId);
      
      // Optional: Clear guest data after migration
      localStorage.removeItem(GUEST_KEY_HISTORY);
      localStorage.removeItem(GUEST_KEY_FOLDERS);
    }
  }
};