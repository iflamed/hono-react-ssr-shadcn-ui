import * as dotenv from "dotenv"
import build from "@hono/vite-build/node";
import devServer from '@hono/vite-dev-server'
import preserveDirectives from 'rollup-preserve-directives'
import { defineConfig, UserConfig } from 'vite'
import path from 'path'
dotenv.config({
  path: '.env.' + process.env.SERVER_MODE
})

export default defineConfig(({ mode }):UserConfig => {
  if (mode === 'client') {
    return {
      plugins: [
        preserveDirectives(),
      ],
      build: {
        manifest: true,
        assetsDir: 'static',
        rollupOptions: {
          input: './src/client.tsx',
          output: {
            entryFileNames: 'static/client-[hash].js',
            manualChunks: (moduleId, meta) => {
              if (moduleId.includes('node_modules')) {
                return 'vendor';
              }
              return null;
            }
          },
        },
      },
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
    }
  } else {
    return {
      plugins: [
        preserveDirectives(),
        build({
          port: parseInt(process.env.APP_PORT),
        }),
        devServer({
          entry: 'src/index.tsx'
        }),
      ],
      ssr: {
        external: ['react', 'react-dom'],
      },
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
    }
  }
})
