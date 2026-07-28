import * as dotenv from "dotenv";
import build from "@hono/vite-build/node";
import devServer from "@hono/vite-dev-server";
import preserveDirectives from "rollup-preserve-directives";
import path from "node:path";
import { defineConfig } from "vite";

dotenv.config({
  path: `.env.${process.env.SERVER_MODE || "local"}`,
  quiet: true,
});

const alias = {
  "@": path.resolve(__dirname, "./src"),
};

const serverExternals = [
  "dotenv",
  "drizzle-orm",
  "drizzle-orm/mysql-core",
  "drizzle-orm/mysql2",
  "mysql2",
  "mysql2/promise",
  "react",
  "react-dom",
];

export default defineConfig(({ mode }) => {
  if (mode === "client") {
    return {
      plugins: [preserveDirectives()],
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
      resolve: { alias },
    };
  }

  const appPort = Number.parseInt(process.env.APP_PORT || "3000", 10);

  return {
    plugins: [
      preserveDirectives(),
      build({
        entry: "./src/index.tsx",
        output: "index.js",
        outputDir: "./dist/server",
        emptyOutDir: true,
        external: serverExternals,
        port: appPort,
      }),
      devServer({
        entry: "src/index.tsx",
      }),
    ],
    build: {
      copyPublicDir: false,
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
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
    resolve: { alias },
    ssr: {
      external: serverExternals,
    },
  };
});
