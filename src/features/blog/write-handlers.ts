import db from "@/db";
import { blog } from "@/db/schema";
import slugify from "@sindresorhus/slugify";
import { eq } from "drizzle-orm";
import type { BlogContext, BlogWriteInput } from "./types";

const readBlogInput = async (c: BlogContext): Promise<BlogWriteInput> => {
  return JSON.parse(await c.req.text()) as BlogWriteInput;
};

export const createBlogPost = async (c: BlogContext) => {
  const input = await readBlogInput(c);
  const timestamp = Date.now();
  const providedSlug = input.slug?.trim().replace(/\s+/g, "-");
  const generatedSlug = slugify(input.title.replaceAll(".", ""));
  const slug = `${9999999999999 - timestamp}-${providedSlug || generatedSlug}`;

  const result = await db.insert(blog).values({
    slug,
    ts: timestamp,
    title: input.title,
    desc: input.description,
    banner: input.banner,
    markdown: input.markdown,
    lang: input.lang,
  });

  return c.json({ status: 0, data: result });
};

export const updateBlogPost = async (c: BlogContext) => {
  const slug = c.req.param("idx");
  if (!slug) return c.json({ status: 1, error: "Missing blog slug" }, 400);

  const input = await readBlogInput(c);
  const result = await db
    .update(blog)
    .set({
      title: input.title,
      markdown: input.markdown,
      desc: input.description,
      banner: input.banner,
      lang: input.lang,
      ts: Date.now(),
    })
    .where(eq(blog.slug, slug));

  return c.json({ status: 0, data: result });
};

export const deleteBlogPost = async (c: BlogContext) => {
  const slug = c.req.param("idx");
  if (!slug) return c.json({ status: 1, error: "Missing blog slug" }, 400);

  await db.delete(blog).where(eq(blog.slug, slug));
  return c.json({ status: 0 });
};
