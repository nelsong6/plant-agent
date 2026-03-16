import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Copy sql.js WASM file to public/ so it's served as a static asset.
// sql.js needs this file at runtime to initialize the SQLite engine.
function copySqlJsWasm() {
  return {
    name: 'copy-sql-js-wasm',
    buildStart() {
      const src = resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
      const dest = resolve(__dirname, 'public/sql-wasm.wasm');
      if (existsSync(src)) {
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), react(), copySqlJsWasm()],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
