import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Spin, List, Skeleton } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

/**
 * 优化的无限滚动组件
 * 基于CSDN文章的最佳实践实现
 */
const OptimizedInfiniteScroll = ({
  data = [],
  loadMore,
  hasMore = false,
  loading = false,
  renderItem,
  threshold = 0.1,
  debounceDelay = 300,
  endMessage = null,
  loader = null,
  className = '',
  style = {},
  ...restProps
}) => {
  const [intersectionLoading, setIntersectionLoading] = useState(false);
  const observerTarget = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const lastLoadTimeRef = useRef(0);

  // 防抖加载函数
  const debouncedLoadMore = useCallback(() => {
    const now = Date.now();
    // 防止过于频繁的加载请求（至少间隔debounceDelay毫秒）
    if (now - lastLoadTimeRef.current < debounceDelay) {
      return;
    }

    if (hasMore && !loading && !intersectionLoading) {
      setIntersectionLoading(true);
      lastLoadTimeRef.current = now;
      
      loadMore().finally(() => {
        setIntersectionLoading(false);
        // 清除超时定时器
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      });

      // 设置超时保护，防止加载状态卡住
      loadingTimeoutRef.current = setTimeout(() => {
        setIntersectionLoading(false);
      }, 10000); // 10秒超时
    }
  }, [hasMore, loading, intersectionLoading, loadMore, debounceDelay]);

  // 创建Intersection Observer
  useEffect(() => {
    if (!hasMore || data.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          debouncedLoadMore();
        }
      },
      { 
        threshold: threshold,
        rootMargin: '100px' // 提前100px开始加载
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      observer.disconnect();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [hasMore, data.length, debouncedLoadMore, threshold]);

  // 渲染加载指示器
  const renderLoader = useMemo(() => {
    if (loader) return loader;
    
    return (
      <div className="infinite-scroll-loader" style={{ 
        textAlign: 'center', 
        padding: '20px', 
        color: '#1890ff' 
      }}>
        <LoadingOutlined style={{ fontSize: 20, marginRight: 8 }} />
        <span>加载更多内容...</span>
      </div>
    );
  }, [loader]);

  // 渲染结束消息
  const renderEndMessage = useMemo(() => {
    if (!endMessage || data.length === 0) return null;
    
    return (
      <div className="infinite-scroll-end" style={{ 
        textAlign: 'center', 
        padding: '20px', 
        color: '#999' 
      }}>
        {endMessage}
      </div>
    );
  }, [endMessage, data.length]);



  return (
    <div className={`optimized-infinite-scroll ${className}`} style={style}>
      <List
        dataSource={data}
        renderItem={renderItem}
        {...restProps}
      />
      
      {/* 观察目标元素 */}
      <div ref={observerTarget} style={{ height: '1px' }} />
      
      {/* 加载状态 */}
      {(loading || intersectionLoading) && renderLoader}
      

      
      {/* 结束消息 */}
      {!hasMore && !loading && !intersectionLoading && renderEndMessage}
    </div>
  );
};

export default OptimizedInfiniteScroll;