import * as dotenv from "dotenv"
import build from "@hono/vite-build/node";
import devServer from '@hono/vite-dev-server'
import preserveDirectives from 'rollup-preserve-directives'
import { defineConfig } from 'vite'
import path from 'path'
dotenv.config({
  path: '.env.' + process.env.SERVER_MODE
})

export default defineConfig(({ mode }) => {
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
            manualChunks: {
              vendor: [
                'react',
                'react-dom',
                '@date-fns/utc',
                '@radix-ui/react-label',
                '@radix-ui/react-select',
                '@radix-ui/react-slot',
                'axios',
                'class-variance-authority',
                'clsx',
                'lucide-react',
                'next-themes',
                'react-share',
                'remarkable',
                'sonner',
                'tailwind-merge',
              ]
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
