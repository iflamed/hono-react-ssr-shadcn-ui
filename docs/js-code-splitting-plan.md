# JavaScript 按页面拆分与 Node.js SSR 架构优化方案

> 适用分支：Node.js Server 版本（`node-server`）
>
> 文档状态：核心升级、客户端拆分、Node SSR 拆分和视图注册简化均已完成
>
> 最后更新：2026-07-29
>
> English version: [Node.js Server Architecture and Optimization Guide](./node-server-architecture-optimization.md)

## 1. 背景

原始项目把全部页面、交互依赖和大部分 SSR 逻辑合并到少量大型文件中，导致：

- 浏览器访问任意页面都可能下载其他页面的组件和依赖；
- 全量 `node_modules` vendor 使一个依赖变化就失效整个公共缓存；
- 客户端容易混入服务端 React renderer；
- Node 服务端入口包含文章 Markdown、编辑器、数据库和写操作的全部实现；
- 新增页面需要重复维护视图名称、loader 和 Vite manifest module id。

本分支在保留 Node.js、MySQL、Drizzle ORM 和现有 Hono 路由的前提下，吸收了 `main` 的页面级拆分、运行时边界和 manifest 优化，并针对传统 Node 部署方式保留独立实现。

## 2. 优化目标

- 浏览器只加载当前页面、共享运行时和当前页面实际使用的组件。
- 客户端依赖图不包含 `@hono/react-renderer` 或 `react-dom/server`。
- Node SSR 根据视图名动态导入当前页面。
- SSR HTML 只注入当前页面需要的 CSS 和 `modulepreload` 依赖闭包。
- hydration payload 不包含完整 Vite manifest。
- 博客列表、编辑器、写操作和 Markdown 渲染按路由动态加载。
- 数据库驱动、Drizzle、React 等 Node 依赖不重复打入服务端 bundle。
- 静态资源使用内容 hash 和长期 immutable 缓存。
- 新增页面只配置视图名和一个字面量动态 import。

## 3. 当前技术栈与升级结果

本次合并后的验证环境和核心依赖如下：

| 范围 | 当前版本/方案 |
| --- | --- |
| 验证运行时 | Node.js 26.5.0 |
| 语言 | TypeScript 7.0.2 |
| UI | React / React DOM 19.2.x |
| Web 框架 | Hono 4.12.x |
| Node adapter | `@hono/node-server` 1.19.x |
| 构建系统 | Vite 8.1.5 + Rolldown |
| Node 构建插件 | `@hono/vite-build` 1.11.x |
| 开发服务器 | `@hono/vite-dev-server` 0.26.x |
| 数据层 | Drizzle ORM 0.45.x + MySQL2 3.x |
| 样式 | Tailwind CSS 4.x + Shadcn UI |
| 浏览器请求 | 原生 Fetch API，不使用 Axios |

主要升级和迁移决策：

1. React 升级并保持在 19.2.x 版本线。
2. Vite 升级到 8.x，客户端和服务端 chunk 分组改用 Rolldown `codeSplitting.groups`。
3. TypeScript 升级到 7.x，避免通过降级 TypeScript 迁就新的依赖类型。
4. Hono、Node adapter、Vite build/dev plugin 升级到当前分支依赖范围。
5. Axios 已移除，博客编辑器使用浏览器原生 Fetch API。
6. Cloudflare Vite Plugin、Wrangler、KV binding 不属于本分支；Node 版本继续使用 `@hono/vite-build/node`、MySQL 和环境变量。

项目当前没有在 `package.json` 中声明 `engines.node`。生产环境升级 Node.js 时，应使用 Vite 8 和当前依赖共同支持的 Node 版本，并在部署前运行完整的 typecheck、build、preview 和数据库连接验证。

## 4. 最终架构

```text
浏览器请求
├── /static/*
│   └── @hono/node-server/serve-static
│       ├── 文件目录：dist/client
│       └── Cache-Control: public, max-age=31556952, immutable
│
├── /robots.txt
│   └── dist/client/robots.txt
│
└── 页面或 API 请求
    └── dist/server/index.js
        ├── Hono middleware 与 Basic Auth
        ├── 按路由动态导入 handler
        ├── Drizzle ORM + MySQL 查询/写入
        ├── 按视图动态导入 React 页面
        ├── React SSR
        └── 返回精确注入当前页面资源的 HTML 或 JSON
```

