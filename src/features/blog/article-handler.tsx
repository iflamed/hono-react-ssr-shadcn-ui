import markdownit from "markdown-it";
import { listPosts } from "./post-repository";
import { getBlogUrl } from "./types";
import type { BlogPost } from "@/global";
import type { BlogContext, BlogOptions } from "./types";

export const renderArticle = async (c: BlogContext, options: BlogOptions) => {
  const slug = c.req.param("idx");
  if (!slug) return c.notFound();

  const value = await c.env.blog.getWithMetadata(slug);
  if (!value.value || !value.metadata) return c.notFound();

  const post = JSON.parse(value.value) as BlogPost & { description: string };
  const postMetadata = value.metadata as Pick<BlogPost, "ts">;
  const { posts } = await listPosts(c.env.blog, 3);
  const markdown = markdownit();
  const article = `<h1>${post.title}</h1>${markdown.render(post.markdown || "")}`;
  const url = getBlogUrl(c, options, `/article/${slug}`);

  return c.view("showPost", {
    meta: {
      lang: post.lang,
      title: post.title,
      description: post.description,
      open_graph: {
        site_name: options.blogTitle,
        title: post.title,
        image: post.banner,
        url,
      },
      article: {
        publisher: options.publisher,
        publishedAt: new Date(postMetadata.ts).toISOString(),
        modifiedAt: new Date(postMetadata.ts).toISOString(),
      },
    },
    props: {
      title: post.title,
      image: post.banner,
      tags: ["hichly", "buildinpublic", "indiedev", "marketing"],
      url,
      article,
      posts,
    },
  });
};
