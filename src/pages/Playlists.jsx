// src/pages/Playlists.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spin, Empty, message, Progress, Checkbox, Button, Tooltip, Tag } from "antd";
import {
  PlayCircleOutlined,
  DownloadOutlined,
  UserOutlined,
  DatabaseOutlined,
  LoadingOutlined,
  CloudDownloadOutlined,
  CheckOutlined,
  ClearOutlined,
  ArrowLeftOutlined,
  HeartOutlined,
  FolderOpenOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import {
  getUserPlaylists,
  getPlaylistTracks,
  getSongUrl,
  getAlbumImages,
  downloadSong,
} from "../services/api";
import { generateMusicFilename } from "../utils/filename";
import { useAuth } from "../contexts/AuthContext";
import { usePlayerActions } from "../contexts/PlayerContext";
import { useDownloadActions, useDownloadState } from "../contexts/DownloadContext";

// 获取封面图URL（兼容不同字段和 {size} 模板）
const resolvePlaylistCover = (pl) => {
  const raw = pl?.img || pl?.cover || pl?.imgurl || pl?.cover_url || pl?.pic || "";
  if (!raw) return "";
  return raw.replace("{size}", "300").replace("{width}", "300").replace("{height}", "300");
};

// 歌单ID（兼容不同字段）
const resolvePlaylistId = (pl) =>
  pl?.specialid || pl?.special_id || pl?.listid || pl?.id || pl?.global_collection_id || pl?.cloudlist_id;

const Playlists = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 视图状态：'list' = 歌单列表；{ id, name } = 某个歌单的歌曲
  const [view, setView] = useState("list");
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  // 歌单歌曲
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [albumImages, setAlbumImages] = useState({});

  // 批量下载
  const [selectedHashes, setSelectedHashes] = useState(new Set());
  const [batchDownloading, setBatchDownloading] = useState(false);

  const { playSong } = usePlayerActions();
  const { downloadProgress } = useDownloadState();
  const { updateProgress, removeProgress } = useDownloadActions();

  // 加载用户歌单列表
  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const res = await getUserPlaylists(1, 100);
      const info = res?.data?.info || res?.data?.lists || [];
      setPlaylists(info);
      if (info.length === 0) {
        message.info("该账号暂无歌单");
      }
    } catch (error) {
      console.error("获取歌单失败:", error);
      message.error("获取歌单失败，请确认已登录酷狗账号");
    } finally {
      setLoadingPlaylists(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && view === "list") {
      loadPlaylists();
    }
  }, [isAuthenticated, view, loadPlaylists]);

  // 批量获取歌曲封面（必须先于 openPlaylist 定义，否则触发 TDZ ReferenceError）
  const fetchAlbumImagesBatch = useCallback(async (songs) => {
    try {
      const CONCURRENT_LIMIT = 5;
      const results = [];
      for (let i = 0; i < songs.length; i += CONCURRENT_LIMIT) {
        const batch = songs.slice(i, i + CONCURRENT_LIMIT);
        const batchPromises = batch.map(song =>
          getAlbumImages(song.FileHash, song.AlbumID || "")
            .then(res => ({ song, res }))
            .catch(error => ({ song, error }))
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        if (i + CONCURRENT_LIMIT < songs.length) {
          await new Promise(r => setTimeout(r, 50));
        }
      }
      const newImages = {};
      results.forEach(({ song, res }) => {
        if (!res?.data || res.data.length === 0) return;
        let imageUrl = "";
        if (res.data[0].album && res.data[0].album.length > 0) {
          const album = res.data[0].album[0];
          imageUrl = album.sizable_cover || "";
          if (imageUrl) imageUrl = imageUrl.replace("{size}", "200");
        }
        if (!imageUrl && res.data[0].author && res.data[0].author.length > 0) {
          const author = res.data[0].author[0];
          if (author.imgs && author.imgs["3"] && author.imgs["3"].length > 0) {
            imageUrl = author.imgs["3"][0]?.sizable_portrait || "";
            if (imageUrl) imageUrl = imageUrl.replace("{size}", "200");
          } else if (author.imgs && author.imgs["4"] && author.imgs["4"].length > 0) {
            imageUrl = author.imgs["4"][0]?.sizable_portrait || "";
            if (imageUrl) imageUrl = imageUrl.replace("{size}", "200");
          } else if (author.sizable_avatar) {
            imageUrl = author.sizable_avatar.replace("{size}", "200");
          }
        }
        if (imageUrl) newImages[song.FileHash] = imageUrl;
      });
      setAlbumImages(prev => ({ ...prev, ...newImages }));
    } catch (error) {
      console.error("获取封面失败:", error);
    }
  }, []);

  // 获取歌单内歌曲
  const openPlaylist = useCallback(async (pl) => {
    const id = resolvePlaylistId(pl);
    if (!id) {
      message.error("歌单ID无效");
      return;
    }
    const name = pl?.specialname || pl?.name || pl?.title || "我的歌单";
    setView({ id, name });
    setLoadingTracks(true);
    setPlaylistSongs([]);
    setSelectedHashes(new Set());
    try {
      const res = await getPlaylistTracks(id, 1, 100);
      const lists = res?.data?.lists || [];
      setPlaylistSongs(lists);
      if (lists.length > 0) {
        fetchAlbumImagesBatch(lists);
      }
      if (lists.length === 0) {
        message.info("该歌单暂无歌曲");
      }
    } catch (error) {
      console.error("获取歌单歌曲失败:", error);
      message.error("获取歌单歌曲失败");
    } finally {
      setLoadingTracks(false);
    }
  }, [fetchAlbumImagesBatch]);

  // 播放
  const handlePlaySong = useCallback(async (song) => {
    try {
      const res = await getSongUrl(song.FileHash);
      const url = res.backupUrl[0];
      playSong({
        ...song,
        title: song.OriSongName,
        artist: song.SingerName,
        album: song.AlbumName,
        url: url,
      });
    } catch (error) {
      console.error("播放失败:", error);
      message.error("播放失败，请稍后重试");
    }
  }, [playSong]);

  // 单个下载
  const handleDownload = useCallback(async (song) => {
    const hash = song.FileHash;
    try {
      const filename = generateMusicFilename(song);
      const progressCallback = (progress, f, loaded, total) =>
        updateProgress(hash, progress, f, loaded, total);
      const result = await downloadSong(hash, filename, progressCallback);
      if (result.success) {
        message.success(`下载成功: ${result.filename}`);
        setTimeout(() => removeProgress(hash), 1000);
      }
    } catch (error) {
      console.error("下载失败:", error);
      message.error(`下载失败: ${error.message}`);
      removeProgress(hash);
    }
  }, [updateProgress, removeProgress]);

  // 批量下载
  const downloadOne = useCallback(async (song) => {
    const hash = song.FileHash;
    const filename = generateMusicFilename(song);
    const progressCallback = (progress, f, loaded, total) =>
      updateProgress(hash, progress, f, loaded, total);
    // 失败自动重试（避开酷狗风控限流）：最多3次，等待时间递增
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await downloadSong(hash, filename, progressCallback);
        setTimeout(() => removeProgress(hash), 1000);
        return result.success;
      } catch (error) {
        const msg = String(error?.message || '');
        // 仅对酷狗风控/占位假数据类错误重试；其他错误直接抛出
        const isRisk = /验证|20028|本次请求需要|占位|假数据/.test(msg);
        if (attempt < MAX_ATTEMPTS && isRisk) {
          console.warn(`[批量下载] 第${attempt}次触发酷狗风控，${attempt * 4}秒后自动重试: ${song.OriSongName}`);
          await new Promise((r) => setTimeout(r, attempt * 4000));
          continue;
        }
        throw error;
      }
    }
    return false;
  }, [updateProgress, removeProgress]);

  const handleBatchDownload = useCallback(async () => {
    if (batchDownloading) return;
    const selectedSongs = playlistSongs.filter(s => selectedHashes.has(s.FileHash));
    if (selectedSongs.length === 0) {
      message.warning("请先勾选要下载的歌曲");
      return;
    }
    setBatchDownloading(true);
    message.info(`开始批量下载 ${selectedSongs.length} 首歌曲...`);
    const CONCURRENCY = 2;
    const queue = [...selectedSongs];
    let completed = 0;
    let failed = 0;
    const total = selectedSongs.length;
    const worker = async () => {
      while (queue.length > 0) {
        const song = queue.shift();
        // 降频：每首间隔2.5秒，避免高频请求触发酷狗风控(20028)
        await new Promise(r => setTimeout(r, 2500));
        try {
          await downloadOne(song);
          completed++;
        } catch (error) {
          failed++;
          console.error(`批量下载失败: ${song.OriSongName}`, error);
        }
      }
    };
    const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
    await Promise.all(workers);
    setBatchDownloading(false);
    setSelectedHashes(new Set());
    if (failed === 0) {
      message.success(`✅ 全部 ${completed} 首歌曲下载完成`);
    } else {
      message.warning(`下载完成：成功 ${completed} 首，失败 ${failed} 首`);
    }
  }, [batchDownloading, playlistSongs, selectedHashes, downloadOne]);

  // 勾选/全选/清空
  const handleToggleSelect = useCallback((song) => {
    setSelectedHashes(prev => {
      const next = new Set(prev);
      if (next.has(song.FileHash)) next.delete(song.FileHash);
      else next.add(song.FileHash);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedHashes(new Set(playlistSongs.map(s => s.FileHash)));
  }, [playlistSongs]);

  const handleClearSelection = useCallback(() => {
    setSelectedHashes(new Set());
  }, []);

  // 格式化字节
  const formatBytesToMB = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB';
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };
  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '';
    if (seconds < 60) return `${Math.ceil(seconds)}秒`;
    const minutes = Math.floor(seconds / 60);
    if (seconds < 3600) return `${minutes}分${Math.ceil(seconds % 60)}秒`;
    const hours = Math.floor(seconds / 3600);
    return `${hours}小时${Math.floor((seconds % 3600) / 60)}分钟`;
  };
  const formatSpeed = (speed) => {
    if (!speed || speed <= 0) return '';
    if (speed < 1) return `${(speed * 1024).toFixed(2)} KB/s`;
    return `${speed.toFixed(2)} MB/s`;
  };

  // ===== 未登录提示 =====
  if (!isAuthenticated) {
    return (
      <div className="playlist-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="登录后查看你的酷狗歌单"
        >
          <Button
            type="primary"
            icon={<LoginOutlined />}
            onClick={() => navigate('/login')}
          >
            去登录
          </Button>
        </Empty>
      </div>
    );
  }

  // ===== 歌单列表视图 =====
  if (view === "list") {
    return (
      <div className="playlists-container">
        <div className="playlists-header">
          <h2 className="section-title">🎼 我的歌单</h2>
          <div className="results-info">
            <span>共 {playlists.length} 个歌单</span>
          </div>
        </div>

        {loadingPlaylists ? (
          <div className="loading-center">
            <Spin tip="加载歌单中..." />
          </div>
        ) : playlists.length === 0 ? (
          <Empty description="暂无歌单，请先在酷狗客户端创建歌单" />
        ) : (
          <div className="playlist-grid">
            {playlists.map((pl, index) => {
              const plId = resolvePlaylistId(pl);
              const cover = resolvePlaylistCover(pl);
              const name = pl?.specialname || pl?.name || pl?.title || "未命名歌单";
              const songCount = pl?.count || pl?.songcount || pl?.song_count || pl?.songnum || 0;
              const isCollect = pl?.is_collect || pl?.isCollect || (pl?.type === 1);
              return (
                <div
                  className="playlist-card"
                  key={`${plId}-${index}`}
                  onClick={() => plId && openPlaylist(pl)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') plId && openPlaylist(pl); }}
                >
                  <div className="playlist-card-cover">
                    {cover ? (
                      <img
                        src={cover}
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="playlist-cover-placeholder">🎵</div>
                    <div className="playlist-count-badge">
                      <span>{songCount} 首</span>
                    </div>
                  </div>
                  <div className="playlist-card-info">
                    <div className="playlist-card-name" title={name}>{name}</div>
                    <div className="playlist-card-tags">
                      {isCollect ? (
                        <Tag color="magenta" icon={<HeartOutlined />} style={{ margin: 0 }}>
                          收藏
                        </Tag>
                      ) : (
                        <Tag color="geekblue" icon={<FolderOpenOutlined />} style={{ margin: 0 }}>
                          创建
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===== 歌单歌曲视图 =====
  const selectedCount = selectedHashes.size;
  const currentName = view.name || "歌单歌曲";
  return (
    <div className="playlists-container">
      <div className="playlists-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setView("list")}
          className="back-btn"
        >
          返回歌单列表
        </Button>
        <h2 className="section-title">🎶 {currentName}</h2>
        <div className="results-info">
          <span>共 {playlistSongs.length} 首歌曲</span>
        </div>
      </div>

      {/* 批量工具栏 */}
      {playlistSongs.length > 0 && (
        <div className="batch-toolbar">
          <div className="batch-toolbar-left">
            <Button size="small" icon={<CheckOutlined />} onClick={handleSelectAll} disabled={batchDownloading}>
              全选
            </Button>
            <Button size="small" icon={<ClearOutlined />} onClick={handleClearSelection} disabled={selectedCount === 0 || batchDownloading}>
              清空
            </Button>
            <span className="batch-selected-count">已选 {selectedCount} 首</span>
          </div>
          <div className="batch-toolbar-right">
            <Tooltip title="将选中的歌曲按顺序批量下载">
              <Button
                type="primary"
                size="small"
                icon={<CloudDownloadOutlined />}
                onClick={handleBatchDownload}
                disabled={selectedCount === 0 || batchDownloading}
                loading={batchDownloading}
              >
                {batchDownloading ? "批量下载中..." : `批量下载 (${selectedCount})`}
              </Button>
            </Tooltip>
          </div>
        </div>
      )}

      {loadingTracks ? (
        <div className="loading-center">
          <Spin tip="加载歌单歌曲中..." />
        </div>
      ) : playlistSongs.length === 0 ? (
        <Empty description="该歌单暂无歌曲" />
      ) : (
        <div className="song-list-container">
          <div className="song-list">
            {playlistSongs.map((song, index) => {
              const progress = downloadProgress?.[song.FileHash];
              const isDownloading = progress !== undefined && progress !== null;
              return (
                <div
                  className={`song-item ${selectedHashes.has(song.FileHash) ? 'song-item-selected' : ''}`}
                  key={`${song.FileHash}-${index}`}
                >
                  <div className="song-select-checkbox">
                    <Checkbox
                      checked={selectedHashes.has(song.FileHash)}
                      onChange={() => handleToggleSelect(song)}
                      disabled={isDownloading}
                    />
                  </div>
                  <div className="song-cover">
                    {albumImages[song.FileHash] ? (
                      <img
                        src={albumImages[song.FileHash]}
                        alt={song.AlbumName || "专辑封面"}
                        className="album-cover-img"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="album-cover-placeholder">🎵</div>
                  </div>
                  <div className="song-info">
                    <div className="song-title">
                      <PlayCircleOutlined className="title-icon" />
                      {song.OriSongName}
                    </div>
                    <div className="song-meta">
                      <span className="song-artist">
                        <UserOutlined /> {song.SingerName}
                      </span>
                      <span className="song-album">
                        <DatabaseOutlined /> {song.AlbumName || "未知专辑"}
                      </span>
                    </div>
                    {isDownloading && progress && (
                      <div className="download-progress-container" style={{ marginTop: '8px', width: '100%' }}>
                        <Progress
                          percent={progress.progress || 0}
                          size="small"
                          status={progress.progress === 100 ? "success" : "active"}
                          showInfo={true}
                          format={() => {
                            if (progress.progress === 100) return `下载完成 ${formatBytesToMB(progress.total)}`;
                            if (progress.progress === 0) return "准备下载...";
                            const loadedMB = formatBytesToMB(progress.loaded);
                            if (progress.total > 0) return `${loadedMB} / ${formatBytesToMB(progress.total)}`;
                            return `已下载 ${loadedMB}`;
                          }}
                          strokeColor={progress.progress === 100 ? '#87d068' : { '0%': '#108ee9', '100%': '#87d068' }}
                        />
                        {progress.progress > 0 && progress.progress < 100 && (
                          <div className="download-info">
                            <span>{progress.speed > 0 && <>速度: {formatSpeed(progress.speed)}</>}</span>
                            <span>{progress.timeRemaining > 0 && <>剩余: {formatTimeRemaining(progress.timeRemaining)}</>}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="song-actions">
                    <button className="action-button play-btn" onClick={() => handlePlaySong(song)}>
                      <PlayCircleOutlined />
                      播放
                    </button>
                    <button
                      className="action-button download-btn"
                      onClick={() => handleDownload(song)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <><LoadingOutlined />下载中</>
                      ) : (
                        <><DownloadOutlined />下载</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Playlists;
