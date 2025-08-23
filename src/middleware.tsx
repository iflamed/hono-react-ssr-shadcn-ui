import { createMiddleware } from "hono/factory"
import { languageDetector } from 'hono/language'
import { ViewData } from "./global"
import { getViewByName } from "./renderer"
import manifest from './lib/manifest.json'
import i18n, { languages } from "./locales"

export const ViewRenderer = createMiddleware(async (c, next) => {
    c.view = (name: string, view: ViewData) => {
        const Comp = getViewByName(name)
        view.name = name
        view.meta.manifest = manifest
        view.meta.locale = c.get('language') || 'en'
        return c.render(<Comp {...view.props} />, { view, manifest })
    }
    await next()
})

export const Translatori18n = createMiddleware(async (c, next) => {
    c.locale = i18n.cloneInstance()
    c.locale.changeLanguage(c.get('language') || 'en')
    await next()
})

export const LanguageDetector = languageDetector({
    order: ['querystring', 'path', 'cookie', 'header'],
    lookupFromPathIndex: 0, // /en/profile → index 0 = 'en'
    convertDetectedLanguage: (lang) => lang.split('-')[0],
    supportedLanguages: languages, // Must include fallback
    fallbackLanguage: 'en', // Required
})
