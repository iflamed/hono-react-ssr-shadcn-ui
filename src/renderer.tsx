import { reactRenderer } from '@hono/react-renderer'
import { hydrateRoot } from 'react-dom/client'
import App from './view/App'
import { ViewData } from './global'

const views:Map<string, React.FC<any>> = new Map()

export default function Empty() {
  return <></>
}

export function getViewByName(name: string):React.FC<any> {
    const cmp = views.get(name)
    if (cmp === undefined) {
      return Empty
    } else {
      return cmp
    }
}

export function storeViewByName(name: string, item: React.FC<any>):void {
    views.set(name, item)
}

export const Renderer = reactRenderer(App, {
  docType: true
})

export const viewRenderer = (name:string, view: ViewData) => {
  const Comp = getViewByName(name)
  hydrateRoot(document, <App view={view} manifest={view.meta.manifest}>
    <Comp {...view.props} />
  </App>);
}
