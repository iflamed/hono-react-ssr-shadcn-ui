import {} from 'hono'

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
interface ViewMeta {
  title: string
  lang?: string
  description?: string
  open_graph?: OpenGraph
  chat?: string
  manifest?: Manifest
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
