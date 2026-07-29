import { listPosts } from "./post-repository";
import { getBlogUrl } from "./types";
import type { BlogContext, BlogOptions } from "./types";

const getLimit = (value: string | undefined, fallback: number): number => {
  const limit = Number.parseInt(value || "", 10);
  return Number.isFinite(limit) && limit > 0 ? limit : fallback;
};

export const renderAdminBlogList = async (
  c: BlogContext,
  options: BlogOptions,
) => {
  const { posts, cursor } = await listPosts(
    getLimit(c.req.query("limit"), 12),
    c.req.query("cursor"),
  );

  return c.view("blogList", {
    meta: {
      title: `${options.blogTitle} - blog posts`,
      description: `${options.blogTitle} - blog posts`,
      open_graph: {
        site_name: options.blogTitle,
        title: `${options.blogTitle} - blog posts`,
        image: options.defaultOGImage,
        url: getBlogUrl(c, options, "/blog/list"),
      },
    },
    props: { posts, cursor },
  });
};

export const renderPublicBlogList = async (
  c: BlogContext,
  options: BlogOptions,
) => {
  const { posts, cursor } = await listPosts(
    getLimit(c.req.query("limit"), 18),
    c.req.query("cursor"),
  );
  const title = `${options.blogTitle} - ${options.blogDescription}`;

  return c.view("blogs", {
    meta: {
      title,
      description: title,
      open_graph: {
        site_name: options.blogTitle,
        title,
        image: options.defaultOGImage,
        url: getBlogUrl(c, options, "/blogs"),
      },
    },
    props: { posts, cursor },
  });
};
