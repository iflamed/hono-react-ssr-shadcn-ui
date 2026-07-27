import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { Renderer } from "./server/renderer";
import { LanguageDetector, Translatori18n, ViewRenderer } from "./middleware";
import { getPath } from "./locales";
import type { BlogEnv, BlogOptions } from "./features/blog/types";

export default function createBlogServer(options: BlogOptions) {
  const app = new Hono<BlogEnv>({ getPath });

  app.use(LanguageDetector);
  app.use(Translatori18n);
  app.use(Renderer);
  app.use(ViewRenderer);

  const author = basicAuth({
    verifyUser: (username, password, c) => {
      return (
        username === c.env.BLOG_USERNAME && password === c.env.BLOG_PASSWORD
      );
    },
  });

  app.use("/blog/*", author);

  app.get("/blog/list", async (c) => {
    const { renderAdminBlogList } =
      await import("./features/blog/list-handlers");
    return renderAdminBlogList(c, options);
  });

  app.get("/blog/new", async (c) => {
    const { renderNewBlogPost } =
      await import("./features/blog/editor-handlers");
    return renderNewBlogPost(c, options);
  });

  app.post("/blog/create", async (c) => {
    const { createBlogPost } = await import("./features/blog/write-handlers");
    return createBlogPost(c);
  });

  app.get("/blog/edit/:idx", async (c) => {
    const { renderEditBlogPost } =
      await import("./features/blog/editor-handlers");
    return renderEditBlogPost(c, options);
  });

  app.put("/blog/:idx", async (c) => {
    const { updateBlogPost } = await import("./features/blog/write-handlers");
    return updateBlogPost(c);
  });

  app.delete("/blog/:idx", async (c) => {
    const { deleteBlogPost } = await import("./features/blog/write-handlers");
    return deleteBlogPost(c);
  });

  app.get("/blogs", async (c) => {
    const { renderPublicBlogList } =
      await import("./features/blog/list-handlers");
    return renderPublicBlogList(c, options);
  });

  app.get("/article/:idx", async (c) => {
    const { renderArticle } = await import("./features/blog/article-handler");
    return renderArticle(c, options);
  });

  return app;
}
