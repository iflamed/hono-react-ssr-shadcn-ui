![Hono, React, SSR, Shadcn UI and Node.js](https://cdn.dotcopilot.ai/images/admin-c25fca60-b075-4884-896b-f3ba5ac94744-1744827668519.webp)

# Hono React SSR for Node.js

A Hono + React 19 SSR template for Node.js with Tailwind CSS 4, Shadcn UI, Vite 8, TypeScript 7, i18n, Drizzle ORM and MySQL.

## Develop

Install dependencies, configure `.env.local`, and start the Vite development server:

```shell
npm install
npm run typecheck
npm run dev
```

Required environment variables:

```shell
APP_PORT="3000"
DATABASE_HOST="127.0.0.1"
DATABASE_PORT="3306"
DATABASE_USERNAME="app"
DATABASE_PASSWORD="change-me"
DATABASE_NAME="hono_blog"
DATABASE_TABLE_PREFIX="hono"
BLOG_USERNAME="admin"
BLOG_PASSWORD="change-me"
```

Environment files are loaded in this order: `.env.${SERVER_MODE}`, `.env.local`, then `.env`. Missing database or administrator credentials fail fast at startup.

## Build and run

```shell
npm run build
npm run preview
```

The production build is split into two directories:

- `dist/client`: hashed browser JavaScript, CSS, the Vite manifest and public assets.
- `dist/server`: the Node.js Hono entry plus lazy SSR page and route-handler chunks.

The Node server renders HTML dynamically. Requests under `/static/*` are served from `dist/client` with a one-year immutable cache policy because generated filenames contain a content hash.

## Page-level code splitting

Pages are registered as a minimal `view name -> dynamic import` map in `src/view-loaders.ts`. `ViewName` is inferred from the mapping keys, and the matching Vite manifest entry is resolved automatically. The browser hydrates only the current page, while Node SSR loads the same page module on demand. Production HTML emits only the current page's stylesheet and module-preload dependency closure.

Blog list, editor, mutation and article handlers are loaded dynamically from `src/features/blog`. MySQL, Drizzle, React and dotenv remain external Node dependencies instead of being copied into the server bundle.

Detailed architecture and upgrade notes:

- [中文：JavaScript 按页面拆分与 Node.js SSR 架构优化方案](./docs/js-code-splitting-plan.md)
- [English: Node.js Server Architecture and Optimization Guide](./docs/node-server-architecture-optimization.md)

## Database

The blog uses MySQL through Drizzle ORM. The schema is defined in `src/db/schema.ts`.

Generate and apply migrations with:

```shell
npm run migrate
```

The included `deploy.sh.example` shows the expected build upload and migration workflow. Copy it to `deploy.sh`, customize its paths and hosts, and keep the real script and environment files out of version control.

## Blog configuration

Open Graph defaults are configured where `createBlogServer()` is registered in `src/index.tsx`. `urlPrefix` is optional; without it, canonical URLs use the current request origin.

Routes:

- `/blogs`: public article list.
- `/article/:slug`: public SSR article page.
- `/blog/list`: authenticated administrator list.
- `/blog/new` and `/blog/edit/:slug`: authenticated editor pages.
- `/blog/create` and `/blog/:slug`: authenticated mutation APIs.
