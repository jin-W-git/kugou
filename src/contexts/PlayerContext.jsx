// src/contexts/PlayerContext.jsx
import React, { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react';
import { getAlbumImages } from '../services/api';

// 初始化音频上下文（备用）
// let audioContext = null;
// try {
//   audioContext = new (window.AudioContext || window.webkitAudioContext)();
// } catch (e) {
//   console.warn('音频上下文初始化失败:', e);
// }

// 初始状态
const initialState = {
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  playbackRate: 1.0,
  isLoading: false,
  error: null
};

// 播放器动作类型
const ACTIONS = {
  SET_CURRENT_SONG: 'SET_CURRENT_SONG',
  TOGGLE_PLAY: 'TOGGLE_PLAY',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  SET_TIME: 'SET_TIME',
  SET_DURATION: 'SET_DURATION',
  SET_VOLUME: 'SET_VOLUME',
  SET_PLAYBACK_RATE: 'SET_PLAYBACK_RATE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Reducer 函数
const playerReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_CURRENT_SONG:
      return {
        ...state,
        currentSong: action.payload,
        currentTime: 0,
        error: null
      };
    
    case ACTIONS.TOGGLE_PLAY:
      return {
        ...state,
        isPlaying: !state.isPlaying
      };
    
    case ACTIONS.PLAY:
      return {
        ...state,
        isPlaying: true
      };
    
    case ACTIONS.PAUSE:
      return {
        ...state,
        isPlaying: false
      };
    
    case ACTIONS.SET_TIME:
      return {
        ...state,
        currentTime: action.payload
      };
    
    case ACTIONS.SET_DURATION:
      return {
        ...state,
        duration: action.payload
      };
    
    case ACTIONS.SET_VOLUME:
      return {
        ...state,
        volume: Math.max(0, Math.min(1, action.payload))
      };
    
    case ACTIONS.SET_PLAYBACK_RATE:
      return {
        ...state,
        playbackRate: action.payload
      };
    
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    default:
      return state;
  }
};

// 创建分离的Context
const PlayerStateContext = createContext();
const PlayerActionsContext = createContext();

