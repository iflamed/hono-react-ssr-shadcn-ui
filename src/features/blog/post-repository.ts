import { desc, eq, lt } from "drizzle-orm";
import { createDatabase } from "@/db/client";
import { posts } from "@/db/schema";
import type { BlogPost } from "@/global";
import type { BlogWriteInput } from "./types";

type ListedPosts = {
  posts: BlogPost[];
  cursor: string;
};

const MAX_PAGE_SIZE = 100;

export const toBlogPost = (post: typeof posts.$inferSelect): BlogPost => ({
  slug: post.slug,
  title: post.title,
  desc: post.description,
  banner: post.banner,
  markdown: post.markdown,
  lang: post.lang,
  ts: post.updatedAt.getTime(),
});

const getCursorId = (cursor?: string): number | undefined => {
  if (!cursor) return undefined;

  const cursorId = Number(cursor);
  return Number.isSafeInteger(cursorId) && cursorId > 0 ? cursorId : undefined;
};

export const listPosts = async (
  binding: D1Database,
  limit: number,
  cursor?: string,
): Promise<ListedPosts> => {
  const pageSize = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
  const cursorId = getCursorId(cursor);
  const database = createDatabase(binding);
  const rows = await database
    .select()
    .from(posts)
    .where(cursorId ? lt(posts.id, cursorId) : undefined)
    .orderBy(desc(posts.id))
    .limit(pageSize + 1);
  const hasNextPage = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);

  return {
    posts: pageRows.map(toBlogPost),
    cursor: hasNextPage ? String(pageRows.at(-1)?.id || "") : "",
  };
};

export const getPostBySlug = async (binding: D1Database, slug: string) => {
  const database = createDatabase(binding);
  const [post] = await database
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  return post;
};

export const createPost = async (
  binding: D1Database,
  slug: string,
  input: BlogWriteInput,
  timestamp: Date,
) => {
  const database = createDatabase(binding);
  await database.insert(posts).values({
    slug,
    title: input.title,
    description: input.description,
    banner: input.banner,
    markdown: input.markdown,
    lang: input.lang,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
};

export const updatePost = async (
  binding: D1Database,
  slug: string,
  input: BlogWriteInput,
  timestamp: Date,
): Promise<boolean> => {
  const database = createDatabase(binding);
  const updatedPosts = await database
    .update(posts)
    .set({
      title: input.title,
      description: input.description,
      banner: input.banner,
      markdown: input.markdown,
      lang: input.lang,
      updatedAt: timestamp,
    })
    .where(eq(posts.slug, slug))
    .returning({ id: posts.id });

  return updatedPosts.length > 0;
};

export const deletePost = async (
  binding: D1Database,
  slug: string,
): Promise<boolean> => {
  const database = createDatabase(binding);
  const deletedPosts = await database
    .delete(posts)
    .where(eq(posts.slug, slug))
    .returning({ id: posts.id });

  return deletedPosts.length > 0;
};
