# JavaScript 按页面拆分优化方案（Node.js）

## 目标

- 浏览器只执行当前页面及其共享依赖。
- 客户端依赖图不包含 React 服务端渲染代码。
- Node SSR 根据页面名称异步加载组件。
- HTML 只注入当前页面需要的入口、CSS 和 module preload。
- 博客列表、编辑、写操作和 Markdown 渲染按路由延迟加载。
- 保留 Node.js、MySQL、Drizzle ORM 和现有 URL 行为。

## 已实施架构

1. `src/server/document.tsx` 与 `src/server/renderer.tsx` 只负责 SSR。
2. `src/client/hydrate.tsx` 只负责浏览器 hydration。
3. `src/shared/client-shell.tsx` 保存 SSR 与客户端共用的 Provider 结构。
4. `src/view-loaders.ts` 使用字面量动态 import 维护页面名称、模块和 manifest id 的对应关系。
5. `src/server/manifest.ts` 从客户端入口与当前页面递归解析资源依赖。
6. `src/features/blog` 将列表、编辑、写操作、文章和数据库 repository 拆为独立服务端模块。
7. 客户端构建输出到 `dist/client`，Node SSR 输出到 `dist/server`。
8. MySQL、Drizzle、React 和 dotenv 作为 Node external 依赖，由生产环境的 `node_modules` 提供。

## 请求路径

```text
/static/*
  -> @hono/node-server/serve-static
  -> dist/client
  -> Cache-Control: public, max-age=31556952, immutable

页面/API
  -> dist/server/index.js
  -> 动态导入当前 handler/page
  -> 必要时查询 MySQL
  -> React SSR 或 JSON Response
```

## 验收结果

2026-07-28 在 Node.js 生产构建与本地预览中验证：

- `npm run typecheck` 通过。
- `npm run build` 通过，所有 5 个页面都是客户端动态入口。
- 客户端入口为 6.53 KB（gzip 2.96 KB）。
- 客户端 React runtime 为 223.42 KB（gzip 68.91 KB）。
- 最大业务页面 `BlogUpdateForm` 为 91.72 KB（gzip 31.03 KB）。
- Node 入口为 53.15 KB（gzip 19.91 KB）。
- 数据库适配 chunk 从内联依赖时的 861.83 KB 降到 external 后的 0.85 KB。
- 服务端保留列表、编辑、写操作、文章和页面独立 chunks。
- `/` 与 `/blogs` 返回 `200` 动态 SSR HTML。
- `/blog/list` 未提供 Basic Auth 时返回 `401`。
- 哈希客户端资源返回一年 `immutable` 缓存头。
- 博客编辑器使用原生 `fetch`，项目不再依赖 Axios。

## 维护约束

- 新页面必须同时加入 `ViewName` 和 `viewDefinitions`，并使用字面量动态 import。
- 不要恢复“全部 node_modules 合并为 vendor”的配置。
- `src/lib/manifest.json` 必须在客户端构建后、服务端构建前更新。
- 只有带内容哈希的 `/static/*` 可以使用长期 immutable 缓存。
- 数据库和管理员凭证只能通过未跟踪的环境文件或部署平台密钥注入。
- 生产部署必须同时上传 `dist/client`、`dist/server`，并安装 `dependencies`。
