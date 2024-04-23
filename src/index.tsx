import { Hono } from 'hono'
import { getViewByName, renderer } from './renderer'
import initView from './view'
import { ViewData } from './global'
import manifest from './lib/manifest.json'

initView()
const app = new Hono()

app.use(renderer)
app.use(async (c, next) => {
  c.view = (name: string, view: ViewData) => {
      const Comp = getViewByName(name)
      view.name = name
      view.meta.manifest = manifest
      return c.render(<Comp {...view.props} />, { view, manifest })
  }
  await next()
})

app.get('/', (c) => {
  return c.view('hello', {
    meta: {
      title: 'Honojs demo with react SSR and shadcn UI.',
    },
    props: {
      tp: 'index'
    }
  })
})

export default app
