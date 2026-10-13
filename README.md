# Lyq · 个人站点（Vue 3 版）

> 同一个站点的三套前端之一：**原生 JS**（`lyq-portfolio`）、**Vue 3**（本仓库）、**React**。
> 三套共用**同一套 Serverless 后端和同一份数据**：在 Vue 版改了自我介绍，React 版刷新也跟着变。

Vue 3 + Vite 实现，组件化开发，构建产物是纯静态文件。内容按区块存在云端的
`site/content/*.json`，由一个 CloudBase 云函数读写；留言由另一个云函数归档。

## 快速开始

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # 产物在 dist/，把 dist 整个目录传上静态托管即可
npm run preview  # 预览构建产物
```

**连云端需要 `public/site.config.js`**（含真实环境 ID，已被 gitignore）。
第一次跑请照模板复制一份：

```bash
cp public/site.config.example.js public/site.config.js
```

然后填自己的两个端点。没有这个文件页面照常工作，只是读不到云端内容，
管理面板会如实提示「只能看不能存」，**不会伪装保存成功**。

## 目录结构

```
├── index.html              # 首页入口（Vite 多页之一）
├── space.html              # 单个空间的页面入口，按 ?space=短名 定位
├── vite.config.js          # 两个入口的构建配置
├── public/                 # 原样拷贝到 dist 根目录
│   ├── site.config.js      # 云函数地址与站点域名（不进版本库）
│   └── site.config.example.js
└── src/
    ├── main.js             # 首页入口：注册 v-fade-in 指令后挂载
    ├── space-main.js       # 空间页入口
    ├── App.vue             # 首页：区块拼装
    ├── SpaceApp.vue        # 空间页：展示 + 就地编辑器
    ├── styles.css          # 与原生版、React 版共用同一份样式
    ├── directives/fade.js  # v-fade-in：滚进视口才淡入
    ├── composables/
    │   ├── useContent.js   # 内容 store（模块级单例）
    │   └── useAnchors.js   # 站内锚点的平滑滚动（事件委托）
    ├── content/            # 与框架无关的纯逻辑
    │   ├── schema.js       # 区块与字段定义 + 默认内容
    │   ├── api.js          # 云端读写、图片上传、留言提交
    │   └── utils.js        # slugify / safeUrl / 摘要等纯函数
    └── components/
        ├── SiteHeader.vue  # 吸顶导航 + 滚动高亮 + 移动端开合
        ├── HeroSection.vue # 首屏
        ├── ParticleField.vue
        ├── AboutSection.vue
        ├── SpacesSection.vue / SpaceCard.vue
        ├── LinksSection.vue / LinkCard.vue
        ├── ContactSection.vue / ContactForm.vue
        ├── SiteFooter.vue
        ├── AdminPanel.vue  # 整站文案的编辑抽屉
        ├── FieldControl.vue
        ├── ItemEditor.vue
        └── BlockEditor.vue
```

## 为什么是多页而不是 vue-router

CloudBase 静态托管对 history 模式「任意路径回退到 index.html」的支持不稳定，
而 `space.html?space=notes` 这个 URL 已经在线上跑着、也被分享出去过。
两个 Vite 入口能原样保留它，代价只是多一次 HTML 请求——总共就两页，无所谓。

## 与原生版的差异（取舍记在这里）

| 项目 | 原生版 | Vue 版 |
|---|---|---|
| 禁用 JS | 页面完整可读（默认值写在 HTML 里） | 只有一段说明，指回原生版 |
| 默认值来源 | HTML 标签 | `src/content/schema.js` 的 `DEFAULTS` |
| 首屏加载 | 无需等 JS 编译 | 多一个 ~30KB gzip 的运行时 |

换来的是：表单不再手工拼 DOM（`v-model` 直接绑定），脏标记是一个 `deep watch`
而不是在每个输入事件里记账，加新区块只改 `SECTIONS` 那张表。

## 部署

```bash
npm run build
# 把 dist/ 整个目录部署到静态托管
```

注意把 `public/site.config.js` 一起带上，否则线上退回只读。

若要放在子目录（比如 `/vue/`），给 `vite.config.js` 加 `base: '/vue/'`，
站点内链接会自动带上前缀。

## 安全边界

写操作目前**不设门槛**——这是明确的取舍，代价与收紧办法（在云函数环境变量里放
`WRITE_KEY`）都写在 `lyq-portfolio` 那个仓库的 README 里。要点：密钥绝不能放进
云存储，默认存储桶是公有读的，等于把钥匙挂在门外。
