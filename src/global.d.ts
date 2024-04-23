import {} from 'hono'

interface ViewMeta {
  title: string,
  manifest?: Manifest,
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
