# 酷狗音乐下载器 (Music Downloader)

基于 Web 的酷狗音乐 MP3 下载工具，支持搜索、试听与下载高品质 MP3（320kbps）。

**在线访问**：[http://music-downloader.steinseye.top/](http://music-downloader.steinseye.top/)

## 功能说明

- **MP3 下载**：支持将酷狗音乐以 MP3 格式下载到本地
- **搜索与试听**：搜索歌曲、在线试听

## 重要说明

### 访问方式：请使用 HTTP，不要使用 HTTPS

**请务必使用 HTTP 访问本应用**（例如：`http://localhost:5173`、`http://你的域名`）。  
若通过 HTTPS 访问，歌曲下载将无法正常工作。

### 登录与 VIP 要求

- **登录方式**：目前仅支持**手机验证码登录**
- **VIP 要求**：需要**酷狗 VIP 账号**才能正常获取并下载歌曲；非 VIP 可能无法获取播放/下载地址

## 技术栈

- 前端：React 19 + Vite 7 + Ant Design
- 后端 API：[KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi)（酷狗音乐 Node.js API 服务）

## 环境要求

- Node.js 18+
- 需先部署并运行 [KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi) 作为后端

## 快速开始

### 1. 部署并启动后端 API

后端由 [KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi) 提供，请先克隆并启动：

```bash
git clone https://github.com/MakcRe/KuGouMusicApi.git
cd KuGouMusicApi
npm install
npm run dev
```

默认会在 `http://localhost:3000` 启动。若使用概念版接口，请按该仓库说明配置 `.env`（如 `platform=lite`）。

### 2. 配置本前端项目

克隆本项目并安装依赖：

```bash
git clone https://github.com/Genshinpp/kugou-music-downloader.git
cd music-downloader
npm install
```

配置后端地址（**请使用 http，不要使用 https**）：

- 开发环境：编辑 `.env.development`，设置 `VITE_API_BASE_URL=http://localhost:3000`（或你的 API 地址）
- 生产环境：编辑 `.env.production`，同样使用 `http://...` 形式的 API 地址

### 3. 启动开发服务器

```bash
npm run dev
```

在浏览器中**使用 HTTP 访问**（例如 `http://localhost:5173`），不要用 `https://`。

### 4. 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。部署时请确保站点通过 **HTTP** 对外提供访问，且环境变量中的 `VITE_API_BASE_URL` 为 **http** 地址。

## 项目脚本

| 命令           | 说明           |
|----------------|----------------|
| `npm run dev`  | 启动开发服务器 |
| `npm run build`| 生产环境构建   |
| `npm run preview` | 预览构建结果 |
| `npm run lint` | 运行 ESLint    |

## 免责声明

- 本项目仅供学习与个人使用，请尊重版权，勿用于商业或非法用途
- 使用过程中产生的版权数据请勿长期保存，请遵守相关法律法规
- 音乐版权归酷狗及版权方所有，请支持正版

## 相关链接

- **在线访问**：[http://music-downloader.steinseye.top/](http://music-downloader.steinseye.top/)
- 后端 API 项目：[KuGouMusicApi](https://github.com/MakcRe/KuGouMusicApi)
