import { Hono } from 'hono'
import { renderer } from './renderer'
import initView from './view'
import { ViewRenderer } from './middleware'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'

initView()
type Bindings = {
  DB: D1Database
}
const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)
app.use(ViewRenderer)

app.get('/', (c) => {
  const adapter = new PrismaD1(c.env.DB)
  const prisma = new PrismaClient({ adapter })
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
