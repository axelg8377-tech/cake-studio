/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relativo: GitHub Pages sirve el sitio en /<repo>/ y así no hay que saber el nombre del repo.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // La app se actualiza sola al abrirla: ella no tiene que saber qué es un service worker.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'iconos/apple-touch-icon.png', 'fuentes/*.woff2'],
      manifest: {
        name: 'Pastelería',
        short_name: 'Pastelería',
        description: 'Costos de tortas, precios y flyers para clientes',
        lang: 'es',
        theme_color: '#F5EDE0',
        background_color: '#F5EDE0',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Sin esto la fuente del flyer no queda guardada y el flyer sale sin tipografía en modo avión.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    // Renderizar el flyer con sharp y decodificar el QR con jsqr tarda más que el default de 5 s.
    testTimeout: 30_000,
  },
})
