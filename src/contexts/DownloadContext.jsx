// src/contexts/DownloadContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// 创建分离的Context
const DownloadStateContext = createContext();
const DownloadActionsContext = createContext();

// Provider 组件
export const DownloadProvider = ({ children }) => {
  // 下载进度状态：{ [hash]: { progress: number, loaded: number, total: number, filename: string, speed: number, timeRemaining: number, lastUpdateTime: number, lastLoaded: number } }
  const [downloadProgress, setDownloadProgress] = useState({});
  // 存储每个下载的时间戳和上次下载量，用于计算速度
  const progressHistoryRef = useRef({});

  // 更新下载进度
  const updateProgress = useCallback((hash, progress, filename = '', loaded = 0, total = 0) => {
    const now = Date.now();
    const history = progressHistoryRef.current[hash] || {
      lastTime: now,
      lastLoaded: 0
    };

    let speed = 0; // MB/s
    let timeRemaining = 0; // 秒

    // 计算下载速度（基于时间差和下载量差）
    if (loaded > 0) {
      const timeDiff = (now - history.lastTime) / 1000; // 秒
      const loadedDiff = loaded - history.lastLoaded; // 字节
      
      // 至少需要0.1秒的时间差才计算速度，避免初始阶段速度异常
      if (timeDiff >= 0.1 && loadedDiff > 0) {
        // 速度 = 下载量差 / 时间差 (MB/s)
        speed = (loadedDiff / 1024 / 1024) / timeDiff;
        
        // 计算剩余时间（如果知道总大小且速度 > 0）
        if (total > 0 && speed > 0) {
          const remainingBytes = total - loaded;
          timeRemaining = Math.max(0, remainingBytes / 1024 / 1024 / speed); // 秒，确保不为负数
        }
      }
    }

    // 更新历史记录（每次更新，但只在有明显变化时计算速度）
    if (loaded !== history.lastLoaded || now - history.lastTime > 500) {
      progressHistoryRef.current[hash] = {
        lastTime: now,
        lastLoaded: loaded
      };
    }

    setDownloadProgress(prev => ({
      ...prev,
      [hash]: {
        progress: Math.min(100, Math.max(0, progress)), // 限制在 0-100 之间
        loaded: loaded || 0, // 已下载字节数
        total: total || 0, // 总字节数
        filename,
        speed: speed || 0, // 下载速度 MB/s
        timeRemaining: timeRemaining || 0 // 剩余时间 秒
      }
    }));
  }, []);

  // 移除下载进度（下载完成或失败时）
  const removeProgress = useCallback((hash) => {
    setDownloadProgress(prev => {
      const newState = { ...prev };
      delete newState[hash];
      return newState;
    });
    // 清理历史记录
    delete progressHistoryRef.current[hash];
  }, []);

  // 清除所有下载进度
  const clearAllProgress = useCallback(() => {
    setDownloadProgress({});
    progressHistoryRef.current = {};
  }, []);

  // 获取指定歌曲的下载进度
  const getProgress = useCallback((hash) => {
    return downloadProgress[hash] || null;
  }, [downloadProgress]);

  // 检查是否正在下载
  const isDownloading = useCallback((hash) => {
    const progress = downloadProgress[hash];
    return progress && progress.progress > 0 && progress.progress < 100;
  }, [downloadProgress]);

  const stateValue = {
    downloadProgress
  };

  const actionsValue = {
    updateProgress,
    removeProgress,
    clearAllProgress,
    getProgress,
    isDownloading
  };

  return (
    <DownloadStateContext.Provider value={stateValue}>
      <DownloadActionsContext.Provider value={actionsValue}>
        {children}
      </DownloadActionsContext.Provider>
    </DownloadStateContext.Provider>
  );
};

// 自定义 Hooks
export const useDownloadState = () => {
  const context = useContext(DownloadStateContext);
  if (!context) {
    throw new Error('useDownloadState 必须在 DownloadProvider 内部使用');
  }
  return context;
};

export const useDownloadActions = () => {
  const context = useContext(DownloadActionsContext);
  if (!context) {
    throw new Error('useDownloadActions 必须在 DownloadProvider 内部使用');
  }
  return context;
};

// 兼容旧的useDownload Hook
export const useDownload = () => {
  const state = useDownloadState();
  const actions = useDownloadActions();
  return { ...state, ...actions };
};

export default DownloadStateContext;
