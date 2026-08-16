![Hono,React,SSR,Shadcn/ui,Cloudflare Workers](https://cdn.dotcopilot.ai/images/admin-c25fca60-b075-4884-896b-f3ba5ac94744-1744827668519.webp)

# Hono-react-ssr-shadcn-ui

Support `Tailwindcss 4.1` `React 19.1` `Vite 8` `i18n` and `Cursor - The AI Code Editor`

> Template code for Honojs with React SSR, Shadcn-UI and a simple blog running on Cloudflare Workers with the official Cloudflare Vite Plugin.

## Online Demo

Home page: [https://hono-react-ssr-shadcn-ui.iflamed.workers.dev/](https://hono-react-ssr-shadcn-ui.iflamed.workers.dev/)

Blogs Page: [https://hono-react-ssr-shadcn-ui.iflamed.workers.dev/blogs](https://hono-react-ssr-shadcn-ui.iflamed.workers.dev/blogs)

## Develop and Deploy

Start the development server

```shell
npm install
# Create/update the local D1 schema
npm run db:migrate:local
# Check TypeScript types
npm run typecheck
# Start the dev server
npm run dev
# Generate Cloudflare binding and runtime types after changing wrangler.toml
npm run cf-typegen
# Build and preview the production Worker locally
npm run build
npm run preview
```

Deploy to Cloudflare Workers

```shell
npm run deploy
```

## Page-level code splitting

Pages are registered as a simple `view name -> dynamic import` map in `src/view-loaders.ts`. `ViewName` is inferred from the map keys, and the matching Vite manifest entry is resolved automatically. The client hydrates only the current page, while SSR loads the same page module on demand. Production HTML emits only the current page's styles and module preloads.

The Cloudflare Vite Plugin builds browser assets into `dist/client` and the Worker into `dist/ssr`. Route handlers and SSR pages remain separate ES modules under `dist/ssr/chunks`; the generated `dist/ssr/wrangler.json` points Workers Assets to `dist/client`.

Static assets use Workers' default asset-first routing, so hashed JS, CSS and files such as `robots.txt` are served without invoking SSR. Requests without a matching asset are handled by the Hono Worker.

See [docs/js-code-splitting-plan.md](./docs/js-code-splitting-plan.md) for the original implementation plan and [docs/cloudflare-workers-architecture-optimization.md](./docs/cloudflare-workers-architecture-optimization.md) for the complete English architecture, optimization, and Pages-to-Workers migration guide.

## Public page cache

The home page, public blog list, and article pages use Hono's cache middleware,
backed by the Cloudflare Workers Cache API, together with Workers Caching in
front of the Worker. Each route creates the middleware with
`createPublicPageCache(maxAgeSeconds, staleIfErrorSeconds)`, so both its normal
TTL and optional error fallback window can be configured at route registration.
The fallback window defaults to seven days.

Responses are varied by the language cookie and `Accept-Language` header.
Authenticated blog administration routes, write operations, errors and all
other responses without an explicit public cache policy use `private, no-store`.
The short normal TTL intentionally avoids explicit cache-purge logic: a blog
update may take up to five minutes to appear in an already cached region.

The Wrangler cache configuration enables cross-version caching. A new Worker
version can therefore reuse the last successful public response; if the Worker
throws, times out or returns `5xx` while refreshing an expired page, Cloudflare
can continue serving that stale response during the configured fallback window.
For production, serve the Worker through a custom domain so the Hono Cache API
layer is also available.

## Blog configuration

### Blog Database

Blog articles are stored in Cloudflare D1 and accessed through Drizzle ORM. The
schema source is `src/db/schema.ts`; generated SQL migrations are committed under
`drizzle/d1`.

For local development, apply all migrations before starting Vite:

```shell
npm run db:migrate:local
npm run dev
```

After changing the schema, generate and verify a migration:

```shell
npm run db:generate -- --name=describe-your-change
npm run db:check
npm run db:migrate:local
```

`wrangler.toml` declares the `DB` binding without a database ID, so Wrangler can
automatically provision the D1 database for this template. The deployment script
builds the application, applies all pending remote migrations, and only then
deploys the Worker:

```shell
npm run deploy
```

For an established production service, avoid the first-deploy provisioning gap:

```shell
npx wrangler d1 create hono-react-ssr-blog
# Add the returned database_name and database_id to the DB block in wrangler.toml
npm run cf-typegen
# Import existing KV records, verify them, and only then deploy the D1 code
npm run deploy
```

`npm run db:migrate:remote` remains available for applying migrations without a
deployment. Drizzle migrations create and upgrade the schema; they do not
automatically copy records from an existing KV namespace.

### Blog's Admin

You can change the open graph infomation of you blog server configuration, just need find these code in the `index.tsx` file like below:

```javascript
app.route(
  "/",
  createBlogServer({
    defaultOGImage:
      "https://aicanvas.app/statics/uploads/1732953286728187318_blog_banner.jpg",
    blogTitle: "Hono React Blog",
    blogDescription: "A place to share stories about Honojs.",
    publisher: "https://x.com/dotcopilot_ai",
  }),
);
```

Open Graph URLs default to the current request origin, which works for `workers.dev`, preview URLs and custom domains. Set the optional `urlPrefix` property only when a separate canonical origin is required.

Then set the password of your blog's administrator, just put below environment to your `.dev.vars` file when it is developing mode.

```shell
BLOG_USERNAME="admin"
BLOG_PASSWORD="123456"
```

For production, keep non-sensitive variables in `wrangler.toml` and upload the administrator password as a Worker secret. `wrangler.toml` declares it as required, so preview and deployment can validate that it exists:

```shell
npx wrangler secret put BLOG_PASSWORD
```

After changing bindings or variables, run `npm run cf-typegen` and commit the updated `worker-configuration.d.ts`.

### Blog's Routes

For Admin: [/blog/list](https://hono-react-ssr-shadcn-ui.iflamed.workers.dev/blog/list)

For Users: [/blogs](https://hono-react-ssr-shadcn-ui.iflamed.workers.dev/blogs)

### Blog Example

TapAI Blog: [https://tapai.aicanvas.app/blogs](https://tapai.aicanvas.app/blogs)

## Sites build with this repo?

1. TapAI: [https://tapai.aicanvas.app/](https://tapai.aicanvas.app/), a site provide a iOS shortcut to boost your productivity, which you can use ChatGPT with TapAI to add calendar, reminder, note easily.

2. Hichly: [https://hichly.com](https://hichly.com), Hichly is the ultimate platform for sharing and refining niche ideas with community feedback to turn your concepts into reality.

3. Dot Copilot: [https://dotcopilot.ai](https://dotcopilot.ai), a non-intrusive and customizable Android AI assistant that simplifies your daily tasks. Parse receipts, manage to-dos, and more—Dot Copilot is here to help without interrupting your workflow.
