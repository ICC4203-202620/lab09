import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El backend FastAPI (backend/app) escucha en el 8000, el puerto habitual de
// uvicorn. API_TARGET permite apuntar a otro, si ese ya está ocupado:
//   API_TARGET=http://localhost:8010 yarn dev:web
const API = process.env.API_TARGET ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Todo lo que el frontend pida bajo /api lo reenvía Vite al backend. Así el
  // navegador habla con un solo origen y nunca ve las API keys.
  server: {
    proxy: { '/api': API },
  },
  // `yarn preview` sirve la aplicación construida en otro puerto (4173), y
  // necesita su propio proxy hacia el mismo backend.
  preview: {
    proxy: { '/api': API },
  },
  build: {
    // Deja la lista de archivos generados, con sus nombres definitivos (que
    // incluyen un hash del contenido), en dist/assets-manifest.json. El
    // service worker la lee al instalarse para precachear el bundle.
    manifest: 'assets-manifest.json',
  },
})
