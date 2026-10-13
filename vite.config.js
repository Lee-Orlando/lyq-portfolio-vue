import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * 两个入口，对应原生版的两张 HTML：
 *   index.html  首页
 *   space.html  单个空间的页面，靠 ?space=短名 定位
 *
 * 之所以不做成 vue-router 的单页路由：CloudBase 静态托管对 history 模式的
 * 「任意路径回退到 index.html」支持不稳定，而 space.html?space=xxx 这个 URL
 * 已经在线上跑着、也被分享出去过。多页入口能原样保留它，代价只是首屏之外
 * 多一次 HTML 请求——这个站点总共就两页，无所谓。
 */
export default defineConfig({
    plugins: [vue()],
    root,
    /**
     * 部署到根目录时不用管；部署到子目录（GitHub Pages 的项目站点固定带仓库名，
     * 例如 /lyq-portfolio-vue/）带上环境变量即可：BASE_PATH=/lyq-portfolio-vue/ npm run build
     * 不写死是因为同一份代码可能部署到不同位置，路径前缀不该进源码。
     */
    base: process.env.BASE_PATH || '/',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: `${root}index.html`,
                space: `${root}space.html`
            }
        }
    }
});
