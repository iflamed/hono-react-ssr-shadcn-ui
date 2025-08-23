import i18n from "@/locales"
import isProd from "../config/is_prod"
import { Manifest, ManifestItem, ViewData } from "../global"
import { Toaster } from "@/components/ui/sonner"
import { I18nextProvider } from "react-i18next"
import { StrictMode } from "react"

type LayoutProps = {
    children: React.ReactNode,
    view: ViewData,
    manifest?: Manifest,
}

export default function App({ children, view, manifest }: LayoutProps) {
    const viewScript = 'var _hono_view = '  + JSON.stringify(view) + ';'
    let cssDoms:React.ReactNode[] = []
    let scriptDoms:React.ReactNode[] = []
    if (isProd && manifest) {
        const cssFiles:string[] = []
        const scriptFiles:string[] = []
        for (const [, v] of Object.entries(manifest)) {
            const item:ManifestItem = v
            if (item.isEntry) {
                item.css?.forEach((c) => {
                    cssFiles.push('/' + c)
                })
                if (item.file) {
                    scriptFiles.push('/' + item.file)
                }
            }
        }
        cssDoms = cssFiles.map(l => {
            return <link href={l}  rel="stylesheet" key={l} />
        })
        scriptDoms = scriptFiles.map(s => {
            return <script type="module" src={s} key={s}></script>
        })
    }
    let domain = ''
    if (view.meta.open_graph) {
        const url = new URL(view.meta.open_graph.url)
        domain = url.host
    }
    const locale = i18n.cloneInstance()
    locale.changeLanguage(view.meta.locale || 'en')
    if (!view.meta.lang && view.meta.locale) {
        view.meta.lang = view.meta.locale
    }
    return (
        <StrictMode>
            <I18nextProvider i18n={locale} defaultNS={'translation'}>
                <html lang={view.meta.lang || 'en'}>
                    <head>
                        <meta charSet="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>{view.meta.title}</title>
                        <meta name="description" content={view.meta.description || view.meta.title} />
                        <meta property="og:title" content={view.meta.open_graph && view.meta.open_graph.title ? view.meta.open_graph.title : view.meta.title} />
                        <meta property="og:description" content={view.meta.description || view.meta.title} />
                        <meta property="og:type" content="website" />
                        {view.meta.open_graph && <><meta property="og:site_name" content={view.meta.open_graph?.site_name} />
                        <meta property="og:url" content={view.meta.open_graph?.url} />
                        <meta property="og:image" content={view.meta.open_graph?.image} /></>}
                        <meta name="twitter:card" content="summary_large_image" />
                        <meta name="twitter:title" content={view.meta.open_graph && view.meta.open_graph.title ? view.meta.open_graph.title : view.meta.title} />
                        <meta name="twitter:description" content={view.meta.description || view.meta.title} />
                        {view.meta.open_graph && <><meta property="twitter:domain" content={domain} />
                        <meta property="twitter:url" content={view.meta.open_graph?.url} />
                        <meta name="twitter:image" content={view.meta.open_graph?.image} /></>}
                        {view.meta.article && <><meta property="article:publisher" content={view.meta.article.publisher} />
                        <meta property="article:published_time" content={view.meta.article.publishedAt} />
                        <meta property="article:modified_time" content={view.meta.article.modifiedAt} /></>}
                        {cssDoms}
                        <script dangerouslySetInnerHTML={{__html: viewScript}} />
                        {!isProd &&<script type="module" src="http://localhost:5174/src/client.tsx"></script>}
                    </head>
                    <body>
                        {children}
                        <Toaster richColors />
                        {scriptDoms}
                    </body>
                </html>
            </I18nextProvider>
        </StrictMode>
    )
}