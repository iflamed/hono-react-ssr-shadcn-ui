# Node.js Server Architecture and Optimization Guide

> Branch: `node-server`
>
> Status: runtime upgrades, page splitting, server handler splitting, and simplified view registration are implemented
>
> Last updated: 2026-07-29
>
> Chinese version: [JavaScript Code Splitting and Node.js SSR Architecture](./js-code-splitting-plan.md)

## 1. Purpose

This document describes the optimized Node.js edition of the Hono + React SSR template. It covers:

- runtime and dependency upgrades;
- browser page-level code splitting;
- Node SSR page and route-handler splitting;
- manifest-driven asset injection;
- MySQL and Drizzle integration;
- server dependency externalization;
- static asset caching;
- build, deployment, and maintenance requirements.

The objective is to prevent all pages, browser interactions, API handlers, Markdown rendering, and SSR dependencies from being bundled into one large browser file or one monolithic Node entry.

## 2. Runtime and Dependency Baseline

The merged branch was verified with the following stack:

| Area | Verified version or strategy |
| --- | --- |
| Runtime | Node.js 26.5.0 |
| Language | TypeScript 7.0.2 |
| UI | React and React DOM 19.2.x |
| Application framework | Hono 4.12.x |
| Node adapter | `@hono/node-server` 1.19.x |
| Build system | Vite 8.1.5 with Rolldown |
| Server build plugin | `@hono/vite-build` 1.11.x |
| Development integration | `@hono/vite-dev-server` 0.26.x |
| Database | Drizzle ORM 0.45.x and MySQL2 3.x |
| Styling | Tailwind CSS 4.x and Shadcn UI |
| Browser HTTP client | Native Fetch API |

Important upgrade decisions:

1. React remains on the 19.2 release line.
2. Vite was upgraded to version 8, and chunk grouping uses Rolldown's `codeSplitting.groups`.
3. TypeScript was upgraded to version 7 instead of downgrading the compiler to accommodate newer dependency types.
4. Hono, the Node adapter, and the Hono Vite build/development plugins were upgraded within the branch's declared ranges.
5. Axios was removed. Browser mutations now use `fetch` and explicitly reject non-successful responses.
6. This branch intentionally uses the Node build adapter, MySQL, and environment variables. Cloudflare Vite Plugin, Wrangler, and KV bindings belong to the Cloudflare edition and are not Node runtime dependencies.

The package currently has no `engines.node` declaration. Production should use a Node release supported by Vite 8 and the installed dependencies, and the chosen runtime should be validated with type checking, a production build, preview startup, and a real database connection.

## 3. High-Level Architecture

```text
Browser request
├── /static/*
│   └── @hono/node-server/serve-static
│       ├── reads dist/client
│       └── returns one-year immutable caching for hashed files
│
├── /robots.txt
│   └── served from dist/client
│
└── Page or API route
    └── dist/server/index.js
        ├── Hono middleware and Basic Auth
        ├── route-level dynamic handler import
        ├── Drizzle ORM and MySQL read/write
        ├── page-level dynamic React import
        ├── React SSR
        └── HTML with exact assets, or a JSON response
```

The build produces two dependency graphs:

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
        ├── route-handler chunks
        └── shared server chunks
