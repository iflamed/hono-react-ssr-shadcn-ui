# JavaScript 按页面拆分与 Cloudflare Workers 架构优化方案

> 适用分支：Cloudflare Workers 版本（`main`）
>
> 文档状态：核心重构已完成，本文同时作为架构说明、维护规范和验收清单
>
> 最后更新：2026-07-29
>
> 英文版：[Cloudflare Workers Architecture and Optimization Guide](./cloudflare-workers-architecture-optimization.md)

## 1. 背景与原始基线

原项目存在两个相互关联的问题：

1. 客户端入口同步注册全部页面，所有页面组件和第三方依赖容易被合并到一个大型 `client` 或 `vendor` 文件中。
2. 页面、API handler、Markdown 渲染和 SSR 代码集中在同一 Worker 入口中，部署产物缺少清晰的按功能拆分边界。

2026-07-27 的初始构建基线如下：

| 产物 | 原始大小 | gzip |
| --- | ---: | ---: |
| 客户端入口 | 24.65 KB | 7.26 KB |
| 客户端 vendor | 732.61 KB | 231.81 KB |
| 客户端 CSS | 56.02 KB | 9.56 KB |
| Pages Worker 单文件 | 444.11 KB | 163.23 KB |

单纯把大文件机械拆成更多文件并不能保证性能更好。本次优化关注的是“请求真正需要的依赖闭包”：浏览器只下载当前页面、公共运行时和实际共享组件；Worker 入口只保留路由与编排逻辑，较重的页面和业务 handler 延迟加载。

## 2. 优化目标

- 浏览器首屏只加载当前页面及其共享依赖，不加载其他页面。
- 客户端依赖图不包含 `@hono/react-renderer`、`react-dom/server` 等服务端模块。
- SSR 根据视图名异步加载当前页面组件。
- SSR HTML 只注入客户端入口、当前页面依赖闭包中的 `modulepreload` 和 CSS。
- hydration 数据只包含页面名、meta 和 props，不向浏览器发送完整 Vite manifest。
- 博客列表、编辑、写操作和文章 Markdown 渲染按路由拆分。
- 稳定公共运行时使用内容 hash，获得更长的浏览器/CDN 缓存生命周期。
- 从 Cloudflare Pages `_worker.js` 模式迁移到 Cloudflare Workers + Vite Plugin。
- 保持既有 URL、动态 SSR、页面 props 和 Basic Auth 行为兼容，并将博客持久化切换到 D1。

## 3. 最终技术栈

| 范围 | 当前方案 |
| --- | --- |
| 语言 | TypeScript 7.x |
| UI | React / React DOM 19.2.x |
| Web 框架 | Hono 4.12.x |
| 构建 | Vite 8.x + Rolldown |
| Cloudflare 集成 | `@cloudflare/vite-plugin` 1.47.x |
| 部署工具 | Wrangler 4.x |
| 样式 | Tailwind CSS 4.x + Shadcn UI |
| SSR | `@hono/react-renderer` |
| 数据 | Cloudflare D1 + Drizzle ORM |
| 浏览器请求 | 原生 Fetch API，不使用 Axios |

升级和依赖调整包括：

- 删除 Pages 架构使用的 `@hono/vite-build`、`@hono/vite-dev-server` 和 Pages adapter。
- 使用 `@cloudflare/vite-plugin` 作为唯一 Cloudflare 开发、构建和预览集成。
- 升级到 Vite 8，使用 Environment API 分别构建 `client` 和 `ssr` 环境。
- TypeScript 升级到 7.x，与当前依赖类型定义保持兼容。
- Axios 已从依赖树移除，博客编辑和写操作改用原生 `fetch`。
- 博客数据已从 Workers KV 迁移到 D1；Drizzle ORM 提供类型安全查询，Drizzle Kit 生成版本化迁移。

## 4. 最终架构

```text
浏览器请求
├── /static/*、robots.txt 或其他已上传静态文件
│   └── Workers Static Assets
│       ├── asset-first，通常不执行 Hono Worker
│       └── 带 hash 的 /static/* 使用 immutable 缓存
│
└── 页面或 API 请求
    └── Hono Worker
        ├── i18n 中间件
        ├── 按路由动态导入业务 handler
        ├── 按需通过 Drizzle 读写 D1
        ├── 按视图动态导入 React 页面
        ├── React SSR
        └── 返回只包含当前页面资源依赖的 HTML
```

构建结果包含两个独立依赖图：

