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

// ===== QQ 扫码登录 =====
// 生成二维码：返回 { qrcode(base64), qrsig, ptqrtoken, pt_login_sig, pt_openlogin_data, xlogin_url, cookie }
export const qqLoginCreate = () => request('/login/qq/qr/create');

// 轮询扫码状态：传入 create 返回的全部字段
// 返回：{ status:'wait' } 等待 | { status:'expired' } 失效 | { status:1, data:{ token,userid,... } } 成功
export const qqLoginCheck = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  return request(`/login/qq/qr/check?${qs.toString()}`);
};

// ===== 微信扫码登录 =====
// 生成二维码：返回 { errcode, uuid, appname, qrcode:{ qrcodebase64 } }
export const wxLoginCreate = () => request('/login/wx/create');

// 轮询扫码状态：微信确认授权后返回授权码 code
export const wxLoginCheck = (uuid) =>
  request(`/login/wx/check?uuid=${encodeURIComponent(uuid)}`);

// 用微信授权码换取酷狗 token
export const wxLoginOpenplat = (code) =>
  request(`/login/openplat?code=${encodeURIComponent(code)}`);

// 基于axios的文件下载功能
export const downloadSong = async (hash, filename, onProgress) => {
  try {
    // 获取歌曲URL
    const songData = await getSongUrl(hash);
    
    if (!songData?.backupUrl?.[0]) {
      throw new Error('无法获取歌曲下载地址');
    }
    
    const downloadUrl = songData.backupUrl[0];
    // 使用歌曲真实的音频格式作为扩展名（m4a/flac/mp3 等），避免把 m4a 存成 .mp3
    const extension = (songData.extName || 'mp3').toLowerCase();
    
    // 生成最终文件名：若传入的 filename 扩展名与真实格式不符，替换为真实格式
    let finalFilename = filename || `歌曲_${Date.now()}.${extension}`;
    if (filename && !filename.toLowerCase().endsWith(`.${extension}`)) {
      finalFilename = filename.replace(/\.[^.]+$/, `.${extension}`);
    }
    
    // 初始化进度
    if (onProgress) {
      onProgress(0, finalFilename, 0, 0);
    }
    
    // 使用axios下载文件（经后端代理：浏览器无法设置酷狗UA/Referer，直接下载会拿到占位假数据）
    const proxyUrl = `${import.meta.env.VITE_API_BASE_URL}/download/proxy?url=${encodeURIComponent(downloadUrl)}`;
    const response = await axios({
      method: 'GET',
      url: proxyUrl,
      responseType: 'blob',
      timeout: 120000, // 120秒超时（大文件）
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
    
    // 下载后自检：酷狗对版权/付费歌返回"开头正常+主体全是空字节"的占位假数据，检测并拦截
    const rawBuf = await response.data.arrayBuffer();
    const bytes = new Uint8Array(rawBuf);
    const totalLen = bytes.length;
    const checkStart = Math.min(4096, totalLen);   // 跳过开头（可能是正常的 ID3/帧头）
    const bodyLen = Math.max(0, totalLen - checkStart);
    const maxSample = 200000;                      // 最多采样20万字节，避免大文件卡顿
    const sampleLen = Math.min(bodyLen, maxSample);
    const step = bodyLen > maxSample ? Math.floor(bodyLen / maxSample) : 1;
    let zeroCnt = 0;
    let sampleEnd = 0;
    for (let i = checkStart; i < totalLen && sampleEnd < sampleLen; i += step, sampleEnd++) {
      if (bytes[i] === 0) zeroCnt++;
    }
    const sampled = sampleEnd || 1;
    const zeroRatio = zeroCnt / sampled;
    if (zeroRatio > 0.9) {
      throw new Error(
        '下载到的音频是酷狗返回的占位假数据（该歌为版权/付费歌曲，未解锁）。' +
          '请打开 http://localhost:3000/verifySlide.html 手动完成滑块验证后，再回来重新下载真实音频。'
      );
    }

    // 用自检后的原始字节创建文件对象
    const blob = new Blob([rawBuf], {
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
    const msg = String(error?.message || '');
    // 酷狗风控验证（20028 / "本次请求需要验证"）：给出明确指引，而不是泛泛报错
    if (/验证|20028|本次请求需要/.test(msg)) {
      throw new Error(
        '该歌曲触发酷狗滑块验证（付费/版权歌曲）。' +
          '请打开验证页 http://localhost:3000/verifySlide.html，' +
          '填入本次验证事件 ID 后手动完成一次滑块验证，再回来重试下载。'
      );
    }
    throw new Error(`下载失败: ${msg}`);
  }
};

// 获取用户创建及收藏的歌单列表（需登录）
// 注意：后端 user_playlist 模块用 POST（酷狗 /v7/get_all_list），且必须把 userid/token 放进请求体，
// 仅靠 Cookie 会被酷狗拒绝（返回 20010 token 失效）
export const getUserPlaylists = (page = 1, pagesize = 50) => {
  let auth = {};
  try {
    auth = JSON.parse(localStorage.getItem('auth') || '{}');
  } catch (e) {
    auth = {};
  }
  const body = { page, pagesize };
  if (auth.token) body.token = auth.token;
  if (auth.userid) body.userid = auth.userid;
  return request(`/user/playlist`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// 获取歌单内所有歌曲（需登录）
// 注意：用户自己的云歌单必须用新版接口 /playlist/track/all/new（POST，listid + token/userid），
// 旧接口 /playlist/track/all（get_other_list_file_nofilt）只支持公开歌单。
// 新版接口返回的字段结构不同（hash/singerinfo/albuminfo/name），此处归一化为标准字段。
const normalizeTrack = (raw) => {
  const singer = raw?.singerinfo?.[0]?.name || raw?.singer || raw?.SingerName || '';
  let songName =
    (raw?.name || '').replace(/\.(mp3|flac|wav|aac|ogg|m4a|ape)$/i, '') ||
    raw?.songname ||
    '未知歌曲';
  // name 形如 "歌手 - 歌名.mp3"，去掉歌手前缀
  if (singer && songName.startsWith(`${singer} - `)) {
    songName = songName.slice(singer.length + 3);
  }
  return {
    ...raw,
    FileHash: raw?.hash,
    hash: raw?.hash,
    OriSongName: songName,
    SingerName: singer || '未知歌手',
    AlbumName: raw?.albuminfo?.name || raw?.AlbumName || '',
    AlbumID: raw?.album_id || raw?.AlbumID || '',
  };
};

export const getPlaylistTracks = async (id, page = 1, pagesize = 30) => {
  let auth = {};
  try {
    auth = JSON.parse(localStorage.getItem('auth') || '{}');
  } catch (e) {
    auth = {};
  }
  const body = { listid: id, page, pagesize, type: 0 };
  if (auth.token) body.token = auth.token;
  if (auth.userid) body.userid = auth.userid;
  // 加随机参数绕过后端cache串扰：POST接口的缓存key不含请求体，不同歌单会命中同一缓存
  const cb = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const res = await request(`/playlist/track/all/new?_cb=${cb}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const rawLists = res?.data?.info || res?.data?.lists || [];
  return { ...res, data: { ...(res?.data || {}), lists: rawLists.map(normalizeTrack) } };
};

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