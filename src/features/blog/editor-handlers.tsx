import ISO6391 from "iso-639-1";
import { findPostBySlug } from "./post-repository";
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

  return c.view("blogUpdateForm", {
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

  const storedPost = await findPostBySlug(slug);
  if (!storedPost) return c.notFound();

  const post: BlogPost = {
    ...storedPost,
    markdown: storedPost.markdown || undefined,
  };

  return c.view("blogUpdateForm", {
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
