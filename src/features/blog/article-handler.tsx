import markdownit from "markdown-it";
import { getPostBySlug, listPosts } from "./post-repository";
import { getBlogUrl } from "./types";
import type { BlogContext, BlogOptions } from "./types";

export const renderArticle = async (c: BlogContext, options: BlogOptions) => {
  const slug = c.req.param("idx");
  if (!slug) return c.notFound();

  const post = await getPostBySlug(c.env.DB, slug);
  if (!post) return c.notFound();

  const { posts } = await listPosts(c.env.DB, 3);
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
        publishedAt: post.createdAt.toISOString(),
        modifiedAt: post.updatedAt.toISOString(),
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
