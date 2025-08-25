import i18n from "i18next"
import { initReactI18next } from 'react-i18next'
import files from "./files"

i18n
    .use(initReactI18next)
    .init({
        resources: files,
        fallbackLng: "en",

        interpolation: {
            // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
            escapeValue: false
        }
    }
)

export const languages = Object.keys(files)

export function getPath(req: Request) {
  const url = new URL(req.url)
  let pathname = url.pathname
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0) {
    for (let idx = 0; idx < languages.length; idx++) {
      if (segments[0] == languages[idx]) {
        segments.shift()
        pathname = '/' + segments.join('/')
        break
      }
    }
  }
  return pathname
}

export default i18n