```text
dist/
├── client/
│   ├── .vite/manifest.json
│   ├── _headers
│   ├── robots.txt
│   └── static/
│       ├── client-[hash].js
│       ├── assets/
│       └── chunks/
│
└── ssr/
    ├── index.js
    ├── chunks/
    ├── .vite/manifest.json
    └── wrangler.json
```

`dist/client` 是公开静态资源目录。`dist/ssr` 是可执行的 Worker ESM 模块，不是预生成静态 HTML；页面请求仍可访问 D1 或其他数据库，并在每次请求时动态生成 SSR HTML。

## 5. 实施顺序与当前状态

核心工作按以下顺序完成：

1. **隔离浏览器与服务端运行时**：完成。
2. **页面注册改为字面量动态 import**：完成。
3. **删除全量 vendor 合并规则**：完成。
4. **根据当前页面精确解析 Vite manifest**：完成。
5. **缩小并安全序列化 hydration 数据**：完成。
6. **博客页面、Markdown 和写操作按 handler 拆分**：完成。
7. **Axios 替换为 Fetch 并移除依赖**：完成。
8. **Cloudflare Pages 迁移到 Workers + Vite Plugin**：完成。
9. **带 hash 静态资源配置长期 immutable 缓存**：完成。
10. **简化视图注册并自动推导 `ViewName` 和 manifest module id**：完成。

后续优化应建立在真实流量、Core Web Vitals 和 Worker 可观测数据上，避免仅为了增加 chunk 数量继续拆分。

## 6. 客户端按页面拆分

### 6.1 最小视图注册表

`src/view-loaders.ts` 现在只负责视图名到字面量动态 import 的映射：

```ts
export const viewLoaders = {
  hello: () => import("./view/Hello"),
  blogList: () => import("./view/BlogList"),
  blogUpdateForm: () => import("./view/BlogUpdateForm"),
  blogs: () => import("./view/Blogs"),
  showPost: () => import("./view/ShowPost"),
};
```

`src/view.tsx` 从 `keyof typeof viewLoaders` 自动推导 `ViewName`，并提供 `isViewName()` 和 `loadView()`。新增页面不再需要：

- 手写 `ViewName` union；
- 手写 `moduleId`；
- 同步 import 页面；
- 同时修改多个重复注册表。

视图键名需要和页面文件名在忽略大小写及分隔符后保持一致，例如：

```text
blogUpdateForm -> BlogUpdateForm.tsx
showPost       -> ShowPost.tsx
```

这是 manifest 自动匹配当前动态入口的约定，也是页面预加载能够正常工作的性能约束。

### 6.2 hydration 边界

客户端入口只负责：

```text
src/client.tsx
├── vite/modulepreload-polyfill
├── app.css
└── client/hydrate.tsx
```

`client/hydrate.tsx` 读取 `window._hono_view`、验证视图名、动态导入当前页面，并 hydrate 到明确的 `#app` 容器。浏览器不会收到完整 manifest。

服务端和客户端共用 `shared/client-shell.tsx` 中的 Provider 和页面容器，避免两侧组件树不同造成 hydration mismatch。

### 6.3 公共运行时拆分策略

客户端将以下低频变化依赖合并为一个 `react-runtime`：

- `react`；
- `react-dom`；
- `scheduler`；
- `sonner`；
- `next-themes`。

这满足了 React runtime 和 notifications runtime 合并的要求，也避免为了一个通知库额外创建稳定公共请求。只要内容未变化，文件 hash 保持不变，浏览器和 CDN 可以跨业务页面发布继续复用缓存。

不再使用“把所有 `node_modules` 合并为一个 vendor”的规则。大型但只属于单个页面的依赖继续留在页面 chunk 中；只有真正跨页面且稳定的依赖才值得建立公共缓存边界。

`rolldown-runtime` 不手动合并。它通常不足 1 KB，是 Rolldown 为 chunk 互操作生成的内部 helper；单独存在对传输体积影响可以忽略，强行归组会增加对构建器内部实现的耦合。

### 6.4 Markdown 与 Axios 的最终处理

早期方案曾考虑把 Markdown 和 Axios 合并成一个独立 runtime，最终没有采用：

- Axios 已完全移除，浏览器使用原生 Fetch API。
- `markdown-it` 只在服务端文章渲染 handler 中使用，不进入公共客户端 runtime。
- Markdown 成本随 `article-handler` 延迟加载，不影响 Hello、博客列表或编辑页的客户端首屏。

## 7. 精确的 manifest 资源注入

构建必须先生成客户端 manifest，再构建 Worker：

