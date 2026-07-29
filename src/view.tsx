import { viewLoaders } from "./view-loaders";
import type { ComponentType } from "react";

type ViewModule = {
  default: ComponentType<any>;
};

const registeredViewLoaders: Record<string, () => Promise<ViewModule>> =
  viewLoaders;

export type ViewName = keyof typeof viewLoaders;

export const isViewName = (name: string | undefined): name is ViewName => {
  return Boolean(name && Object.hasOwn(viewLoaders, name));
};

export const loadView = async (name: ViewName): Promise<ComponentType<any>> => {
  const viewModule = await registeredViewLoaders[name]();
  return viewModule.default;
};

export { viewLoaders };
