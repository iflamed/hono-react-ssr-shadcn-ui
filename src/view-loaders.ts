export const viewLoaders = {
  hello: () => import("./view/Hello"),
  blogList: () => import("./view/BlogList"),
  blogUpdateForm: () => import("./view/BlogUpdateForm"),
  blogs: () => import("./view/Blogs"),
  showPost: () => import("./view/ShowPost"),
};
