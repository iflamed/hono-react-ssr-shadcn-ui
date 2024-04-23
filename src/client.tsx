import 'vite/modulepreload-polyfill'
import initView from './view'
import { viewRenderer } from './renderer'
import './app.css'
import { ViewData } from './global'

const view:ViewData = window._hono_view
initView()
viewRenderer(view.name || '', view)
