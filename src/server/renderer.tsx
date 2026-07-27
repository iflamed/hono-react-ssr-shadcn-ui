import { reactRenderer } from "@hono/react-renderer";
import Document from "./document";

export const Renderer = reactRenderer(Document, {
  docType: true,
});
