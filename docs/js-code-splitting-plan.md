# JavaScript 按页面拆分优化计划

## 背景与基线

当前客户端入口同步注册全部页面，并且客户端与服务端共用同一个 renderer 模块。生产构建因此产生一个包含全部第三方依赖的 `vendor`，同时浏览器包中还混入了 React 服务端渲染代码。

2026-07-27 的本地基线构建结果：

| 产物          |  原始大小 |      gzip |
| ------------- | --------: | --------: |
| 客户端入口    |  24.65 KB |   7.26 KB |
| 客户端 vendor | 732.61 KB | 231.81 KB |
| 客户端 CSS    |  56.02 KB |   9.56 KB |
| Pages Worker  | 444.11 KB | 163.23 KB |

## 目标

- 浏览器只执行当前页面以及当前页面共享依赖的 JavaScript。
- 客户端依赖图不包含 `@hono/react-renderer` 或 `react-dom/server`。
- SSR 根据页面名称异步加载页面组件。
- HTML 只包含当前页面需要的入口、module preload 和 CSS。
- hydration 数据不包含完整 Vite manifest。
- 博客中的 Markdown、语言列表、slug 和写操作按路由延迟加载。
- 保持现有 URL、SSR HTML、Cloudflare KV binding 和页面 props 接口兼容。

## 实施顺序

### 第一阶段：本次实施

1. **隔离运行时边界**
   - 新建仅服务端使用的 `server/document.tsx` 和 `server/renderer.tsx`。
   - 新建仅浏览器使用的 `client/hydrate.tsx`。
   - 将双方需要的 Provider 和页面容器放入 `shared/client-shell.tsx`。
   - hydration 改为挂载到明确的 `#app` 节点，不再 hydrate 整个 `document`。

2. **页面级动态加载**
   - 用类型安全的 `view-loaders.ts` 替代同步的全局组件 Map。
   - 页面名称同时关联动态 import 和 Vite manifest module id。
   - 未知页面使用显式错误，不再静默渲染空组件。

3. **恢复 Vite 自动拆包**
   - 删除“全部 node_modules 合并为 vendor”的 `manualChunks`。
   - 为入口、动态 chunk 和 asset 配置稳定的带 hash 文件名。
   - 保留内容哈希，确保静态资源可以长期缓存。

4. **按当前页面解析 manifest**
   - 从客户端入口和当前页面 module id 开始递归解析 imports。
   - 仅输出当前页面相关 CSS。
   - 为入口共享依赖和当前页面 chunk 输出 `modulepreload`，避免动态 import 瀑布。

5. **缩小 hydration 数据**
   - manifest 只在 Worker 内部使用。
   - `window._hono_view` 仅序列化页面名、meta 和 props。
   - 使用安全 JSON 序列化，避免 `</script>` 截断内联脚本。

6. **博客路由级动态加载**
   - 保留轻量路由注册模块。
   - 列表、编辑、写操作和文章渲染拆成独立 handler chunk。
   - `markdown-it`、`iso-639-1` 和 `slugify` 只随对应 handler 加载。
   - Pages Worker 使用 `_worker.js/index.js` 目录模式保存服务端 chunks。

### 第二阶段

7. **已完成：迁移到 Cloudflare Workers 与 `@cloudflare/vite-plugin`**
   - 使用 Vite Environment API 构建 `client` 与 `ssr` 两个环境。
   - client 构建完成后同步 manifest，再构建 Worker，保留精确的页面资源注入。
   - 使用 Workers Assets 的 asset-first 路由替代 Pages `_routes.json`。
   - 由插件生成可直接 preview/deploy 的 `dist/ssr/wrangler.json`。
   - 使用 `wrangler types` 生成绑定与运行时类型。
8. 对纯展示页面采用 islands 或无 hydration 输出，进一步减少 React 客户端运行时。
9. 根据真实流量决定是否拆分独立 Worker；只有功能域明显增大时才使用 Service Binding。

## 验收标准

