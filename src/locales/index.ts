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

export default i18n