生产构建输出：

```text
dist/
├── client/
│   ├── .vite/manifest.json
│   ├── robots.txt
│   └── static/
│       ├── client-[hash].js
│       ├── assets/
│       └── chunks/
│
└── server/
    ├── index.js
    ├── assets/
    └── chunks/
        ├── page chunks
        ├── route handler chunks
        └── shared server chunks
```

`dist/client` 是浏览器静态资源；`dist/server` 是由 Node.js 执行的 ESM 服务端程序。构建过程不会预生成博客 HTML，页面仍会按请求访问 MySQL 并动态 SSR。

## 5. 客户端与服务端运行时边界

职责拆分如下：

```text
src/client.tsx                浏览器入口、CSS、modulepreload polyfill
src/client/hydrate.tsx        当前视图加载与 hydrateRoot
src/shared/client-shell.tsx   SSR 和客户端共用 Provider/页面容器
src/server/document.tsx       HTML 文档、资源标签与挂载节点
src/server/renderer.tsx       Hono React renderer 集成
src/server/manifest.ts        当前页面资源依赖解析
src/server/serialize.ts       hydration JSON 安全序列化
```

客户端入口不再导入服务端 renderer。SSR 与 hydration 使用相同 `ClientShell`、view name 和 props，以降低 hydration mismatch 风险。

hydration 数据只包含：

- 当前视图名；
- 页面 meta；
- 页面 props。

内联 JSON 会转义 `<`、Unicode 行分隔符等特殊字符，避免 `</script>` 截断内联脚本。

### 5.1 带语言前缀的路由

Node 路由支持 `/zh/`、`/zh/blogs`、`/es/article/:slug` 等显式语言前缀。`getPath()` 只在首段是受支持语言时去除前缀用于 Hono 路由匹配，原始 URL 仍用于语言检测。

`languageDetector` 的检测顺序配置为 `querystring → path → cookie → header`。首次访问 `/zh/...` 时从 path 得到 `zh` 并写入 `language` Cookie；后续访问不带前缀的 `/blogs` 或 `/article/...` 时，path 没有有效语言，检测流程继续从 Cookie 得到 `zh`。因此站内链接不需要重复添加 `/zh`。

Cookie 使用 `Path=/`。本地 `npm run dev` 通过 HTTP 运行，因此设置 `secure: false`；生产构建设置 `secure: true`，要求公开部署使用 HTTPS。Vite 的 `/static/*` 资源始终使用根路径，不参与语言检测。

## 6. 最小视图注册与页面动态 import

`src/view-loaders.ts` 只保留配置：

```ts
export const viewLoaders = {
  hello: () => import("./view/Hello"),
  blogList: () => import("./view/BlogList"),
  blogUpdateForm: () => import("./view/BlogUpdateForm"),
  blogs: () => import("./view/Blogs"),
  showPost: () => import("./view/ShowPost"),
};
```

`src/view.tsx` 负责：

- 从 `keyof typeof viewLoaders` 自动推导 `ViewName`；
- 通过 `isViewName()` 验证 hydration view name；
- 通过 `loadView()` 加载并返回默认页面组件。

新增页面不再需要手写 `ViewName` union 或 manifest `moduleId`。视图键名必须和文件名在忽略大小写、连字符和下划线后匹配，例如：

```text
blogUpdateForm -> BlogUpdateForm.tsx
showPost       -> ShowPost.tsx
```

必须保留字面量动态 import。变量拼接路径会降低 Vite 静态分析和独立动态入口生成的可靠性。

## 7. 客户端 chunk 策略

客户端构建只建立一个明确的稳定公共组 `react-runtime`：

- `react`；
- `react-dom`；
- `scheduler`；
- `sonner`；
- `next-themes`。

React 与 notifications runtime 放在同一缓存边界，避免多个始终共同加载的基础请求。页面和业务组件仍由 Vite/Rolldown 根据动态 import 与真实共享关系拆分。

已经删除“将全部 `node_modules` 合并成 vendor”的做法。大型依赖只有在多个首屏确实共同使用且变化频率接近时才适合手工归组。

