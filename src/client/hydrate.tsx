import { hydrateRoot } from "react-dom/client";
import ClientShell from "@/shared/client-shell";
import { isViewName, loadView } from "@/view";
import type { ViewData } from "@/global";

const hydratePage = async () => {
  const view: ViewData = window._hono_view;
  if (!isViewName(view.name)) {
    throw new Error(`Unknown view: ${view.name || "(missing)"}`);
  }

  const container = document.getElementById("app");
  if (!container) {
    throw new Error("Cannot hydrate without the #app container");
  }

  const Page = await loadView(view.name);
  hydrateRoot(
    container,
    <ClientShell view={view}>
      <Page {...view.props} />
    </ClientShell>,
  );
};

void hydratePage().catch((error: unknown) => {
  console.error("Failed to hydrate the current page", error);
});
