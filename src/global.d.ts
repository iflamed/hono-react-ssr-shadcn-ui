import {} from 'hono'
import { i18n } from 'i18next'
import { LanguageCode } from 'iso-639-1';

interface Language {
    code: LanguageCode;
    name: string;
    nativeName: string;
}
interface BlogPost {
  slug: string
  title: string
  desc: string
  banner: string
  markdown?: string
  lang?: string
  ts: number
}
interface OpenGraph {
  site_name: string
  title?: string
  image: string
  url: string
}
interface ArticleMeta {
  publisher: string
  publishedAt: string
  modifiedAt: string
}
interface ViewMeta {
  title: string
  lang?: string
  description?: string
  open_graph?: OpenGraph
  article?: ArticleMeta
  chat?: string
  manifest?: Manifest
  locale?: string
}
interface ViewData {
  name?: string,
  meta: ViewMeta,
  props: any,
}
interface ManifestItem {
  file: string
  name: string
  src?: string
  isEntry?: boolean
  imports?: string[]
  css?: string[]
}

interface Manifest {
  [key: string]: ManifestItem
}

interface SocialMedia {
  title: string
  url: string
  hashtags?: string[]
  images?: string[]
}

declare module 'hono' {
  interface Context {
    view(name:string, data: ViewData): Response | Promise<Response>
    locale: i18n
  }
}

declare module '@hono/react-renderer' {
  interface Props {
    view: ViewData,
    manifest?: Manifest,
  }
}

declare global {
  interface Window {
      _hono_view: ViewData;
  }
}
