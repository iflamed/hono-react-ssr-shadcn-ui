import { createMiddleware } from "hono/factory";
import { cache } from "hono/cache";
import { getCookie, setCookie } from "hono/cookie";
import { languageDetector } from "hono/language";
import type { ViewData, ViewName } from "./global";
import { loadView } from "./view";
import manifest from "./lib/manifest.json";
import { languages } from "./locales";
import { createI18n } from "./lib/i18n";
import files from "./locales/files";

export const createPublicPageCache = (
  maxAgeSeconds: number,
  staleIfErrorSeconds = 7 * 24 * 60 * 60,
) =>
  cache({
    cacheName: "hono-public-pages-v1",
    cacheControl: `public, max-age=${maxAgeSeconds}, stale-if-error=${staleIfErrorSeconds}`,
    vary: ["Cookie", "Accept-Language"],
  });

export const DisableCacheByDefault = createMiddleware(async (c, next) => {
  await next();

  const cacheControl = c.res.headers.get("Cache-Control");
  const isPublic = cacheControl
    ?.split(",")
    .some((directive) => directive.trim().toLowerCase() === "public");

  if (!isPublic) {
    c.header("Cache-Control", "private, no-store");
  }
});

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

const detectLanguage = languageDetector({
  order: ["querystring", "path", "cookie", "header"],
  lookupFromPathIndex: 0, // /en/profile → index 0 = 'en'
  convertDetectedLanguage: (lang) => lang.split("-")[0],
  supportedLanguages: languages, // Must include fallback
  fallbackLanguage: "en", // Required
  caches: false,
});

export const LanguageDetector = createMiddleware(async (c, next) => {
  await detectLanguage(c, async () => undefined);

  const language = c.get("language");
  if (getCookie(c, "language") !== language) {
    setCookie(c, "language", language, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
      sameSite: "Strict",
      secure: true,
    });
  }

  await next();
});
