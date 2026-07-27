import { cloudflare } from "@cloudflare/vite-plugin";
import preserveDirectives from "rollup-preserve-directives";
import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";
import type { ViteBuilder } from "vite";

const CLIENT_MANIFEST_PATH = "dist/client/.vite/manifest.json";
const SERVER_MANIFEST_PATH = "src/lib/manifest.json";

const buildClientThenWorker = async (builder: ViteBuilder) => {
  const clientEnvironment = builder.environments.client;
  const workerEnvironment = builder.environments.ssr;

  if (!clientEnvironment || !workerEnvironment) {
    throw new Error("Cloudflare client and SSR build environments are required");
  }

  await rm(path.resolve(__dirname, "dist"), {
    recursive: true,
    force: true,
  });
  await builder.build(clientEnvironment);
  await copyFile(
    path.resolve(__dirname, CLIENT_MANIFEST_PATH),
    path.resolve(__dirname, SERVER_MANIFEST_PATH),
  );
  await builder.build(workerEnvironment);
};

export default defineConfig({
  plugins: [
    preserveDirectives(),
    cloudflare({
      viteEnvironment: { name: "ssr" },
    }),
  ],
  builder: {
    buildApp: buildClientThenWorker,
  },
  environments: {
    client: {
      build: {
        outDir: "dist/client",
        manifest: true,
        assetsDir: "static",
        rolldownOptions: {
          input: "./src/client.tsx",
          output: {
            codeSplitting: {
              groups: [
                {
                  name: "react-runtime",
                  test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler|sonner|next-themes)[\\/]/,
                  includeDependenciesRecursively: false,
                  priority: 30,
                },
              ],
            },
            entryFileNames: "static/client-[hash].js",
            chunkFileNames: "static/chunks/[name]-[hash].js",
            assetFileNames: "static/assets/[name]-[hash][extname]",
          },
        },
      },
    },
    ssr: {
      build: {
        outDir: "dist/ssr",
        minify: true,
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  name: "shared-runtime",
                  test: /[\\/]src[\\/]lib[\\/](?:i18n|utils)\.tsx?$/,
                  priority: 10,
                },
                {
                  name: "sonner",
                  test: /[\\/]node_modules[\\/]sonner[\\/]/,
                  priority: 10,
                },
                {
                  name: "react-runtime",
                  test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
                  priority: 20,
                },
              ],
            },
            entryFileNames: "index.js",
            chunkFileNames: "chunks/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash][extname]",
          },
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
