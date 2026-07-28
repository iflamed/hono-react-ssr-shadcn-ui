import type { ComponentType } from "react";
import type { ViewName } from "./global";

type ViewModule = {
  default: ComponentType<any>;
};

type ViewDefinition = {
  moduleId: string;
  load: () => Promise<ViewModule>;
};

export const viewDefinitions = {
  hello: {
    moduleId: "src/view/Hello.tsx",
    load: () => import("./view/Hello"),
  },
  bloglist: {
    moduleId: "src/view/BlogList.tsx",
    load: () => import("./view/BlogList"),
  },
  blogupdateform: {
    moduleId: "src/view/BlogUpdateForm.tsx",
    load: () => import("./view/BlogUpdateForm"),
  },
  blogs: {
    moduleId: "src/view/Blogs.tsx",
    load: () => import("./view/Blogs"),
  },
  post: {
    moduleId: "src/view/ShowPost.tsx",
    load: () => import("./view/ShowPost"),
  },
} satisfies Record<ViewName, ViewDefinition>;

export const isViewName = (name: string | undefined): name is ViewName => {
  return Boolean(name && name in viewDefinitions);
};

export const loadView = async (name: ViewName): Promise<ComponentType<any>> => {
  const viewModule = await viewDefinitions[name].load();
  return viewModule.default;
};
