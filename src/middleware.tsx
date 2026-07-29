import { createMiddleware } from "hono/factory";
import { languageDetector } from "hono/language";
import type { ViewData, ViewName } from "./global";
import { loadView } from "./view";
import manifest from "./lib/manifest.json";
import { languages } from "./locales";
import { createI18n } from "./lib/i18n";
import files from "./locales/files";

export const ViewRenderer = createMiddleware(async (c, next) => {
  c.view = async (name: ViewName, view: ViewData) => {
    const Page = await loadView(name);
    const hydrationView: ViewData = {
      ...view,
      name,
      meta: {
        ...view.meta,
        locale: c.get("language") || "en",
      },
    };
    return c.render(<Page {...hydrationView.props} />, {
      view: hydrationView,
      manifest,
    });
  };
  await next();
});

export const Translatori18n = createMiddleware(async (c, next) => {
  c.locale = createI18n({
    lang: c.get("language") || "en",
    resources: files,
    fallbackLang: "en",
    defaultNS: "translation",
  });
  await next();
});

export const LanguageDetector = languageDetector({
  order: ["querystring", "path", "cookie", "header"],
  lookupFromPathIndex: 0, // /en/profile → index 0 = 'en'
  convertDetectedLanguage: (lang) => lang.split("-")[0],
  supportedLanguages: languages, // Must include fallback
  fallbackLanguage: "en", // Required
});