`rolldown-runtime` 保持为构建器自动生成的小型 helper。当前客户端仅 0.56 KB（gzip 0.36 KB），没有必要为了减少一个极小 chunk 耦合 Rolldown 内部实现。

Markdown 和 Axios 没有建立公共客户端 runtime：

- Axios 已从项目移除；
- 浏览器使用原生 `fetch` 并显式检查非 2xx 响应；
- `markdown-it` 仅用于 Node 文章 SSR handler，不进入客户端首屏依赖图。

## 8. Vite manifest 与页面资源注入

Node 构建脚本强制执行：

```text
1. npm run version
2. vite build --mode client
3. 复制 dist/client/.vite/manifest.json 到 src/lib/manifest.json
4. vite build --mode server
```

服务端构建必须晚于客户端，因为 `src/server/document.tsx` 需要把最新客户端 manifest 编入 Node SSR bundle。

`src/server/manifest.ts` 会：

1. 查找 `src/client.tsx` 客户端入口。
2. 根据规范化后的 `ViewName` 自动匹配当前页面 `isDynamicEntry`。
3. 递归遍历入口和页面 chunk 的 `imports`。
4. 去重 CSS 和 module preload。
5. 只返回当前 SSR 页面所需资源。

这使浏览器能够在 hydration 执行前开始下载当前页面 chunk，同时不会 preload 其他页面。

`src/lib/manifest.json` 是生成文件，不应手工编辑。任何客户端源码、chunk 分组或 Vite 版本变化后都必须重新执行完整构建。

## 9. Node 服务端 route splitting

`src/blog.tsx` 只注册路由和鉴权，每个路由通过动态 import 加载具体实现：

```text
src/features/blog/
├── article-handler.tsx      文章查询、Markdown SSR、Open Graph
├── editor-handlers.tsx      新建/编辑页面与语言列表
├── list-handlers.tsx        管理端和公开列表
├── post-repository.ts       Drizzle 查询与数据映射
├── types.ts                 Blog context/options/input 类型
└── write-handlers.ts        create/update/delete 与 slug 生成
```

实际边界：

- 访问文章时才加载 `markdown-it` 和 `article-handler`；
- 访问编辑页时才加载 `iso-639-1` 和 editor handler；
- POST/PUT/DELETE 时才加载 slug 和写操作；
- 普通首页不加载博客数据库 repository；
- 公开列表不加载编辑器或 Markdown renderer。

与客户端不同，Node 服务端 chunks 不会被浏览器通过 HTTP 分别下载。它们由同一个 Node 进程从本地文件系统按动态 import 加载。主要收益是缩小启动入口依赖图、延迟模块解析/求值、改善功能边界与增量部署，而不是 CDN 网络节省。

## 10. Node external 策略

以下依赖通过 `vite.config.ts` 保持 external：

- `dotenv`；
- `drizzle-orm` 及 MySQL adapter；
- `mysql2`；
- `react`；
- `react-dom`。

数据库、React 和环境加载器由生产服务器的 `node_modules` 提供，不被复制进 `dist/server`。这使数据库 adapter chunk 当前仅 0.85 KB，而不是把 MySQL/Drizzle 的完整依赖树内联到 bundle。

该策略的约束是 `dist/server` 不是完全自包含产物。生产部署必须同时具备：

- `dist/client`；
- `dist/server`；
- `package.json` 和 lockfile；
- 已安装的 production dependencies；
- 运行时环境变量；
- 必要时的 migration 文件和 Drizzle 配置。

不应把仅在构建期使用的任意依赖加入 server external；也不应遗漏 Node 原生或数据库动态依赖所需要的包。

## 11. MySQL、Drizzle 与动态 SSR

Node 版本的数据链路：

```text
request
-> Hono route
-> 动态 handler
-> post-repository / write-handler
-> Drizzle ORM
-> MySQL2 connection
-> page props 或 JSON
-> React SSR（页面请求）
```

数据库连接由 `src/db/index.ts` 创建。环境配置按以下优先级加载：

1. `.env.${SERVER_MODE}`；
2. `.env.local`；
3. `.env`。