```text
1. 清理旧 dist。
2. 构建 client 环境到 dist/client。
3. 将 dist/client/.vite/manifest.json 复制到 src/lib/manifest.json。
4. 构建 ssr 环境到 dist/ssr。
```

`src/server/manifest.ts` 在每次 SSR 时：

1. 查找客户端入口 `src/client.tsx`。
2. 根据当前 `ViewName` 的规范化名称，自动查找对应 `isDynamicEntry`。
3. 递归遍历入口及当前页面的 `imports`。
4. 对 module preload 和 CSS 去重。
5. 只返回当前页面真正需要的客户端资源。

这样既不会把所有页面提前加载，也不会等到 hydration 执行后才开始请求当前页面 chunk，从而避免明显的动态 import 网络瀑布。

构建顺序不能交换。否则 Worker 可能内嵌旧 manifest，并在 HTML 中引用上一次构建的 hash 文件。

## 8. 服务端页面与业务 handler 拆分

`src/blog.tsx` 保持为轻量路由注册模块，具体逻辑位于：

```text
src/features/blog/
├── article-handler.tsx
├── editor-handlers.tsx
├── list-handlers.tsx
├── post-repository.ts
├── types.ts
└── write-handlers.ts
```

每个路由只动态导入需要的 handler，因此：

- `markdown-it` 随文章 SSR handler 加载；
- `iso-639-1` 随编辑器 handler 加载；
- slug 生成和 D1 写操作只随 mutation handler 加载；
- 公开列表请求不加载编辑器、Markdown 或写操作代码；
- 页面组件继续作为独立的 Worker chunk 输出。

SSR 侧保留少量明确的公共组：React runtime、Sonner，以及项目内的 i18n/utils shared runtime。它们解决实际重复依赖，不创建一个包罗全部第三方库的大型服务端 vendor。

需要注意：Workers 的服务端 chunk 会作为同一 Worker 部署中的 ESM 模块一起上传，它们不是浏览器通过 CDN 分别下载的文件。服务端拆分主要用于缩小入口依赖图、延迟模块求值、隔离功能边界和改善构建缓存；不能把它等同于客户端按需网络下载，也不应只根据 chunk 数量判断冷启动性能。

## 9. SSR Document 与安全序列化

服务端渲染职责拆分为：

```text
src/server/document.tsx    HTML 文档、资源标签和挂载节点
src/server/renderer.tsx    Hono React renderer 集成
src/server/manifest.ts     当前页面资源解析
src/server/serialize.ts    hydration JSON 安全序列化
src/shared/client-shell.tsx SSR/client 共用组件树
```

`window._hono_view` 只序列化：

- 当前 view name；
- 页面 meta；
- 页面 props。

内联 JSON 会转义可能结束 `<script>` 的字符，避免用户数据中的 `</script>` 截断脚本或形成注入风险。

## 10. Cloudflare Pages 到 Workers 的迁移

### 10.1 旧架构

旧版本依赖 Pages adapter，并输出：

```text
dist/_worker.js/index.js
dist/_worker.js/chunks/*
```

部署和本地预览围绕 `wrangler pages` 命令及 Pages `_routes.json` 工作。

### 10.2 当前 Workers 架构

Vite 配置使用：

```ts
cloudflare({
  viteEnvironment: { name: "ssr" },
});
```

Cloudflare Vite Plugin 将 Hono Worker 集成到 Vite 的 `ssr` 环境，并在构建后生成 `dist/ssr/wrangler.json`。插件会根据客户端构建结果生成静态资源目录配置，因此源 `wrangler.toml` 不需要重复维护 `assets.directory`。

源 `wrangler.toml` 负责声明：

- Worker 名称和 `src/index.tsx` 入口；
- compatibility date 和 `nodejs_compat`；
- `DB` D1 binding；
- 普通变量和 required secrets；
- `workers_dev = true`；
- `preview_urls = false`。

显式配置最后两项可以消除 Wrangler 部署时关于默认启用 workers.dev 和 Preview URLs 的警告。

### 10.3 当前命令

```shell
npm run dev       # Vite + 本地 Workers runtime
npm run typecheck # TypeScript 检查
npm run build     # 先 client，后 SSR Worker
npm run preview   # 预览编译后 Workers 产物
npm run deploy    # build、远程 D1 migration、wrangler deploy
npm run cf-typegen
npm run db:generate -- --name=change-name
npm run db:migrate:local
npm run db:migrate:remote
```

静态资源使用 asset-first 路由：命中 `dist/client` 文件时直接由 Workers Static Assets 提供；未命中的页面和 API 请求才进入 Hono Worker。

