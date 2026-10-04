// src/utils/filename.js
// 文件命名工具函数

/**
 * 清理文件名中的非法字符
 * @param {string} filename - 原始文件名
 * @returns {string} 清理后的文件名
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return 'unknown';
  
  return filename
    // 替换Windows不允许的字符
    .replace(/[<>:"/\\|?*]/g, '_')
    // 替换控制字符（ESLint忽略控制字符检查）
    /* eslint-disable no-control-regex */
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '_')
    /* eslint-enable no-control-regex */
    // 合并多个连续的下划线
    .replace(/_+/g, '_')
    // 合并多个空格
    .replace(/\s+/g, ' ')
    // 去除首尾空格和下划线
    .trim()
    .replace(/^_+|_+$/g, '');
};

/**
 * 生成规范的音乐文件名
 * 格式: 歌手 - 歌曲名.扩展名
 * @param {Object} song - 歌曲对象
 * @param {string} extension - 文件扩展名
 * @returns {string} 完整的文件名
 */
export const generateMusicFilename = (song, extension = 'mp3') => {
  // 获取歌手名和歌曲名，提供默认值
  const singerName = song.SingerName || song.singer || song.artist || '未知歌手';
  const songName = song.OriSongName || song.songName || song.title || '未知歌曲';
  
  // 清理歌手名和歌曲名
  const cleanSinger = sanitizeFilename(singerName);
  const cleanSong = sanitizeFilename(songName);
  
  // 组合文件名
  let filename = `${cleanSinger} - ${cleanSong}`;
  
  // 添加扩展名
  if (extension) {
    filename += `.${extension.toLowerCase()}`;
  }
  
  // 限制文件名长度（Windows最大255字符）
  if (filename.length > 200) {
    const ext = extension ? `.${extension.toLowerCase()}` : '';
    const maxLength = 200 - ext.length;
    filename = `${filename.substring(0, maxLength)}${ext}`;
  }
  
  return filename;
};

/**
 * 从URL获取文件扩展名
 * @param {string} url - 文件URL
 * @returns {string} 扩展名
 */
export const getFileExtensionFromUrl = (url) => {
  if (!url) return 'mp3';
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    
    // 常见音频格式映射
    const audioExtensions = {
      'mp3': 'mp3',
      'flac': 'flac',
      'wav': 'wav',
      'aac': 'aac',
      'm4a': 'm4a',
      'ogg': 'ogg',
      'wma': 'wma'
    };
    
    return audioExtensions[ext] || 'mp3';
  } catch (error) {
    console.warn('解析URL扩展名失败:', error);
    return 'mp3';
  }
};

/**
 * 直接触发文件下载
 * @param {string} url - 文件下载URL
 * @param {string} filename - 文件名
 */
export const triggerDownload = (url, filename) => {
  try {
    // 创建隐藏的下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // 添加到DOM并触发点击
    document.body.appendChild(link);
    link.click();
    
    // 延迟清理DOM元素
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);
    
    console.log(`开始下载文件: ${filename}`);
    return true;
  } catch (error) {
    console.error('触发下载失败:', error);
    return false;
  }
};