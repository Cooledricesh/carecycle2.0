/**
 * Advanced Dashboard Caching Strategies
 * Implements intelligent caching with background updates and cache warming
 */

import { QueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys, dashboardClient } from '../api/dashboard-client';
import type { 
  DashboardStatsResponse, 
  DashboardRecentResponse, 
  DashboardTrendsResponse 
} from '@/types/dashboard';

export interface DashboardCacheConfig {
  /**
   * Enable background prefetching of dashboard data
   */
  enablePrefetching?: boolean;
  
  /**
   * Enable stale-while-revalidate strategy
   */
  enableStaleWhileRevalidate?: boolean;
  
  /**
   * Cache warming intervals (in milliseconds)
   */
  cacheWarmingInterval?: number;
  
  /**
   * Maximum cache age before forced refresh (in milliseconds)
   */
  maxCacheAge?: number;
}

export class DashboardCacheManager {
  private queryClient: QueryClient;
  private config: Required<DashboardCacheConfig>;
  private cacheWarmingTimer?: NodeJS.Timeout;
  private backgroundUpdatePromises: Map<string, Promise<any>> = new Map();

  constructor(queryClient: QueryClient, config: DashboardCacheConfig = {}) {
    this.queryClient = queryClient;
    this.config = {
      enablePrefetching: true,
      enableStaleWhileRevalidate: true,
      cacheWarmingInterval: 120000, // 2 minutes
      maxCacheAge: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Initialize cache management strategies
   */
  public initialize(): void {
    if (this.config.enablePrefetching) {
      this.setupPrefetching();
    }
    
    if (this.config.enableStaleWhileRevalidate) {
      this.setupStaleWhileRevalidate();
    }
    
    this.startCacheWarming();
  }

  /**
   * Clean up cache management
   */
  public cleanup(): void {
    if (this.cacheWarmingTimer) {
      clearInterval(this.cacheWarmingTimer);
    }
    
    // Cancel any pending background updates
    this.backgroundUpdatePromises.clear();
  }

  /**
   * Setup intelligent prefetching based on user behavior
   */
  private setupPrefetching(): void {
    // Prefetch trends data when stats are fetched (likely user will view trends next)
    this.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey[1] === 'stats') {
        this.prefetchTrendsData();
      }
    });