// Provider 组件
export const PlayerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const audioRef = useRef(null);

  // 获取专辑封面
  const fetchAlbumCover = async (song) => {
    try {
      const res = await getAlbumImages(song.FileHash, song.AlbumID || '');
      console.log('底部播放栏专辑图片API响应:', res);
      
      if (res.data && res.data.length > 0) {
        let imageUrl = '';
        
        // 优先检查 album 数组中的 sizable_cover
        if (res.data[0].album && res.data[0].album.length > 0) {
          const album = res.data[0].album[0];
          imageUrl = album.sizable_cover || '';
          if (imageUrl) {
            imageUrl = imageUrl.replace('{size}', '200');
          }
        }
        
        // 如果 album 中没有找到，检查 author 中的图片
        if (!imageUrl && res.data[0].author && res.data[0].author.length > 0) {
          const author = res.data[0].author[0];
          
          // 优先使用 imgs['3'] 中的图片
          if (author.imgs && author.imgs['3'] && author.imgs['3'].length > 0) {
            imageUrl = author.imgs['3'][0]?.sizable_portrait || '';
            if (imageUrl) {
              imageUrl = imageUrl.replace('{size}', '200');
            }
          } 
          // 其次使用 imgs['4'] 中的图片
          else if (author.imgs && author.imgs['4'] && author.imgs['4'].length > 0) {
            imageUrl = author.imgs['4'][0]?.sizable_portrait || '';
            if (imageUrl) {
              imageUrl = imageUrl.replace('{size}', '200');
            }
          }
          // 最后使用 avatar
          else if (author.sizable_avatar) {
            imageUrl = author.sizable_avatar.replace('{size}', '200');
          }
        }
        
        if (imageUrl) {
          console.log(`为播放歌曲 ${song.OriSongName} 设置封面:`, imageUrl);
          return imageUrl;
        }
      }
      return null;
    } catch (error) {
      console.error('获取播放歌曲专辑图片失败:', error);
      return null;
    }
  };

  // 播放器操作函数
  const playSong = async (song) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    
    // 获取专辑封面
    const albumCover = await fetchAlbumCover(song);
    
    // 将专辑封面添加到歌曲对象中
    const songWithCover = {
      ...song,
      thumbnail: albumCover || song.thumbnail
    };
    
    dispatch({ type: ACTIONS.SET_CURRENT_SONG, payload: songWithCover });
    
    // 设置音频源
    if (audioRef.current) {
      audioRef.current.src = song.url || song.preview_url;
      audioRef.current.load();
      
      // 监听加载完成事件
      const handleLoadedMetadata = () => {
        dispatch({ 
          type: ACTIONS.SET_DURATION, 
          payload: audioRef.current.duration || 0 
        });
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        
        // 自动播放
        audioRef.current.play()
          .then(() => {
            dispatch({ type: ACTIONS.PLAY });
          })
          .catch(error => {
            console.error('播放失败:', error);
            dispatch({ type: ACTIONS.SET_ERROR, payload: '播放失败' });
            dispatch({ type: ACTIONS.SET_LOADING, payload: false });
          });
      };
      
      const handleError = (e) => {
        console.error('音频加载错误:', e);
        dispatch({ type: ACTIONS.SET_ERROR, payload: '音频加载失败' });
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      };
      
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      audioRef.current.addEventListener('error', handleError, { once: true });
    }
  };

  const togglePlay = () => {
    if (!state.currentSong) return;
    
    if (state.isPlaying) {
      audioRef.current?.pause();
      dispatch({ type: ACTIONS.PAUSE });
    } else {
      audioRef.current?.play()
        .then(() => {
          dispatch({ type: ACTIONS.PLAY });
        })
        .catch(error => {
          console.error('播放失败:', error);
          dispatch({ type: ACTIONS.SET_ERROR, payload: '播放失败' });
        });
    }
  };

  const pause = () => {
    audioRef.current?.pause();
    dispatch({ type: ACTIONS.PAUSE });
  };

  const play = () => {
    if (state.currentSong) {
      audioRef.current?.play()
        .then(() => {
          dispatch({ type: ACTIONS.PLAY });
        })
        .catch(error => {
          console.error('播放失败:', error);
          dispatch({ type: ACTIONS.SET_ERROR, payload: '播放失败' });
        });
    }
  };

  const seekTo = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch({ type: ACTIONS.SET_TIME, payload: time });
    }
  };

  const setVolume = (volume) => {
    const vol = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    dispatch({ type: ACTIONS.SET_VOLUME, payload: vol });
  };

  const setPlaybackRate = (rate) => {
    const validRate = Math.max(0.5, Math.min(2, rate));
    if (audioRef.current) {
      audioRef.current.playbackRate = validRate;
    }
    dispatch({ type: ACTIONS.SET_PLAYBACK_RATE, payload: validRate });
  };

  const setCurrentTime = useCallback((time) => {
    dispatch({ type: ACTIONS.SET_TIME, payload: time });
  }, [dispatch]);

  // 音频事件处理 - 使用节流优化性能
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 100; // 每100ms更新一次，而不是每次timeupdate事件

    const handleTimeUpdate = () => {
      const now = Date.now();
      // 节流：限制更新频率
      if (now - lastUpdateTime >= UPDATE_INTERVAL) {
        lastUpdateTime = now;
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      // 播放完毕后直接关闭播放器
      dispatch({ type: ACTIONS.PAUSE });
      dispatch({ type: ACTIONS.SET_CURRENT_SONG, payload: null });
      if (audioRef.current) {
        audioRef.current.src = '';
      }
    };

    const handleError = (e) => {
      console.error('音频播放错误:', e);
      dispatch({ type: ACTIONS.SET_ERROR, payload: '播放出错' });
      dispatch({ type: ACTIONS.PAUSE });
    };

    // 使用 requestAnimationFrame 进一步优化更新频率
    let rafId = null;
    const optimizedHandleTimeUpdate = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        handleTimeUpdate();
        rafId = null;
      });
    };

    audio.addEventListener('timeupdate', optimizedHandleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // 清理事件监听器
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      audio.removeEventListener('timeupdate', optimizedHandleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [dispatch, setCurrentTime]);

  // 同步音量设置
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  // 同步播放速率设置
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.playbackRate;
    }
  }, [state.playbackRate]);

  // 分离状态和操作方法的Context值
  const stateValue = {
    // 仅包含状态值
    currentSong: state.currentSong,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    duration: state.duration,
    volume: state.volume,
    playbackRate: state.playbackRate,
    isLoading: state.isLoading,
    error: state.error,
    // 引用
    audioRef
  };

  const actionsValue = {
    // 仅包含操作函数
    playSong,
    togglePlay,
    play,
    pause,
    seekTo,
    setVolume,
    setPlaybackRate,
    setCurrentTime
  };

  return (
    <PlayerStateContext.Provider value={stateValue}>
      <PlayerActionsContext.Provider value={actionsValue}>
        {children}
        {/* 隐藏的音频元素 */}
        <audio ref={audioRef} preload="metadata" />
      </PlayerActionsContext.Provider>
    </PlayerStateContext.Provider>
  );
};

// 自定义 Hooks
export const usePlayerState = () => {
  const context = useContext(PlayerStateContext);
  if (!context) {
    throw new Error('usePlayerState 必须在 PlayerProvider 内部使用');
  }
  return context;
};

export const usePlayerActions = () => {
  const context = useContext(PlayerActionsContext);
  if (!context) {
    throw new Error('usePlayerActions 必须在 PlayerProvider 内部使用');
  }
  return context;
};

// 兼容旧的usePlayer Hook
export const usePlayer = () => {
  const state = usePlayerState();
  const actions = usePlayerActions();
  return { ...state, ...actions };
};

export default PlayerStateContext;