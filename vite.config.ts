import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Plugin to handle server-only modules in browser builds
// Only playwright needs stubbing - AI SDKs are handled via esm.sh importmap
function serverOnlyModulesPlugin(): Plugin {
  return {
    name: 'server-only-modules',
    enforce: 'pre',
    resolveId(source) {
      // Playwright is truly server-only (used in ScreenshotCapture)
      if (source === 'playwright') {
        return `\0server-only:playwright`;
      }
      return null;
    },
    load(id) {
      if (id === '\0server-only:playwright') {
        return `
          export const chromium = {
            launch: () => { throw new Error('Playwright is server-only. Use Edge Functions for screenshots.'); }
          };
          export default { chromium };
        `;
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        serverOnlyModulesPlugin(),
        react(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Strip console.log and debugger from production builds
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
      build: {
        sourcemap: true,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
            help: resolve(__dirname, 'help.html'),
          },
        },
      },
    };
});
// Cache bust: 1768050306
