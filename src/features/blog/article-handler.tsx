import markdownit from "markdown-it";
import { findPostBySlug, listPosts } from "./post-repository";
import { getBlogUrl } from "./types";
import type { BlogContext, BlogOptions } from "./types";

export const renderArticle = async (c: BlogContext, options: BlogOptions) => {
  const slug = c.req.param("idx");
  if (!slug) return c.notFound();

  const post = await findPostBySlug(slug);
  if (!post) return c.notFound();

  const { posts } = await listPosts(3);
  const markdown = markdownit();
  const article = `<h1>${post.title}</h1>${markdown.render(post.markdown || "")}`;
  const url = getBlogUrl(c, options, `/article/${slug}`);

  return c.view("post", {
    meta: {
      lang: post.lang,
      title: post.title,
      description: post.desc,
      open_graph: {
        site_name: options.blogTitle,
        title: post.title,
        image: post.banner,
        url,
      },
      article: {
        publisher: options.publisher,
        publishedAt: new Date(post.ts).toISOString(),
        modifiedAt: new Date(post.ts).toISOString(),
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