`DATABASE_HOST`、用户名、密码、数据库名、表前缀和博客管理员凭证缺失时会在启动阶段快速失败，避免以不完整配置运行。

数据库 schema 位于 `src/db/schema.ts`。迁移命令为：

```shell
npm run migrate
```

生产密码不得提交到 Git。应由服务器环境、部署系统 secret 或权限受控的环境文件注入。

## 12. 静态资源缓存

`src/index.tsx` 使用 `@hono/node-server/serve-static` 从 `dist/client` 提供静态文件。

带 hash 的 `/static/*` 返回：

```text
Cache-Control: public, max-age=31556952, immutable
```

文件内容变化会生成新 URL，因此可以安全长期缓存。不要把相同策略用于：

- 动态 SSR HTML；
- API 或 mutation 响应；
- Basic Auth 页面；
- 不带 hash 且可能原地更新的静态文件。

`robots.txt` 由 Node 静态服务提供，但没有套用 `/static/*` 的一年 immutable 规则。

## 13. 最新构建结果

以下数据来自 Node.js 26.5.0、Vite 8.1.5 下合并后的生产构建。

### 13.1 客户端

| 产物 | 原始大小 | gzip |
| --- | ---: | ---: |
| Client entry | 6.34 KB | 2.92 KB |
| React runtime | 223.42 KB | 68.91 KB |
| Rolldown runtime | 0.56 KB | 0.36 KB |
| Hello | 2.75 KB | 0.96 KB |
| Blogs | 0.99 KB | 0.50 KB |
| BlogList | 1.43 KB | 0.69 KB |
| ShowPost | 34.75 KB | 12.75 KB |
| BlogUpdateForm | 91.72 KB | 31.03 KB |
| Global CSS | 56.00 KB | 9.55 KB |

`react-runtime` 原始体积大，但 gzip 后约 68.91 KB，而且是页面真正共享、低频变化并可长期缓存的依赖。继续拆成多个始终同时需要的 runtime 不会降低页面依赖闭包。

### 13.2 Node SSR

| 产物 | 原始大小 | gzip |
| --- | ---: | ---: |
| Node entry | 53.30 KB | 20.00 KB |
| DB adapter chunk | 0.85 KB | 0.50 KB |
| List handlers | 0.83 KB | 0.37 KB |
| Editor handlers | 10.15 KB | 4.25 KB |
| Write handlers | 28.62 KB | 9.85 KB |
| Article handler | 103.05 KB | 46.21 KB |
| BlogUpdateForm SSR page | 90.62 KB | 31.04 KB |
| Shared runtime | 28.72 KB | 9.36 KB |

构建目录里全部 chunk 的总和不等于浏览器单页传输量。浏览器只接收 manifest 解析出的客户端依赖闭包；Node 服务端 chunks 则由本地进程按路由加载。

## 14. 合并后的验证结果

- `main` 的简化视图映射和自动 manifest 匹配已合并到 `node-server`。
- 5 个页面都是客户端 `isDynamicEntry`。
- `npm run build` 通过，客户端和 Node SSR 均成功输出独立 chunks。
- 客户端入口为 6.34 KB（gzip 2.92 KB）。
- Node 入口为 53.30 KB（gzip 20.00 KB）。
- 最大客户端业务页面 `BlogUpdateForm` 为 91.72 KB（gzip 31.03 KB）。
- Axios 已移除，编辑器使用原生 Fetch API。
- 页面视图名统一为 `hello`、`blogList`、`blogUpdateForm`、`blogs`、`showPost`。
- `dist/client` manifest 已在服务端构建前重新生成。
- Node 生产预览中 `/` 和 `/blogs` 返回 `200` 动态 SSR HTML。
- `/blog/list` 在未提供 Basic Auth 时返回 `401`。
- 首页只 preload `Hello` 和公共依赖，博客页只 preload `Blogs` 及其实际依赖。
- 带 hash 的客户端入口返回一年 `immutable` 缓存头。
- `/zh/`、`/zh/blogs` 和 `/es/blogs` 返回正确语言的 SSR HTML。
- `/zh/blog/list` 未提供 Basic Auth 时保持 `401`。
- `/zh/...` 响应写入全站 `language=zh` Cookie，随后不带前缀的页面继续使用中文。