    // Prefetch recent data when dashboard is first loaded
    this.prefetchRecentData();
  }

  /**
   * Setup stale-while-revalidate strategy
   */
  private setupStaleWhileRevalidate(): void {
    const originalFetch = this.queryClient.getQueryData.bind(this.queryClient);
    
    // Override query behavior to implement stale-while-revalidate
    this.queryClient.setQueryDefaults(dashboardQueryKeys.stats(), {
      staleTime: this.config.maxCacheAge * 0.8, // 80% of max cache age
      gcTime: this.config.maxCacheAge * 2, // Keep in cache longer
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: (failureCount, error) => {
        // More aggressive retry for dashboard data
        return failureCount < 3 && this.isRetryableError(error);
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    // Similar settings for other dashboard queries
    this.queryClient.setQueryDefaults(dashboardQueryKeys.recent(), {
      staleTime: this.config.maxCacheAge * 0.6, // Recent data should be fresher
      gcTime: this.config.maxCacheAge,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    });

    this.queryClient.setQueryDefaults(dashboardQueryKeys.trends(), {
      staleTime: this.config.maxCacheAge * 1.5, // Trends can be stale longer
      gcTime: this.config.maxCacheAge * 3,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    });
  }

  /**
   * Start background cache warming
   */
  private startCacheWarming(): void {
    if (this.cacheWarmingTimer) {
      clearInterval(this.cacheWarmingTimer);
    }

    this.cacheWarmingTimer = setInterval(() => {
      this.warmCache();
    }, this.config.cacheWarmingInterval);

    // Initial cache warming
    this.warmCache();
  }

  /**
   * Warm cache with fresh data in background
   */
  private async warmCache(): Promise<void> {
    const promises: Promise<any>[] = [];

    // Check if stats data is stale
    const statsData = this.queryClient.getQueryData(dashboardQueryKeys.stats());
    const statsState = this.queryClient.getQueryState(dashboardQueryKeys.stats());
    
    if (this.isCacheStale(statsState?.dataUpdatedAt)) {
      promises.push(this.backgroundUpdate('stats', dashboardClient.getStats));
    }

    // Check recent data staleness
    const recentState = this.queryClient.getQueryState(dashboardQueryKeys.recent());
    if (this.isCacheStale(recentState?.dataUpdatedAt, this.config.maxCacheAge * 0.7)) {
      promises.push(this.backgroundUpdate('recent', dashboardClient.getRecent));
    }

    // Check trends data staleness (less frequent updates)
    const trendsState = this.queryClient.getQueryState(dashboardQueryKeys.trends());
    if (this.isCacheStale(trendsState?.dataUpdatedAt, this.config.maxCacheAge * 2)) {
      promises.push(this.backgroundUpdate('trends', dashboardClient.getTrends));
    }

    // Wait for all background updates
    if (promises.length > 0) {
      try {
        await Promise.allSettled(promises);
      } catch (error) {
        console.warn('[Dashboard Cache] Background cache warming failed:', error);
      }
    }
  }

  /**
   * Perform background update without blocking UI
   */
  private async backgroundUpdate<T>(
    key: string,
    fetchFunction: () => Promise<T>
  ): Promise<T | null> {
    // Prevent duplicate background updates
    if (this.backgroundUpdatePromises.has(key)) {
      return this.backgroundUpdatePromises.get(key)!;
    }

    const updatePromise = fetchFunction()
      .then((data) => {
        // Update cache silently
        const queryKey = key === 'stats' 
          ? dashboardQueryKeys.stats()
          : key === 'recent'
          ? dashboardQueryKeys.recent()
          : dashboardQueryKeys.trends();
          
        this.queryClient.setQueryData(queryKey, data);
        return data;
      })
      .catch((error) => {
        console.warn(`[Dashboard Cache] Background update failed for ${key}:`, error);
        return null;
      })
      .finally(() => {
        this.backgroundUpdatePromises.delete(key);
      });

    this.backgroundUpdatePromises.set(key, updatePromise);
    return updatePromise;
  }

  /**
   * Prefetch trends data intelligently
   */
  private prefetchTrendsData(): void {
    this.queryClient.prefetchQuery({
      queryKey: dashboardQueryKeys.trends(),
      queryFn: dashboardClient.getTrends,
      staleTime: this.config.maxCacheAge * 1.5,
    });
  }

  /**
   * Prefetch recent activity data
   */
  private prefetchRecentData(): void {
    this.queryClient.prefetchQuery({
      queryKey: dashboardQueryKeys.recent(),
      queryFn: dashboardClient.getRecent,
      staleTime: this.config.maxCacheAge * 0.6,
    });
  }

  /**
   * Check if cache is stale based on timestamp
   */
  private isCacheStale(
    lastUpdated?: number, 
    maxAge: number = this.config.maxCacheAge
  ): boolean {
    if (!lastUpdated) return true;
    return Date.now() - lastUpdated > maxAge;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors and 5xx status codes are retryable
    if (error?.name === 'NetworkError') return true;
    if (error?.status && error.status >= 500) return true;
    if (error?.code === 'NETWORK_ERROR') return true;
    return false;
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): {
    statsAge: number | null;
    recentAge: number | null;
    trendsAge: number | null;
    backgroundUpdateCount: number;
  } {
    const statsState = this.queryClient.getQueryState(dashboardQueryKeys.stats());
    const recentState = this.queryClient.getQueryState(dashboardQueryKeys.recent());
    const trendsState = this.queryClient.getQueryState(dashboardQueryKeys.trends());
    const now = Date.now();

    return {
      statsAge: statsState?.dataUpdatedAt ? now - statsState.dataUpdatedAt : null,
      recentAge: recentState?.dataUpdatedAt ? now - recentState.dataUpdatedAt : null,
      trendsAge: trendsState?.dataUpdatedAt ? now - trendsState.dataUpdatedAt : null,
      backgroundUpdateCount: this.backgroundUpdatePromises.size,
    };
  }

  /**
   * Force refresh all dashboard data
   */
  public async forceRefreshAll(): Promise<void> {
    await Promise.allSettled([
      this.queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats() }),
      this.queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.recent() }),
      this.queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.trends() }),
    ]);
  }

  /**
   * Clear all dashboard caches
   */
  public clearAllCaches(): void {
    this.queryClient.removeQueries({ queryKey: dashboardQueryKeys.all() });
  }
}

/**
 * Factory function to create cache manager
 */
export function createDashboardCacheManager(
  queryClient: QueryClient,
  config?: DashboardCacheConfig
): DashboardCacheManager {
  return new DashboardCacheManager(queryClient, config);
}

/**
 * Hook to access cache manager in React components
 */
export function useDashboardCache(config?: DashboardCacheConfig) {
  const queryClient = new QueryClient();
  const cacheManager = createDashboardCacheManager(queryClient, config);
  
  return {
    cacheManager,
    getCacheStats: () => cacheManager.getCacheStats(),
    forceRefresh: () => cacheManager.forceRefreshAll(),
    clearCache: () => cacheManager.clearAllCaches(),
  };
}