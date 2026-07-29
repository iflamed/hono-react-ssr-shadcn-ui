import env from "./config/env";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { trimTrailingSlash } from "hono/trailing-slash";
import { Renderer } from "./server/renderer";
import { LanguageDetector, Translatori18n, ViewRenderer } from "./middleware";
import createBlogServer from "./blog";
import { getPath } from "./locales";

const app = new Hono({ getPath });

app.use(trimTrailingSlash());
app.use(LanguageDetector);
app.use(Translatori18n);
app.use(Renderer);
app.use(ViewRenderer);

app.use("/static/*", async (c, next) => {
  c.header("Cache-Control", "public, max-age=31556952, immutable");
  await next();
});
app.use("/static/*", serveStatic({ root: "./dist/client" }));
app.use("/robots.txt", serveStatic({ root: "./dist/client" }));

app.get("/", (c) => {
  return c.view("hello", {
    meta: {
      title: "Honojs demo with react SSR and shadcn UI.",
    },
    props: {
      tp: "index",
    },
  });
});

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

console.info("APP_PORT is:", env.APP_PORT);

export default app;
