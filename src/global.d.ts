import type { I18nInstance } from "@/lib/i18n";
import type { ViewName as RegisteredViewName } from "@/view";
import type { LanguageCode } from "iso-639-1";

export type ViewName = RegisteredViewName;

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}
export interface BlogPost {
  slug: string;
  title: string;
  desc: string;
  banner: string;
  markdown?: string;
  lang?: string;
  ts: number;
}
export interface OpenGraph {
  site_name: string;
  title?: string;
  image: string;
  url: string;
}
export interface ArticleMeta {
  publisher: string;
  publishedAt: string;
  modifiedAt: string;
}
export interface ViewMeta {
  title: string;
  lang?: string;
  description?: string;
  open_graph?: OpenGraph;
  article?: ArticleMeta;
  chat?: string;
  locale?: string;
}
export interface ViewData {
  name?: ViewName;
  meta: ViewMeta;
  props: any;
}
export interface ManifestItem {
  file: string;
  name: string;
  src?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
}

export interface Manifest {
  [key: string]: ManifestItem;
}

export interface SocialMedia {
  title: string;
  url: string;
  hashtags?: string[];
  images?: string[];
}

declare module "hono" {
  interface Context {
    view(name: ViewName, data: ViewData): Response | Promise<Response>;
    locale: I18nInstance;
  }
}

declare module "@hono/react-renderer" {
  interface Props {
    view: ViewData;
    manifest?: Manifest;
  }
}

declare global {
  interface Window {
    _hono_view: ViewData;
  }
}
