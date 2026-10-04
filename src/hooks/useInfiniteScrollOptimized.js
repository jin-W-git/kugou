import { useState, useCallback, useRef } from 'react';

/**
 * 优化的无限滚动Hook
 * 提供完整的无限滚动状态管理和加载逻辑
 */
const useInfiniteScrollOptimized = (initialPageSize = 15) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  const pageSize = initialPageSize;
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  /**
   * 重置所有状态
   */
  const reset = useCallback(() => {
    setData([]);
    setIsLoading(false);
    setIsLazyLoading(false);
    setCurrentPage(1);
    setTotal(0);
    setHasMore(true);
    setError(null);
    retryCountRef.current = 0;
  }, []);

  /**
   * 加载数据的核心函数
   */
  const loadData = useCallback(async (page, searchFunction, keyword, isAppend = false) => {
    if (!keyword?.trim()) {
      if (page === 1) {
        reset();
      }
      return false;
    }

    try {
      const setLoadingState = isAppend ? setIsLazyLoading : setIsLoading;
      setLoadingState(true);
      setError(null);

      const response = await searchFunction(page, keyword);
      
      if (response && response.data) {
        const newData = response.data.lists || [];
        const newTotal = response.data.total || 0;
        
        if (isAppend) {
          setData(prev => [...prev, ...newData]);
        } else {
          setData(newData);
        }
        
        setTotal(newTotal);
        setCurrentPage(page);
        setHasMore(page * pageSize < newTotal);
        retryCountRef.current = 0; // 成功后重置重试计数
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error(`加载第${page}页数据失败:`, err);
      setError(err.message || '加载失败');
      
      // 实现重试机制
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`正在重试第${retryCountRef.current}次...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current));
        return loadData(page, searchFunction, keyword, isAppend);
      }
      
      return false;
    } finally {
      const setLoadingState = isAppend ? setIsLazyLoading : setIsLoading;
      setLoadingState(false);
    }
  }, [pageSize, reset]);

  /**
   * 初始加载
   */
  const loadInitial = useCallback(async (searchFunction, keyword) => {
    return loadData(1, searchFunction, keyword, false);
  }, [loadData]);

  /**
   * 加载更多
   */
  const loadMore = useCallback(async (searchFunction, keyword) => {
    if (!hasMore || isLoading || isLazyLoading) {
      return Promise.resolve(false);
    }
    
    return loadData(currentPage + 1, searchFunction, keyword, true);
  }, [hasMore, isLoading, isLazyLoading, currentPage, loadData]);

  /**
   * 刷新当前数据
   */
  const refresh = useCallback(async (searchFunction, keyword) => {
    return loadData(currentPage, searchFunction, keyword, false);
  }, [loadData, currentPage]);

  return {
    // 状态
    data,
    isLoading,
    isLazyLoading,
    currentPage,
    total,
    hasMore,
    error,
    pageSize,
    
    // 操作函数
    loadInitial,
    loadMore,
    refresh,
    reset,
    
    // 状态设置器（用于特殊情况）
    setData,
    setHasMore,
    setError
  };
};

export default useInfiniteScrollOptimized;