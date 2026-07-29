export { languages } from "./supported";
import { languages } from "./supported";

const getPathLanguage = (pathname: string): string | undefined => {
  const [, pathLanguage] = pathname.split("/");
  if (!pathLanguage) return undefined;

  const normalizedLanguage = pathLanguage.toLowerCase();
  return languages.find(
    (language) => language.toLowerCase() === normalizedLanguage,
  );
};

const getLocalePrefix = (request: Request): string => {
  const language = getPathLanguage(new URL(request.url).pathname);
  return language ? `/${language}` : "";
};

export function getPath(req: Request) {
  const pathname = new URL(req.url).pathname;
  const localePrefix = getLocalePrefix(req);
  if (!localePrefix) return pathname;

  return pathname.slice(localePrefix.length) || "/";
}
