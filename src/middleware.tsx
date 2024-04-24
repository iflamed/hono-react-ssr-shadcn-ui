import { createMiddleware } from "hono/factory";
import { ViewData } from "./global";
import { getViewByName } from "./renderer";
import manifest from './lib/manifest.json'

export const ViewRenderer = createMiddleware(async (c, next) => {
    c.view = (name: string, view: ViewData) => {
        const Comp = getViewByName(name)
        view.name = name
        view.meta.manifest = manifest
        return c.render(<Comp {...view.props} />, { view, manifest })
    }
    await next()
})