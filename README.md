## Develop and Deloly

```shell
npm install
# Start the dev server
npm run dev
# Start the client server
npm run client
```

```shell
npm run deploy
```

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
id = "8617f8968998499bb3db425063f8f01d"
```

Then you should copy the KV-Namespace configuration to `wrangler.toml`

### Blog's Admin
You can change the password of you blog server configuration, just need find these code in the `index.tsx` file like below:
```javascript
app.route('/', createBlogServer({
  defaultOGImage: 'https://aicanvas.app/statics/uploads/1732953286728187318_blog_banner.jpg',
  blogTitle: 'Hono React Blog',
  blogDescription: 'A place to share stories about Honojs.',
  urlPrefix: 'https://hono-react-ssr-shadcn-ui.pages.dev',
  username: 'admin',
  password: '123456'
}))
```

### Blog's Routes

For Admin: [/blog/list](https://hono-react-ssr-shadcn-ui.pages.dev/blog/list)
For Users: [/blogs](https://hono-react-ssr-shadcn-ui.pages.dev/blogs)

### Blog Example
TapAI Blog: [https://tapai.aicanvas.app/blogs](https://tapai.aicanvas.app/blogs)

## Sites build with this repo?

1. TapAI: [https://tapai.aicanvas.app/](https://tapai.aicanvas.app/), a site provide a iOS shortcut to boost your productivity, which you can use ChatGPT with TapAI to add calendar, reminder, note easily.

2. Hichly: [https://hichly.com](https://hichly.com), Hichly is the ultimate platform for sharing and refining niche ideas with community feedback to turn your concepts into reality.