## 11. 静态资源与 304 缓存策略

Workers Static Assets 默认可使用 ETag 重新验证。浏览器显示 `304 Not Modified` 时，HTTP 响应体本身为空；Chrome Network 中约 0.5 KB 的传输通常是响应头字节，界面仍可能关联展示本地缓存的资源内容，并不表示服务端重新发送了完整 JS body。

对带内容 hash 的资源，重新验证没有必要，因为内容变化会产生新 URL。`public/_headers` 当前配置为：

```text
/static/*
  Cache-Control: public, max-age=31556952, immutable
```

该规则只覆盖 Vite 生成的带 hash JS/CSS/assets。不要把相同策略扩展到：

- 动态 SSR HTML；
- API 响应；
- 用户相关或鉴权响应；
- URL 不带版本/hash、内容可能原地变化的文件。

## 12. 动态 SSR、Cloudflare D1 与 Drizzle ORM

构建不会预生成页面 HTML。博客请求的实际链路是：

```text
request
-> Hono route
-> Drizzle repository
-> Cloudflare D1 binding
-> 生成页面 props
-> React SSR
-> HTML response
```

因此 Cloudflare Workers 版本可以连接 D1、Hyperdrive 或外部数据库，并按请求生成动态内容。

当前博客通过 `c.env.DB` 获取 D1 binding，并在 repository 内按请求创建 Drizzle client。`src/db/schema.ts` 是 schema 的唯一来源，Drizzle Kit 将 SQLite migration 生成到 `drizzle/d1`，再由 Wrangler 分别应用到本地或远程 D1。列表采用基于自增主键的 keyset pagination，避免随着数据量增加而不断放大的 offset 扫描成本。

本地开发前运行 `npm run db:migrate:local`。`npm run deploy` 会先完成构建，再自动执行 `npm run db:migrate:remote`，只有 migration 成功后才执行 `wrangler deploy`；独立的远程 migration 命令仍可用于只更新数据库。Drizzle schema migration 只负责表结构，不会自动复制原 KV 中的文章，已有线上数据必须在移除 KV binding 前单独完成一次性导入。

配置与秘密分离：

- `BLOG_USERNAME` 使用普通 Wrangler variable；
- `BLOG_PASSWORD` 使用 required secret；
- 本地 secret 放入不提交的 `.dev.vars`；
- binding 或变量变化后运行 `npm run cf-typegen` 更新 Cloudflare 类型。

## 13. 当前构建产物

以下结果来自 Vite 8.1.5 的最新本地构建。

### 13.1 客户端

| 产物 | 原始大小 | gzip |
| --- | ---: | ---: |
| Client entry | 6.34 KB | 2.93 KB |
| React runtime | 223.42 KB | 68.91 KB |
| Hello | 2.75 KB | 0.96 KB |
| Blogs | 0.99 KB | 0.50 KB |
| BlogList | 1.42 KB | 0.69 KB |
| ShowPost | 34.75 KB | 12.75 KB |
| BlogUpdateForm | 91.72 KB | 31.03 KB |
| 全局 CSS | 56.02 KB | 9.56 KB |

`react-runtime` 原始大小较大，但它是多个页面实际共享且低频变化的依赖。更重要的指标是 gzip 后约 68.91 KB，并且可由 immutable + 内容 hash 长期缓存。把它进一步拆成多个始终同时使用的文件不会减少依赖闭包，只会增加请求和预加载管理成本。

### 13.2 Worker

| 产物 | 原始大小 | gzip |
| --- | ---: | ---: |
| Worker entry | 40.03 KB | 14.97 KB |
| React runtime | 204.11 KB | 62.59 KB |
| Editor handlers | 10.18 KB | 4.26 KB |
| Article handler | 103.17 KB | 46.29 KB |

不能把所有 chunk 体积相加后当作单页面传输量。客户端页面实际下载入口、共享依赖和当前页面的 manifest 依赖闭包；服务端产物则作为同一个 Worker 的模块集合部署。

此前按 manifest 依赖闭包统计的客户端首次传输量（JS + CSS，gzip）如下，可作为优化幅度参考：

| 页面 | 优化后 | 相对原基线 240.6 KiB |
| --- | ---: | ---: |
| Hello | 约 91.3 KiB | -62.1% |
| BlogList | 约 97.5 KiB | -59.5% |
| Blogs | 约 97.3 KiB | -59.6% |
| ShowPost | 约 97.9 KiB | -59.3% |
| BlogUpdateForm | 约 121.2 KiB | -49.6% |

