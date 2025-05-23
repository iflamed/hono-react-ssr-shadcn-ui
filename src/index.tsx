import { Hono } from 'hono'
import { renderer } from './renderer'
import initView from './view'
import { ViewRenderer } from './middleware'
import createBlogServer from './blog'

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

// todo you need change the blog server user name and password
app.route('/', createBlogServer({
  defaultOGImage: 'https://aicanvas.app/statics/uploads/1732953286728187318_blog_banner.jpg',
  blogTitle: 'Hono React Blog',
  blogDescription: 'A place to share stories about Honojs.',
  urlPrefix: 'https://hono-react-ssr-shadcn-ui.pages.dev',
  publisher: 'https://x.com/dotcopilot_ai',
}))

export default app