- `npm run typecheck` 通过。
- `npm run build` 通过，客户端不存在单一超大 `vendor`。
- Vite manifest 中每个页面均为 `isDynamicEntry`。
- 客户端产物不包含 `react-dom-server`。
- Worker 输出为入口加多个页面/handler chunk，而不是单文件内联所有业务代码。
- `/`、`/blogs`、`/blog/list` 和文章页面仍能返回 SSR HTML。
- 每个 SSR 页面只注入一个客户端入口和当前页面相关 preload。
- 完成前后记录 gzip 体积，避免只增加请求数而没有降低页面总传输量。

## 风险与回滚点

- **hydration 不一致**：Document 只负责文档结构，`ClientShell` 必须在 SSR 和客户端使用相同 props。
- **动态模块部署失败**：部署前使用 `vite preview` 验证 `dist/ssr` 中的入口和动态模块可解析。
- **缓存旧 HTML**：所有 JS 文件保留内容 hash；动态 import 失败时允许用户刷新获取最新 HTML。
- **manifest key 变化**：页面 module id 统一在 `view-loaders.ts` 定义，禁止在 Document 中散落字符串。
- 每个阶段保持独立文件边界；如出现问题，可以先恢复同步 loader，而无需撤销 Document/Client 分离。

## 第一阶段实施结果

第一阶段 1–6 项已于 2026-07-27 完成：

- 所有 5 个页面都成为 Vite `isDynamicEntry`。
- 客户端产物已确认不包含 `react-dom-server` 或 `@hono/react-renderer`。
- hydration 数据不再包含 manifest，HTML 会为当前页面输出精确的 module preload。
- 客户端将 React、React DOM、Scheduler、Sonner 和 next-themes 合并为稳定的 `react-runtime`：业务入口为 6.53 KB（gzip 2.96 KB），runtime 为 223.42 KB（gzip 68.92 KB）。
- Pages Worker 使用 `_worker.js/index.js` 加 19 个 ESM chunk；Wrangler 能识别并附加这些模块。
- Wrangler 本地预览已验证 `/`、`/blogs` 和 `/article/:slug` 均返回 `200` SSR HTML。
- 博客编辑页已使用浏览器原生 `fetch` 替换 Axios，并显式检查非 2xx 响应；Axios 及其传递依赖已从项目中移除。`BlogUpdateForm` 客户端 chunk 从 136.34 KB（gzip 47.68 KB）降至 91.72 KB（gzip 31.03 KB）。

## Cloudflare Workers 迁移结果

第二阶段第 7 项已于 2026-07-27 完成：

- 删除 `@hono/vite-build`、`@hono/vite-dev-server` 和 Pages `_routes.json`，改用 `@cloudflare/vite-plugin`。
- `vite build` 先输出 `dist/client` 并更新 SSR manifest，再输出 `dist/ssr`；不再生成 Pages 专用的 `_worker.js` 目录。
- Worker 入口为 40.00 KB（gzip 14.89 KB），React runtime 为 204.11 KB（gzip 62.59 KB），页面和博客 handler 继续按动态模块拆分。
- `vite preview` 已验证 `/`、`/blogs`、`/article/:slug`、`robots.txt` 和 hashed 客户端 JS 均返回 `200`；受 Basic Auth 保护的 `/blog/list` 在无凭证时保持 `401`。
- `vite dev` 已验证 SSR 页面和 `/src/client.tsx` 同源加载，Worker 代码运行于本地 workerd。
- 静态资源采用 asset-first，不触发 Worker；未命中静态资源的页面和 API 请求进入 Hono SSR Worker。

客户端页面首次传输量（JS + CSS，gzip，按 manifest 依赖闭包统计）：

| 页面           |    优化后 | 相对原基线 240.6 KiB |
| -------------- | --------: | -------------------: |
| Hello          |  91.3 KiB |               -62.1% |
| BlogList       |  97.5 KiB |               -59.5% |
| Blogs          |  97.3 KiB |               -59.6% |
| ShowPost       |  97.9 KiB |               -59.3% |
| BlogUpdateForm | 121.2 KiB |               -49.6% |

Worker 的 Vite 入口从原来的单文件 gzip 163.23 KB 调整为 14.89 KB 入口和按需模块。多模块总大小不能直接与旧 Vite 单文件比较，因为旧配置把 React 标记为 external，Wrangler 部署时才会将其二次打包；当前产物已经包含统一的 React runtime，并通过 Cloudflare Vite Plugin 的真实 workerd preview 验证。