## 14. 已完成验证

- `npm run typecheck` 通过。
- `npm run build` 通过。
- 5 个页面均在客户端 manifest 中成为 `isDynamicEntry`。
- 客户端依赖图不包含 `react-dom/server` 或 `@hono/react-renderer`。
- Worker 输出为入口加页面、handler 和公共 runtime 模块，而非单一业务文件。
- 编译后 Workers preview 中 `/` 和 `/blogs` 返回 `200` SSR HTML。
- `/blog/list` 在无 Basic Auth 凭证时保持 `401`。
- 不同 SSR 页面只注入各自页面 chunk 及必要公共依赖。
- hydration payload 使用新的 camelCase 视图名，例如 `hello`、`blogs`、`blogList`。
- Axios 及其传递依赖已移除；`BlogUpdateForm` 从约 136 KB 降到约 92 KB。
- 静态资源由 asset-first 处理，带 hash 的 `/static/*` 应返回 immutable 缓存策略。

## 15. 新增页面规范

1. 新建页面，例如 `src/view/LoginPage.tsx`。
2. 在 `src/view-loaders.ts` 增加唯一一条映射：

```ts
export const viewLoaders = {
  // existing views...
  loginPage: () => import("./view/LoginPage"),
};
```

3. 在路由中直接使用自动推导的视图名：

```ts
app.get("/login", (c) => {
  return c.view("loginPage", {
    meta: { title: "Login" },
    props: {},
  });
});
```

不需要修改 `ViewName` union，也不需要提供 Vite `moduleId`。

## 16. 维护约束与风险

- 页面必须使用字面量 `import("./view/...")`，否则 Vite 无法可靠生成独立动态入口。
- 视图键名必须和文件名规范化后匹配，否则 SSR 可渲染，但无法自动注入该页面的 preload。
- 不要恢复全量 `node_modules` vendor chunk。
- 客户端入口和共享 shell 不得 import 服务端 renderer、D1 repository 或 Node-only 模块。
- 不要手工修改 `src/lib/manifest.json`；它由构建流程覆盖。
- 不要交换 client-before-Worker 的构建顺序。
- 不要对动态 HTML、API 或鉴权响应使用 immutable 缓存。
- 不得直接修改已经应用的 Drizzle migration；应修改 schema 后生成新的 migration。
- SSR 和 hydrate 必须使用相同 `ClientShell`、view name 和 props，避免 hydration mismatch。
- 每次升级 Vite/Rolldown 后应重新检查 manifest shape、动态入口名称和 chunk 分组结果。
- 部署前应验证编译产物的 `npm run preview`，不能只验证开发服务器。

## 17. 后续优化建议

以下项目尚不应无数据地提前实施：

1. 对纯展示、无交互页面提供不 hydration 或 islands 模式，进一步避免加载完整 React 客户端 runtime。
2. 使用真实访问数据记录 LCP、INP、缓存命中率和各页面 JS 依赖闭包，而非只比较磁盘上的最大 chunk。
3. 当 BlogUpdateForm 功能继续增长时，再按编辑器能力拆分富交互组件。
4. 只有当业务域、权限、发布节奏或资源限制确实需要隔离时，才拆为多个 Worker 并使用 Service Binding。
5. 根据真实查询数据决定是否增加全文搜索、复合索引或 D1 read replication，不提前增加无使用证据的索引。

## 18. 部署前验收清单

```shell
npm run typecheck
npm run db:check
npm run build
npm run preview
```

部署前确认：

- 客户端 manifest 中每个页面均为 `isDynamicEntry`；
- HTML 没有 preload 其他无关页面；
- `dist/ssr/wrangler.json` 的静态资源目录指向 `dist/client`；
- `/static/*` 返回预期的 immutable 缓存头；
- 本地与远程 D1 migration 状态正确；
- SSR 页面、API、D1 CRUD 和 Basic Auth 行为正常；
- `.dev.vars` 等 secret 文件未被 Git 跟踪；
- Wrangler 部署同时上传 Worker modules 和客户端静态资源；
- 发布后的 workers.dev、自定义域名和 Preview URL 行为与 `wrangler.toml` 一致。

## 19. Cloudflare 官方参考

- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Cloudflare Vite Plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [Vite environments](https://developers.cloudflare.com/workers/vite-plugin/reference/vite-environments/)
- [Static assets with the Vite Plugin](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/)
- [Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/)
- [Drizzle ORM with Cloudflare D1](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1)
