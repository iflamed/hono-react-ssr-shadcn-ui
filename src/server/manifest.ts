import type { Manifest, ManifestItem, ViewName } from "@/global";

const CLIENT_ENTRY_MODULE_ID = "src/client.tsx";

export type PageAssets = {
  entryScript?: string;
  modulePreloads: string[];
  stylesheets: string[];
};

const toPublicPath = (file: string) => `/${file}`;

const normalizeModuleName = (value: string): string => {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
};

const getSourceName = (chunk: ManifestItem): string => {
  const fileName = chunk.src?.split("/").at(-1) || "";
  return fileName.replace(/\.[^.]+$/, "");
};

const findViewModuleId = (
  manifest: Manifest,
  viewName: ViewName,
): string | undefined => {
  const normalizedViewName = normalizeModuleName(viewName);

  return Object.entries(manifest).find(([, chunk]) => {
    if (!chunk.isDynamicEntry) return false;

    return [chunk.name, getSourceName(chunk)].some(
      (name) => normalizeModuleName(name) === normalizedViewName,
    );
  })?.[0];
};

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

  const viewModuleId = findViewModuleId(manifest, viewName);
  if (viewModuleId) {
    visit(viewModuleId, true);
  }

  return {
    entryScript: entry.file ? toPublicPath(entry.file) : undefined,
    modulePreloads: [...modulePreloads],
    stylesheets: [...stylesheets],
  };
};
