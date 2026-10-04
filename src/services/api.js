// src/services/api.js
import axios from 'axios';

// 创建axios实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证信息
    const auth = localStorage.getItem('auth');
    if (auth) {
      const cookie = Object.entries(JSON.parse(auth))
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      config.headers.Cookie = cookie;
    }
    console.log('请求:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log('响应:', response);
    return response.data;
  },
  (error) => {
    console.error('请求错误:', error);
    if (error.response?.status === 502) {
      throw new Error(error.response.data?.error_msg || '服务器错误');
    }
    throw error;
  }
);

export const request = async (endpoint, options = {}) => {
    // 构造完整 URL
    let url = `${import.meta.env.VITE_API_BASE_URL}${endpoint}`;
    console.log('request......', url)
    const auth = localStorage.getItem('auth');
    // 将store中的cookie转换为字符串，并设置到请求头中
    const cookie = auth ? Object.entries(auth).map(([k, v]) => `${k}=${v}`).join('; ') : '';

    const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        ...options.headers,
    };

    options = {
        ...options,
        headers,
    }


    return fetch(url, { ...options, credentials: 'include' })
        .then((res) => {
            console.log('res', res)
            if (res.status === 502) {
                return res.json().then((data) => {
                    throw new Error(data.error_msg)
                })
            }
            return res.json()
        })
        .then((data) => {
            console.log('data', data)
            return data
        })
        .catch((error) => {
            throw new Error(error);
        });
}


export const getSongUrl = (hash) => request(`/song/url?hash=${hash}&quality=320`);

// 基于axios的文件下载功能
export const downloadSong = async (hash, filename, onProgress) => {
  try {
    // 获取歌曲URL
    const songData = await getSongUrl(hash);
    
    if (!songData?.backupUrl?.[0]) {
      throw new Error('无法获取歌曲下载地址');
    }
    
    const downloadUrl = songData.backupUrl[0];
    const extension = songData.extName || 'mp3';
    
    // 生成最终文件名
    const finalFilename = filename || `歌曲_${Date.now()}.${extension}`;
    
    // 初始化进度
    if (onProgress) {
      onProgress(0, finalFilename, 0, 0);
    }
    
    // 使用axios下载文件
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'blob',
      timeout: 60000, // 60秒超时
      onDownloadProgress: (progressEvent) => {
        let percentCompleted = 0;
        const loaded = progressEvent.loaded || 0;
        const total = progressEvent.total || 0;
        
        if (total > 0) {
          percentCompleted = Math.round((loaded * 100) / total);
        }
        
        // 调用进度回调函数，传递百分比、文件名、已下载字节数、总字节数
        if (onProgress) {
          onProgress(percentCompleted, finalFilename, loaded, total);
        }
        console.log(`下载进度: ${percentCompleted}% (已下载: ${(loaded / 1024 / 1024).toFixed(2)} MB / 总计: ${total > 0 ? (total / 1024 / 1024).toFixed(2) : '未知'} MB)`);
      }
    });
    
    // 创建文件对象
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'audio/mpeg'
    });
    
    // 触发下载
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // 清理资源
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    }, 100);
    
    // 下载完成，进度设为100%
    if (onProgress && response.data) {
      const totalSize = response.data.size || 0;
      onProgress(100, finalFilename, totalSize, totalSize);
    }
    
    console.log(`下载完成: ${finalFilename}`);
    return { success: true, filename: finalFilename };
    
  } catch (error) {
    console.error('下载失败:', error);
    // 下载失败时，移除进度
    if (onProgress) {
      onProgress(0, '');
    }
    throw new Error(`下载失败: ${error.message}`);
  }
};

// 获取用户创建及收藏的歌单列表（需登录）
export const getUserPlaylists = (page = 1, pagesize = 50) =>
  request(`/user/playlist?page=${page}&pagesize=${pagesize}`);

// 获取歌单内所有歌曲
export const getPlaylistTracks = (id, page = 1, pagesize = 30) =>
  request(`/playlist/track/all?id=${id}&page=${page}&pagesize=${pagesize}`);

// 搜索建议接口
export const getSuggestions = (keywords) => {
  if (!keywords?.trim()) {
    return Promise.resolve({ data: [] });
  }
  return request(`/search/suggest?keywords=${encodeURIComponent(keywords.trim())}&mvTipCount=0`);
};

// 获取专辑封面图片
export const getAlbumImages = (hash, albumId = '') => {
  const params = new URLSearchParams();
  params.append('hash', hash);
  if (albumId) {
    params.append('album_id', albumId);
  }
  // 根据实际API调整参数
  params.append('count', '5'); // 获取多张图片以确保能找到合适的封面
  
  return request(`/images?${params.toString()}`);
};