```

`dist/client` contains public browser assets. `dist/server` contains executable Node.js ESM modules. The build does not pre-render blog HTML; page routes can query MySQL and render fresh HTML for each request.

## 4. Client and Server Runtime Boundaries

Rendering responsibilities are separated into dedicated modules:

```text
src/client.tsx                 Browser entry, CSS, preload polyfill
src/client/hydrate.tsx         Active-view loading and hydrateRoot
src/shared/client-shell.tsx    Providers shared by SSR and hydration
src/server/document.tsx        HTML document and asset tags
src/server/renderer.tsx        Hono React renderer integration
src/server/manifest.ts         Current-page asset resolution
src/server/serialize.ts        Safe inline hydration serialization
```

The browser entry does not import `@hono/react-renderer` or `react-dom/server`. SSR and hydration render the same `ClientShell`, view name, and props to reduce hydration mismatches.

The browser receives only the active view name, metadata, and props. It does not receive the full Vite manifest. Inline JSON escapes characters that could terminate the script element.

## 5. Minimal View Registration

`src/view-loaders.ts` contains configuration only:

```ts
export const viewLoaders = {
  hello: () => import("./view/Hello"),
  blogList: () => import("./view/BlogList"),
  blogUpdateForm: () => import("./view/BlogUpdateForm"),
  blogs: () => import("./view/Blogs"),
  showPost: () => import("./view/ShowPost"),
};
```

`src/view.tsx` derives `ViewName` from `keyof typeof viewLoaders` and provides validation and lookup helpers. Adding a page no longer requires a manually maintained union or Vite manifest module ID.

The mapping key must match the page filename after case and separator normalization:

```text
blogUpdateForm -> BlogUpdateForm.tsx
showPost       -> ShowPost.tsx
```

Every page path must remain a literal dynamic import so Vite can discover and emit an independent dynamic entry.

## 6. Client Chunking Strategy

The browser build creates one intentional stable group named `react-runtime` containing:

- `react`;
- `react-dom`;
- `scheduler`;
- `sonner`;
- `next-themes`.

React and notification infrastructure share one cache boundary because they are stable and normally loaded together. Application pages and UI components remain split according to dynamic imports and real dependency sharing.

The old catch-all `node_modules` vendor rule was removed. It created an oversized invalidation boundary where changing one unrelated package invalidated the entire browser vendor file.

The generated Rolldown runtime remains independent. It is only 0.56 KB before gzip in the current client build, so manually grouping it would add build-tool coupling without a material transfer benefit.

There is no Markdown/Axios client runtime:

- Axios has been removed;
- browser writes use native Fetch;
- `markdown-it` is loaded only by the Node article-rendering handler.

## 7. Manifest-Driven Asset Injection

The production script enforces this sequence:

```text
1. Generate the production version marker.
2. Run vite build --mode client.
3. Copy dist/client/.vite/manifest.json to src/lib/manifest.json.
4. Run vite build --mode server.
```

The Node build must run after the client build because the current client manifest is embedded into the SSR output.

For every SSR response, `src/server/manifest.ts`:

1. Locates the `src/client.tsx` entry.
2. Finds the active page's `isDynamicEntry` by normalized view name.
3. Recursively traverses the entry and page `imports` graphs.
4. Deduplicates stylesheets and JavaScript module preloads.
5. Emits only the active page's dependency closure.

This starts the active page download before hydration while avoiding preloads for unrelated pages.

`src/lib/manifest.json` is generated. It must not be edited manually, and the client-before-server order must not be reversed.

## 8. Node Route and SSR Splitting

`src/blog.tsx` remains a lightweight route and authentication registry. Route implementations are dynamically imported from:

```text
src/features/blog/
├── article-handler.tsx
├── editor-handlers.tsx
├── list-handlers.tsx
├── post-repository.ts
├── types.ts
└── write-handlers.ts
```

The resulting boundaries are intentional:

- article requests load `markdown-it` and article rendering;
- editor requests load the ISO language list and editor logic;
- POST, PUT, and DELETE requests load slug generation and write logic;
- the home page does not load the blog repository;
- public list requests do not load the editor or Markdown renderer.

Node chunks are not browser assets. They are local ESM files loaded by the same Node process. Server splitting reduces the initial entry graph, defers module parsing and evaluation, and improves functional boundaries; it should not be described as independent CDN downloads.

## 9. Server Dependency Externalization

The server build keeps these dependency families external:

- `dotenv`;
- `drizzle-orm` and its MySQL adapters;
- `mysql2`;
- `react`;
- `react-dom`.

They are resolved from the production server's `node_modules` rather than copied into `dist/server`. The current database adapter chunk is therefore only 0.85 KB instead of containing the MySQL and Drizzle dependency trees.

This also means `dist/server` is not a self-contained deployment. Production requires:

- `dist/client` and `dist/server`;
- `package.json` and its lockfile;
- installed runtime dependencies;
- environment variables;
- migration sources and configuration when migrations run on the host.

Externalization should remain limited to packages that are guaranteed to exist in production. Any change to `serverExternals` requires a clean production install and startup verification.

## 10. Dynamic SSR with MySQL and Drizzle

The Node data path is:

```text
request
-> Hono route
-> dynamic handler
-> repository or write handler
-> Drizzle ORM
-> MySQL2 connection
-> page props or JSON
-> React SSR for page requests
```

`src/db/index.ts` creates the Drizzle/MySQL connection. Environment configuration is loaded in this order:

1. `.env.${SERVER_MODE}`;
2. `.env.local`;
3. `.env`.

Required database and administrator values fail fast when missing. Production credentials must come from the server environment, a deployment secret manager, or a permission-restricted untracked environment file.

The schema is stored in `src/db/schema.ts`. Generate and apply migrations with:

```shell
npm run migrate
```

## 11. Static Asset Caching

`src/index.tsx` serves `dist/client` through `@hono/node-server/serve-static`.

Hashed `/static/*` files receive:

```text
Cache-Control: public, max-age=31556952, immutable
```

A content change produces a new URL, so these files can remain cached for one year. This policy must not be applied to dynamic HTML, API responses, authenticated routes, or mutable unhashed files.

`robots.txt` is served statically but is not covered by the one-year `/static/*` immutable middleware.

## 12. Verified Build Output

The merged production build was verified with Node.js 26.5.0 and Vite 8.1.5.

### 12.1 Client

| Output | Raw size | Gzip size |
| --- | ---: | ---: |
| Client entry | 6.34 KB | 2.92 KB |
| React runtime | 223.42 KB | 68.91 KB |
| Rolldown runtime | 0.56 KB | 0.36 KB |
| Hello page | 2.75 KB | 0.96 KB |
| Blogs page | 0.99 KB | 0.50 KB |
| BlogList page | 1.43 KB | 0.69 KB |
| ShowPost page | 34.75 KB | 12.75 KB |
| BlogUpdateForm page | 91.72 KB | 31.03 KB |
| Global CSS | 56.03 KB | 9.56 KB |

The React runtime is a stable shared dependency and is approximately 68.91 KB after gzip. Splitting packages that every hydrated page always needs would not reduce the page dependency closure.

### 12.2 Node SSR

| Output | Raw size | Gzip size |
| --- | ---: | ---: |
| Node entry | 53.15 KB | 19.96 KB |
| Database adapter | 0.85 KB | 0.50 KB |
| List handlers | 0.83 KB | 0.37 KB |
| Editor handlers | 10.15 KB | 4.25 KB |
| Write handlers | 28.62 KB | 9.85 KB |
| Article handler | 103.05 KB | 46.21 KB |
| BlogUpdateForm SSR page | 90.62 KB | 31.04 KB |
| Shared runtime | 28.72 KB | 9.36 KB |

The aggregate size of every emitted file is not the amount transferred for one browser page. The browser receives the client entry, shared dependencies, and the active page's manifest closure. Node loads server modules locally according to the requested route.

### 12.3 Runtime verification

The compiled Node preview was started with valid local MySQL configuration and verified as follows:

- `/` returned `200` SSR HTML;
- `/blogs` queried the configured database and returned `200` SSR HTML;
- `/blog/list` returned `401` without Basic Auth credentials;
- the home document preloaded `Hello` and shared dependencies but not the blog page;
- the blogs document preloaded `Blogs` and its actual dependency closure;
- the hashed client entry returned `Cache-Control: public, max-age=31556952, immutable`.

## 13. Adding a Page

1. Create `src/view/LoginPage.tsx`.
2. Add one literal import mapping:

```ts
export const viewLoaders = {
  // existing views...
  loginPage: () => import("./view/LoginPage"),
};
```

3. Use the inferred view name in a route:

```ts
app.get("/login", (c) => {
  return c.view("loginPage", {
    meta: { title: "Login" },
    props: {},
  });
});
```

No `ViewName` union or Vite manifest module ID update is required.

## 14. Development, Build, and Deployment

```shell
npm run dev
npm run typecheck
npm run build
npm run preview
```

`SERVER_MODE` selects `.env.${SERVER_MODE}` for environment-specific builds. The included `deploy.sh.example` demonstrates uploading build output and migration files, installing dependencies remotely, applying migrations, and restarting a process supervisor.

Real deployment scripts and environment files must remain untracked.

## 15. Verification Checklist

- `npm run typecheck` passes.
- `npm run build` produces client and Node chunks.
- Every page is an `isDynamicEntry` in the client manifest.
- Client output does not contain server rendering modules.
- SSR HTML preloads only the active page and its shared dependencies.
- `dist/server/index.js` starts on the production Node runtime.
- `/` and `/blogs` return SSR HTML.
- A valid article route renders data from MySQL.
- `/blog/list` returns `401` without Basic Auth credentials.
- `/static/*` returns the immutable cache header.
- Migrations are applied and MySQL is reachable.
- All external dependencies exist in production `node_modules`.
- Database and administrator credentials are not tracked by Git.

The production preview requires valid database environment variables and a reachable MySQL server. The current verification environment satisfied those conditions, but every deployment target still requires its own database network and credential check.

## 16. Maintenance Constraints

- Keep `src/view-loaders.ts` limited to the view mapping.
- Keep page imports literal and view keys aligned with filenames.
- Do not restore a catch-all browser vendor chunk.
- Do not import database, Node-only, or server renderer modules from the client graph.
- Do not manually edit `src/lib/manifest.json`.
- Keep the client-before-server build order.
- Revalidate external dependencies after Node, Vite, or Hono upgrades.
- Apply immutable caching only to content-hashed assets.
- Keep SSR and hydration shells and props equivalent.
- Recheck manifest structure and chunk grouping after Vite/Rolldown upgrades.

## 17. Recommended Next Steps

1. Add a production-verified `engines.node` range to `package.json`.
2. Evaluate no-hydration or island rendering for pages without interactions.
3. Measure Core Web Vitals, browser cache hit rate, Node startup, memory, and route latency using real traffic.
4. Add a database pool, health checks, and graceful shutdown appropriate for the deployment topology.
5. Validate write API payloads with Zod and return consistent application errors.
6. Create new shared chunks only when measured cross-page reuse justifies the cache boundary.

## 18. References

- [Hono Node.js adapter](https://hono.dev/docs/getting-started/nodejs)
- [Vite backend integration](https://vite.dev/guide/backend-integration.html)
- [Vite build options](https://vite.dev/config/build-options.html)
- [Drizzle ORM with MySQL](https://orm.drizzle.team/docs/get-started/mysql-new)
- [Node.js environment variables](https://nodejs.org/api/environment_variables.html)
