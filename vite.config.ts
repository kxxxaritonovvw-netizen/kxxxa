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
    // Только минификатор. Не путать с css.transformer: тот прогоняет CSS
    // через полный конвейер Lightning CSS с явными targets и в наших сборках
    // ломает @layer — эмулирует его через пустой :is(), который не матчит
    // вообще ничего. Итог: весь @layer base пропадал молча (в том числе
    // это же и объясняло нецентрированный #root — правило было в бандле,
    // но не применялось). Один только cssMinify такого не делает и заодно
    // чинит исходный баг esbuild, который выбрасывал второй блок @layer base.
    cssMinify: 'lightningcss',
  },
})