数据库依赖的 preview 需要有效的本地 MySQL 环境变量和可访问数据库。本次环境满足该条件并通过 `/blogs` 查询验证；其他部署环境仍需独立验证数据库网络与凭证。

## 15. 新增页面

1. 新建 `src/view/LoginPage.tsx`。
2. 在 `src/view-loaders.ts` 添加一条映射：

```ts
export const viewLoaders = {
  // existing views...
  loginPage: () => import("./view/LoginPage"),
};
```

3. 在路由中使用自动推导的名称：

```ts
app.get("/login", (c) => {
  return c.view("loginPage", {
    meta: { title: "Login" },
    props: {},
  });
});
```

不需要修改 `ViewName` 或填写 manifest module id。

## 16. 构建、运行与部署

```shell
npm run dev
npm run typecheck
npm run build
npm run preview
```

`npm run dev` 同时使用 Vite 和 Hono dev server。Hono 插件必须排除 `/src` 下由 Vite 转换的 JSON、图片、字体和 WASM 等源码资源，否则 `*.json?import` 会被 Hono 当作应用路由并返回 `404`。`vite.config.ts` 在插件默认 exclude 基础上补充了这些源码资源规则；`npm run client` 则由 Vite 直接处理。

多环境构建通过 `SERVER_MODE` 选择 `.env.${SERVER_MODE}`：

```shell
SERVER_MODE=local npm run build
SERVER_MODE=caitun npm run build
SERVER_MODE=ruobiyi npm run build
```

项目提供 `deploy.sh.example`，展示上传 `dist`、schema、配置、package 文件，远程安装依赖、执行 migration 并重启进程管理器的基本流程。真实部署脚本和环境文件不能提交。

## 17. 维护约束

- `src/view-loaders.ts` 只保存页面映射，不添加 helper 或 module id。
- 页面路径必须使用字面量动态 import。
- view key 必须和文件名规范化后匹配。
- 不要恢复全量 vendor chunk。
- 不要从客户端入口导入数据库、Node 或服务端 renderer 模块。
- 不要手工编辑 `src/lib/manifest.json`。
- 始终先构建 client，再构建 server。
- server external 变化后，必须验证目标服务器的 `node_modules` 完整性。
- 只有内容 hash 静态资源可以使用一年 immutable 缓存。
- SSR 与客户端必须保持相同 shell、view name 和 props。
- Vite/Rolldown 升级后重新核对 manifest shape、chunk 名称和 external 行为。

## 18. 后续建议

1. 为 `package.json` 增加经过生产验证的 `engines.node` 范围，固定部署运行时基线。
2. 为纯展示页面评估无 hydration 或 islands，进一步减少 React runtime 成本。
3. 使用真实流量测量 LCP、INP、JS 缓存命中率和 Node 冷启动/内存，而不是只比较磁盘 chunk。
4. 为数据库连接增加适合部署拓扑的连接池、健康检查和优雅关闭策略。
5. 为写 API 增加 Zod 输入验证和统一错误类型，避免直接信任 JSON body。
6. 只有在多个页面真实复用且缓存收益明确时，才新增手工公共 chunk。

## 19. 部署前验收清单

- `npm run typecheck` 通过。
- `npm run build` 通过。
- 每个页面在客户端 manifest 中都是动态入口。
- SSR HTML 只 preload 当前页面和共享依赖。
- `dist/server/index.js` 可以在目标 Node 版本启动。
- `/`、`/blogs` 和有效文章路由返回 SSR HTML。
- `/blog/list` 无 Basic Auth 时返回 `401`。
- `/static/*` 返回 immutable 缓存头。
- 数据库 migration 已应用，MySQL 网络和凭证可用。
- 生产 `node_modules` 包含所有 external dependencies。
- 环境文件和管理员/数据库密码未进入 Git。

## 20. 相关文档

- [Hono Node.js adapter](https://hono.dev/docs/getting-started/nodejs)
- [Vite backend integration](https://vite.dev/guide/backend-integration.html)
- [Vite build options](https://vite.dev/config/build-options.html)
- [Drizzle ORM MySQL](https://orm.drizzle.team/docs/get-started/mysql-new)
- [Node.js environment variables](https://nodejs.org/api/environment_variables.html)
