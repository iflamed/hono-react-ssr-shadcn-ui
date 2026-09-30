// i18n.ts
import React, { createContext, useCallback, useContext, useMemo, useState } from "react"

export type I18nResources = Record<string, any>

export interface I18nInstance {
  lang: string
  ns: string
  defaultNS: string
  /**
   * t translate function
   * @param key support ns:key and key (a.b.c)
   * @param vars parameters { name: 'Tom' }
   */
  t: (key: string, vars?: Record<string, any>) => string
  /**
   * change language will return a new instance
   */
  changeLanguage: (lang: string) => I18nInstance
  /**
   * switch namespace
   */
  changeNS: (ns: string) => void
}

export interface CreateI18nOptions {
  lang: string
  resources: I18nResources
  fallbackLang?: string
  defaultNS?: string
}

export function createI18n({
  lang,
  resources,
  fallbackLang = "en",
  defaultNS = "translation"
}: CreateI18nOptions):I18nInstance {

  let currentNS = defaultNS

  function getValue(obj: any, path: string) {
    return path.split(".").reduce((acc, key) => acc?.[key], obj)
  }

  function resolveKey(input: string) {
    if (input.includes(":")) {
      const [ns, rest] = input.split(":")
      return { ns, keyPath: rest }
    }
    return { ns: currentNS, keyPath: input }
  }

  function resolveLanguages(): string[] {
    if (lang === fallbackLang) return [lang]
    return [lang, fallbackLang]
  }

  function resolveNamespaces(ns: string): string[] {
    // use defaultNS as fallback
    if (ns === defaultNS) return [ns]
    return [ns, defaultNS]
  }

  function t(input: string, vars?: Record<string, any>): string {
    const { ns, keyPath } = resolveKey(input)

    const languages = resolveLanguages()
    const namespaces = resolveNamespaces(ns)

    let text: any = undefined

    for (const lng of languages) {
      for (const namespace of namespaces) {
        text = getValue(resources?.[lng]?.[namespace], keyPath)
        if (text !== undefined) break
      }
      if (text !== undefined) break
    }

    if (text === undefined) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[i18n missing] ${lang}:${ns}.${keyPath}`)
      }
      return input
    }

    // replace parameters
    if (vars && typeof text === "string") {
      Object.keys(vars).forEach(k => {
        text = text.replace(new RegExp(`{{${k}}}`, "g"), vars[k])
      })
    }

    return text
  }

  function changeLanguage(newLang: string) {
    return createI18n({
      lang: newLang,
      resources,
      fallbackLang,
      defaultNS: currentNS // keep current NS
    })
  }

  function changeNS(ns: string) {
    currentNS = ns
  }

  return {
    lang,
    t,
    changeLanguage,
    changeNS,
    get ns() {
      return currentNS
    },
    defaultNS
  }
}

export const I18nContext = createContext<any>(null)

export function I18nextProvider({
  i18n,
  defaultNS,
  children
}: {
  i18n: I18nInstance
  defaultNS: string
  children: React.ReactNode
}) {

  const [instance, setInstance] = useState(i18n)

  const value = useMemo(() => ({
    ...instance,
    defaultNS: defaultNS || instance.defaultNS,

    setLanguage: (lang: string) => {
      const next = instance.changeLanguage(lang)
      setInstance(next)
    },

    setNamespace: (ns: string) => {
      instance.changeNS(ns)
      // update instance
      setInstance({ ...instance })
    }

  }), [instance, defaultNS])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation(ns?: string) {
  const ctx = useContext(I18nContext)

  if (!ctx) {
    throw new Error("Missing I18nextProvider")
  }

  const namespace = ns || ctx.ns || ctx.defaultNS

  // t 必须引用稳定：页面普遍以 t 作为 useCallback/useEffect 依赖，
  // 若每次渲染返回新函数会导致数据加载 effect 无限循环
  const t = useCallback(
    (key: string, vars?: Record<string, any>) => {
      if (!key.includes(":")) {
        return ctx.t(`${namespace}:${key}`, vars)
      }
      return ctx.t(key, vars)
    },
    [ctx, namespace],
  )

  return {
    t,
    lang: ctx.lang,
    i18n: ctx
  }
}
