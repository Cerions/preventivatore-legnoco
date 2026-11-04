import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // L'anteprima 3D (three.js) è un file a parte da circa 560 kB, caricato dopo la pagina:
    // alziamo la soglia dell'avviso per non segnalarlo a ogni build.
    chunkSizeWarningLimit: 600,
  },
})
