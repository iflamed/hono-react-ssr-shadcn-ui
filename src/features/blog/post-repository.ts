import type { BlogPost } from "@/global";

type ListedPosts = {
  posts: BlogPost[];
  cursor: string;
};

export const listPosts = async (
  blog: KVNamespace,
  limit: number,
  cursor?: string,
): Promise<ListedPosts> => {
  const result = await blog.list({ limit, cursor });
  const posts = result.keys.flatMap((key) => {
    const metadata = key.metadata as BlogPost | null;
    if (!metadata) return [];

    return [
      {
        slug: key.name,
        title: metadata.title,
        desc: metadata.desc,
        banner: metadata.banner,
        ts: metadata.ts,
      },
    ];
  });

  return {
    posts,
    cursor: result.list_complete ? "" : result.cursor,
  };
};
