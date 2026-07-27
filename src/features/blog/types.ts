import type { Context } from "hono";

export type BlogBindings = Pick<
  Cloudflare.Env,
  "blog" | "BLOG_USERNAME" | "BLOG_PASSWORD"
>;

export type BlogEnv = {
  Bindings: BlogBindings;
};

export type BlogContext = Context<BlogEnv>;

export type BlogOptions = {
  defaultOGImage: string;
  blogTitle: string;
  blogDescription: string;
  urlPrefix?: string;
  publisher: string;
};

export const getBlogUrl = (
  c: BlogContext,
  options: BlogOptions,
  pathname: string,
) => `${options.urlPrefix || new URL(c.req.url).origin}${pathname}`;

export type BlogWriteInput = {
  banner: string;
  description: string;
  lang: string;
  markdown: string;
  slug?: string;
  title: string;
};
