import slugify from "@sindresorhus/slugify";
import { createPost, deletePost, updatePost } from "./post-repository";
import { blogWriteInputSchema } from "./types";
import type { BlogContext, BlogWriteInput } from "./types";

type ParsedBlogInput =
  { input: BlogWriteInput; error?: never } | { input?: never; error: Response };

const readBlogInput = async (c: BlogContext): Promise<ParsedBlogInput> => {
  const value = await c.req.json().catch(() => null);
  const result = blogWriteInputSchema.safeParse(value);

  if (!result.success) {
    return {
      error: c.json(
        { status: 1, error: c.locale.t("blog_invalid_input") },
        400,
      ),
    };
  }

  return { input: result.data };
};

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && /UNIQUE constraint failed/i.test(error.message);

export const createBlogPost = async (c: BlogContext) => {
  const parsedInput = await readBlogInput(c);
  if (parsedInput.error) return parsedInput.error;

  const timestamp = new Date();
  const slugSource = parsedInput.input.slug || parsedInput.input.title;
  const readableSlug = slugify(slugSource.replaceAll(".", "")) || "post";
  const slug = `${9999999999999 - timestamp.getTime()}-${readableSlug}`;

  try {
    await createPost(c.env.DB, slug, parsedInput.input, timestamp);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return c.json(
        { status: 1, error: c.locale.t("blog_slug_conflict") },
        409,
      );
    }
    throw error;
  }

  return c.json({ status: 0, data: { slug } });
};

export const updateBlogPost = async (c: BlogContext) => {
  const slug = c.req.param("idx");
  if (!slug) {
    return c.json({ status: 1, error: c.locale.t("blog_missing_slug") }, 400);
  }

  const parsedInput = await readBlogInput(c);
  if (parsedInput.error) return parsedInput.error;

  const isUpdated = await updatePost(
    c.env.DB,
    slug,
    parsedInput.input,
    new Date(),
  );
  if (!isUpdated) {
    return c.json({ status: 1, error: c.locale.t("blog_not_found") }, 404);
  }

  return c.json({ status: 0, data: null });
};

export const deleteBlogPost = async (c: BlogContext) => {
  const slug = c.req.param("idx");
  if (!slug) {
    return c.json({ status: 1, error: c.locale.t("blog_missing_slug") }, 400);
  }

  const isDeleted = await deletePost(c.env.DB, slug);
  if (!isDeleted) {
    return c.json({ status: 1, error: c.locale.t("blog_not_found") }, 404);
  }

  return c.json({ status: 0 });
};
