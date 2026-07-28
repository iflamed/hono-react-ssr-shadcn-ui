import isProd from "@/config/is_prod";
import ClientShell from "@/shared/client-shell";
import { resolvePageAssets } from "./manifest";
import { serializeInlineJson } from "./serialize";
import type { Manifest, ViewData } from "@/global";

type DocumentProps = {
  children: React.ReactNode;
  view: ViewData;
  manifest?: Manifest;
};

const getOpenGraphDomain = (view: ViewData): string => {
  const openGraphUrl = view.meta.open_graph?.url;
  if (!openGraphUrl) return "";

  try {
    return new URL(openGraphUrl).host;
  } catch {
    return "";
  }
};

export default function Document({ children, view, manifest }: DocumentProps) {
  if (!view.name) {
    throw new Error("Cannot render a document without a view name");
  }

  const hydrationScript = `window._hono_view=${serializeInlineJson(view)};`;
  const assets =
    isProd && manifest
      ? resolvePageAssets(manifest, view.name)
      : { modulePreloads: [], stylesheets: [], entryScript: undefined };
  const domain = getOpenGraphDomain(view);
  const language = view.meta.lang || view.meta.locale || "en";

  return (
    <html lang={language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{view.meta.title}</title>
        <meta
          name="description"
          content={view.meta.description || view.meta.title}
        />
        <meta
          property="og:title"
          content={view.meta.open_graph?.title || view.meta.title}
        />
        <meta
          property="og:description"
          content={view.meta.description || view.meta.title}
        />
        <meta property="og:type" content="website" />
        {view.meta.open_graph && (
          <>
            <meta
              property="og:site_name"
              content={view.meta.open_graph.site_name}
            />
            <meta property="og:url" content={view.meta.open_graph.url} />
            <meta property="og:image" content={view.meta.open_graph.image} />
          </>
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={view.meta.open_graph?.title || view.meta.title}
        />
        <meta
          name="twitter:description"
          content={view.meta.description || view.meta.title}
        />
        {view.meta.open_graph && (
          <>
            <meta property="twitter:domain" content={domain} />
            <meta property="twitter:url" content={view.meta.open_graph.url} />
            <meta name="twitter:image" content={view.meta.open_graph.image} />
          </>
        )}
        {view.meta.article && (
          <>
            <meta
              property="article:publisher"
              content={view.meta.article.publisher}
            />
            <meta
              property="article:published_time"
              content={view.meta.article.publishedAt}
            />
            <meta
              property="article:modified_time"
              content={view.meta.article.modifiedAt}
            />
          </>
        )}
        {assets.stylesheets.map((href) => (
          <link href={href} rel="stylesheet" key={href} />
        ))}
        {assets.modulePreloads.map((href) => (
          <link href={href} rel="modulepreload" key={href} />
        ))}
        <script dangerouslySetInnerHTML={{ __html: hydrationScript }} />
      </head>
      <body>
        <div id="app">
          <ClientShell view={view}>{children}</ClientShell>
        </div>
        {!isProd && (
          <script type="module" src="/src/client.tsx" />
        )}
        {assets.entryScript && (
          <script type="module" src={assets.entryScript} />
        )}
      </body>
    </html>
  );
}
