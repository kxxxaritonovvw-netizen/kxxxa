import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Прототип смотрим с телефона в той же сети: npm run dev -- --host
  server: { host: true },
  build: {
    // Safari 16.4 — нижняя граница поддержки (dvh, :has, backdrop-filter без багов)
    target: ['safari16', 'chrome110', 'firefox115'],
    // Не esbuild: его CSS-минификатор выбрасывает второй блок @layer base,
    // и весь наш reset исчезает из прода, оставаясь в dev. Lightning CSS
    // сливает одноимённые слои корректно и заодно ставит вендорные префиксы.
    cssMinify: 'lightningcss',
  },
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: { safari: (16 << 16) | (4 << 8), chrome: 110 << 16, firefox: 115 << 16 },
    },
  },
})
