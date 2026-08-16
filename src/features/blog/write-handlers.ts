import slugify from "@sindresorhus/slugify";
import type { BlogContext, BlogWriteInput } from "./types";

const readBlogInput = async (
  c: BlogContext,
): Promise<{
  body: string;
  input: BlogWriteInput;
}> => {
  const body = await c.req.text();
  return {
    body,
    input: JSON.parse(body) as BlogWriteInput,
  };
};

const getMetadata = (timestamp: number) => ({ ts: timestamp });

export const createBlogPost = async (c: BlogContext) => {
  const { body, input } = await readBlogInput(c);
  const timestamp = Date.now();
  const providedSlug = input.slug?.trim().replace(/\s+/g, "-");
  const generatedSlug = slugify(input.title.replaceAll(".", ""));
  const slug = `${9999999999999 - timestamp}-${providedSlug || generatedSlug}`;

  await c.env.blog.put(slug, body, {
    metadata: getMetadata(timestamp),
  });

  return c.json({ status: 0, data: null });
};

export const updateBlogPost = async (c: BlogContext) => {
  const slug = c.req.param("idx");
  if (!slug) return c.json({ status: 1, error: "Missing blog slug" }, 400);

  const { body } = await readBlogInput(c);
  await c.env.blog.put(slug, body, {
    metadata: getMetadata(Date.now()),
  });

  return c.json({ status: 0, data: null });
};

export const deleteBlogPost = async (c: BlogContext) => {
  const slug = c.req.param("idx");
  if (!slug) return c.json({ status: 1, error: "Missing blog slug" }, 400);

  await c.env.blog.delete(slug);
  return c.json({ status: 0 });
};
