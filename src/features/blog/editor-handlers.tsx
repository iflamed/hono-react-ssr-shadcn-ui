import ISO6391 from "iso-639-1";
import { getBlogUrl } from "./types";
import type { BlogPost } from "@/global";
import type { BlogContext, BlogOptions } from "./types";

const languages = ISO6391.getLanguages(ISO6391.getAllCodes());

export const renderNewBlogPost = (c: BlogContext, options: BlogOptions) => {
  const post: BlogPost = {
    slug: "",
    title: "",
    desc: "",
    banner: "",
    markdown: "",
    ts: 0,
  };

  return c.view("blogupdateform", {
    meta: {
      title: `${options.blogTitle} - new blog post`,
      description: `${options.blogTitle} - new blog post`,
      open_graph: {
        site_name: options.blogTitle,
        title: `${options.blogTitle} - new blog post`,
        image: options.defaultOGImage,
        url: getBlogUrl(c, options, "/blog/new"),
      },
    },
    props: { post, languages },
  });
};

export const renderEditBlogPost = async (
  c: BlogContext,
  options: BlogOptions,
) => {
  const slug = c.req.param("idx");
  if (!slug) return c.notFound();

  const value = await c.env.blog.get(slug);
  if (!value) return c.notFound();

  const storedPost = JSON.parse(value) as BlogPost & { description?: string };
  const post: BlogPost = {
    ...storedPost,
    slug,
    desc: storedPost.description || storedPost.desc,
  };

  return c.view("blogupdateform", {
    meta: {
      title: `${options.blogTitle} - edit blog post`,
      description: `${options.blogTitle} - edit blog post`,
      open_graph: {
        site_name: options.blogTitle,
        title: `${options.blogTitle} - edit blog post`,
        image: options.defaultOGImage,
        url: getBlogUrl(c, options, `/blog/${slug}`),
      },
    },
    props: { post, languages },
  });
};
