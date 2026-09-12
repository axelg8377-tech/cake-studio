/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relativo: GitHub Pages sirve el sitio en /<repo>/ y así no hay que saber el nombre del repo.
  base: './',
  plugins: [react()],
  test: {
    // Renderizar el flyer con sharp y decodificar el QR con jsqr tarda más que el default de 5 s.
    testTimeout: 30_000,
  },
})
