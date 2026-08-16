import type { BlogPost } from "@/global";
import type { BlogWriteInput } from "./types";

type ListedPosts = {
  posts: BlogPost[];
  cursor: string;
};

type StoredBlogPost = Omit<BlogWriteInput, "description"> & {
  desc?: string;
  description?: string;
};

const KV_BULK_READ_LIMIT = 100;

const getStoredPosts = async (
  blog: KVNamespace,
  keyNames: string[],
): Promise<Map<string, StoredBlogPost | null>> => {
  const batches = Array.from(
    { length: Math.ceil(keyNames.length / KV_BULK_READ_LIMIT) },
    (_, index) =>
      keyNames.slice(
        index * KV_BULK_READ_LIMIT,
        (index + 1) * KV_BULK_READ_LIMIT,
      ),
  );
  const results = await Promise.all(
    batches.map((keys) => blog.get<StoredBlogPost>(keys, "json")),
  );

  return new Map(results.flatMap((result) => [...result]));
};

export const listPosts = async (
  blog: KVNamespace,
  limit: number,
  cursor?: string,
): Promise<ListedPosts> => {
  const result = await blog.list({ limit, cursor });
  const keyNames = result.keys.map((key) => key.name);
  const storedPosts = await getStoredPosts(blog, keyNames);

  const posts = result.keys.flatMap((key) => {
    const storedPost = storedPosts.get(key.name);
    const metadata = key.metadata as Pick<BlogPost, "ts"> | null;
    if (!storedPost) return [];

    return [
      {
        slug: key.name,
        title: storedPost.title,
        desc: storedPost.description || storedPost.desc || "",
        banner: storedPost.banner,
        lang: storedPost.lang,
        ts: metadata?.ts || 0,
      },
    ];
  });

  return {
    posts,
    cursor: result.list_complete ? "" : result.cursor,
  };
};
