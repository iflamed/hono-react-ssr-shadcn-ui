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

Pages are registered as dynamic imports in `src/view-loaders.ts`. The client hydrates only the current page, while SSR loads the same page module on demand. Production HTML resolves the Vite manifest and emits only the current page's styles and module preloads.

The Cloudflare Vite Plugin builds browser assets into `dist/client` and the Worker into `dist/ssr`. Route handlers and SSR pages remain separate ES modules under `dist/ssr/chunks`; the generated `dist/ssr/wrangler.json` points Workers Assets to `dist/client`.

Static assets use Workers' default asset-first routing, so hashed JS, CSS and files such as `robots.txt` are served without invoking SSR. Requests without a matching asset are handled by the Hono Worker.

See [docs/js-code-splitting-plan.md](./docs/js-code-splitting-plan.md) for the architecture, implementation order, verification results, and follow-up migration plan.

## Blog configuration

### Blog Database

We use Cloudflare's KV-Namespace to store articles.
You can create KV-Namespace with this command:

```shell
npx wrangler kv namespace create blog
```

This command will output the KV-Namespace configuration like this:

```text
[[kv_namespaces]]
binding = "blog"
id = "8617f8968998499bb3db425063f8f11d"
```

Then you should copy the KV-Namespace configuration to `wrangler.toml`

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
