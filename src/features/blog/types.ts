import type { Context } from "hono";
import { z } from "zod";

export type BlogBindings = Pick<
  Cloudflare.Env,
  "DB" | "BLOG_USERNAME" | "BLOG_PASSWORD"
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

export const blogWriteInputSchema = z.object({
  banner: z.string().trim().min(1).max(2048),
  description: z.string().trim().min(1).max(2000),
  lang: z
    .string()
    .trim()
    .regex(/^[a-z]{2}$/i),
  markdown: z.string().min(1).max(1_000_000),
  slug: z.string().trim().max(200).optional(),
  title: z.string().trim().min(1).max(200),
});

export type BlogWriteInput = z.infer<typeof blogWriteInputSchema>;
