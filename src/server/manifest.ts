import type { Manifest, ViewName } from "@/global";
import { viewDefinitions } from "@/view-loaders";

const CLIENT_ENTRY_MODULE_ID = "src/client.tsx";

export type PageAssets = {
  entryScript?: string;
  modulePreloads: string[];
  stylesheets: string[];
};

const toPublicPath = (file: string) => `/${file}`;

export const resolvePageAssets = (
  manifest: Manifest,
  viewName: ViewName,
): PageAssets => {
  const entry = manifest[CLIENT_ENTRY_MODULE_ID];
  if (!entry) {
    return { modulePreloads: [], stylesheets: [] };
  }

  const modulePreloads = new Set<string>();
  const stylesheets = new Set<string>();
  const visited = new Set<string>();

  const visit = (moduleId: string, shouldPreloadFile: boolean) => {
    if (visited.has(moduleId)) return;
    visited.add(moduleId);

    const chunk = manifest[moduleId];
    if (!chunk) return;

    if (shouldPreloadFile && chunk.file) {
      modulePreloads.add(toPublicPath(chunk.file));
    }
    chunk.css?.forEach((file) => stylesheets.add(toPublicPath(file)));
    chunk.imports?.forEach((dependencyId) => visit(dependencyId, true));
  };

  visit(CLIENT_ENTRY_MODULE_ID, false);
  visit(viewDefinitions[viewName].moduleId, true);

  return {
    entryScript: entry.file ? toPublicPath(entry.file) : undefined,
    modulePreloads: [...modulePreloads],
    stylesheets: [...stylesheets],
  };
};
