// vite.config.js 文件
// 以下代码是以 react 为基础的，vue 也大差不差的。主要是看怎么配置和使用环境变量
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

// 获取 __dirname 等效值
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // 获取.env文件里定义的环境变量
    const env = loadEnv(mode, process.cwd(), '');
    console.log('env.......', env)

    return {
        plugins: [react()],
        server: {
            host: '0.0.0.0', // 主机名
            port: 5173, // 端口号
            strictPort: true, // 端口被占用时，是否停止服务
            open: true, // 启动服务时是否自动打开浏览器
            // 配置后端代理服务器（后端 KuGouMusicApi 默认运行在 localhost:3000）
            proxy: {
                '/api': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        resolve: {
            alias: {
                // 别名配置
                '@': resolve(__dirname, './src'),
                '@pages': resolve(__dirname, './src/pages'),
                '@assets': resolve(__dirname, './src/assets'),
                '@components': resolve(__dirname, './src/components'),
            },
        },
        build: {
            outDir: 'dist', // 打包后的文件存放位置，默认dist
            emptyOutDir: true, // 打包后是否删除 dist 文件夹
        },
        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern-compiler', // 解决废弃警告
                },
            },
        },

    };
});