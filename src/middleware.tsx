import { createMiddleware } from "hono/factory"
import { languageDetector } from 'hono/language'
import { ViewData } from "./global"
import { getViewByName } from "./renderer"
import manifest from './lib/manifest.json'
import { languages } from "./locales"
import { createI18n } from "./lib/i18n"
import files from "./locales/files"

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
    c.locale = createI18n({
        lang: c.get('language') || 'en',
        resources: files,
        fallbackLang: 'en',
        defaultNS: 'translation',
    })
    await next()
})

export const LanguageDetector = languageDetector({
    order: ['querystring', 'path', 'cookie', 'header'],
    lookupFromPathIndex: 0, // /en/profile → index 0 = 'en'
    convertDetectedLanguage: (lang) => lang.split('-')[0],
    supportedLanguages: languages, // Must include fallback
    fallbackLanguage: 'en', // Required
})
