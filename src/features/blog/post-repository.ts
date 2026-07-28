import db from "@/db";
import { blog } from "@/db/schema";
import { desc, eq, lt } from "drizzle-orm";
import type { BlogPost } from "@/global";

type ListedPosts = {
  posts: BlogPost[];
  cursor: number;
};

const toBlogPost = (post: typeof blog.$inferSelect): BlogPost => ({
  slug: post.slug,
  title: post.title,
  desc: post.desc,
  banner: post.banner,
  markdown: post.markdown || undefined,
  lang: post.lang,
  ts: post.ts,
});

const getCursor = (cursor?: string): number => {
  const parsedCursor = Number.parseInt(cursor || "", 10);
  return Number.isSafeInteger(parsedCursor) && parsedCursor > 0
    ? parsedCursor
    : Number.MAX_SAFE_INTEGER;
};

export const listPosts = async (
  limit: number,
  cursor?: string,
): Promise<ListedPosts> => {
  const values = await db.query.blog.findMany({
    limit,
    where: lt(blog.id, getCursor(cursor)),
    orderBy: [desc(blog.id)],
  });

  return {
    posts: values.map(toBlogPost),
    cursor: values.length === limit ? values.at(-1)?.id || 0 : 0,
  };
};

export const findPostBySlug = async (slug: string) => {
  return db.query.blog.findFirst({
    where: eq(blog.slug, slug),
  });
};
