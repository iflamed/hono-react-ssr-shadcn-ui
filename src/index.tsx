import { Hono } from 'hono'
import { renderer } from './renderer'
import initView from './view'
import { ViewRenderer } from './middleware'

initView()
const app = new Hono()

app.use(renderer)
app.use(ViewRenderer)

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
