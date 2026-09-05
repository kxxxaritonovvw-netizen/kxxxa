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
    // Только минификатор. НЕ добавлять css.transformer:'lightningcss' с явными
    // targets — в этой связке Lightning CSS сплющивает @layer через пустой
    // :is(), который не матчит ничего, и весь @layer base молча перестаёт
    // применяться (проверено: #root рендерился как display:block вместо
    // прописанного flex). Один только cssMinify так не делает и при этом
    // чинит исходный баг esbuild, который выбрасывал второй блок @layer base.
    cssMinify: 'lightningcss',
  },
})
