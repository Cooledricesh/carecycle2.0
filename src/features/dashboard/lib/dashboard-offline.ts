/**
 * Dashboard Offline Support
 * Provides offline capabilities for dashboard data
 */

export interface OfflineDashboardData {
  stats: any;
  recent: any;
  trends: any;
  timestamp: number;
  version: string;
}

export class DashboardOfflineManager {
  private static readonly STORAGE_KEY = 'dashboard_offline_data';
  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Save dashboard data for offline use
   */
  public static async saveOfflineData(
    stats: any,
    recent: any,
    trends: any
  ): Promise<void> {
    try {
      const offlineData: OfflineDashboardData = {
        stats,
        recent,
        trends,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offlineData));
      }

      // Also cache in IndexedDB for larger storage capacity
      if ('indexedDB' in window) {
        await this.saveToIndexedDB(offlineData);
      }
    } catch (error) {
      console.warn('[Dashboard Offline] Failed to save offline data:', error);
    }
  }

  /**
   * Load dashboard data from offline cache
   */
  public static async loadOfflineData(): Promise<OfflineDashboardData | null> {
    try {
      // First try localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem(this.STORAGE_KEY);
        if (cached) {
          const data = JSON.parse(cached) as OfflineDashboardData;
          if (this.isValidCache(data)) {
            return data;
          }
        }
      }

      // Fallback to IndexedDB
      if ('indexedDB' in window) {
        return await this.loadFromIndexedDB();
      }

      return null;
    } catch (error) {
      console.warn('[Dashboard Offline] Failed to load offline data:', error);
      return null;
    }
  }

  /**
   * Check if we're currently offline
   */
  public static isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  /**
   * Clear offline cache
   */
  public static async clearOfflineCache(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STORAGE_KEY);
      }

      if ('indexedDB' in window) {
        await this.clearIndexedDB();
      }
    } catch (error) {
      console.warn('[Dashboard Offline] Failed to clear cache:', error);
    }
  }

  /**
   * Validate cached data
   */
  private static isValidCache(data: OfflineDashboardData): boolean {
    const now = Date.now();
    const age = now - data.timestamp;
    
    return (
      data.version === this.CACHE_VERSION &&
      age < this.MAX_CACHE_AGE &&
      data.stats && data.recent && data.trends
    );
  }

  /**
   * Save to IndexedDB for larger storage
   */
  private static async saveToIndexedDB(data: OfflineDashboardData): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CareCycleDashboard', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['dashboard'], 'readwrite');
        const store = transaction.objectStore('dashboard');

        const saveRequest = store.put(data, 'offline_data');
        saveRequest.onsuccess = () => resolve();
        saveRequest.onerror = () => reject(saveRequest.error);

        db.close();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('dashboard')) {
          db.createObjectStore('dashboard');
        }
      };
    });
  }

  /**
   * Load from IndexedDB
   */
  private static async loadFromIndexedDB(): Promise<OfflineDashboardData | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CareCycleDashboard', 1);

      request.onerror = () => resolve(null); // Don't reject, just return null

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('dashboard')) {
          db.close();
          resolve(null);
          return;
        }

        const transaction = db.transaction(['dashboard'], 'readonly');
        const store = transaction.objectStore('dashboard');
        const getRequest = store.get('offline_data');

        getRequest.onsuccess = () => {
          const data = getRequest.result as OfflineDashboardData;
          db.close();
          
          if (data && this.isValidCache(data)) {
            resolve(data);
          } else {
            resolve(null);
          }
        };

        getRequest.onerror = () => {
          db.close();
          resolve(null);
        };
      };
    });
  }

  /**
   * Clear IndexedDB cache
   */
  private static async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CareCycleDashboard', 1);

      request.onerror = () => resolve(); // Don't fail if can't clear

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (db.objectStoreNames.contains('dashboard')) {
          const transaction = db.transaction(['dashboard'], 'readwrite');
          const store = transaction.objectStore('dashboard');
          const clearRequest = store.clear();
          
          clearRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          
          clearRequest.onerror = () => {
            db.close();
            resolve();
          };
        } else {
          db.close();
          resolve();
        }
      };
    });
  }
}

/**
 * Hook for using offline dashboard data
 */
export function useOfflineDashboard() {
  const saveOfflineData = async (stats: any, recent: any, trends: any) => {
    await DashboardOfflineManager.saveOfflineData(stats, recent, trends);
  };

  const loadOfflineData = async () => {
    return await DashboardOfflineManager.loadOfflineData();
  };

  const clearCache = async () => {
    await DashboardOfflineManager.clearOfflineCache();
  };

  const isOffline = DashboardOfflineManager.isOffline();

  return {
    saveOfflineData,
    loadOfflineData,
    clearCache,
    isOffline,
  };
}