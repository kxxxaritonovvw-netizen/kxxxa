/**
 * Сборка одностраничного билда для публикации в артефакт.
 *
 * Артефакт запрещает любые внешние загрузки: скрипты, стили, картинки,
 * media, fetch. Поэтому CSS и JS инлайнятся в страницу, а трек — если он
 * есть — зашивается в JS как data: URI. Лимит страницы 16 МБ, base64
 * раздувает файл примерно на треть, так что mp3 крупнее ~10 МБ не влезет.
 *
 * Использование: node scripts/build-artifact.mjs [путь-до-mp3]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const MP3 = process.argv[2] ?? 'public/tracks/track.mp3'
const hasTrack = existsSync(MP3)
const source = hasTrack ? 'audio' : 'synth'
const OUT = 'dist-artifact'

console.log(hasTrack ? `Трек найден: ${MP3}` : 'Трека нет — собираю с Web Audio заглушкой')

execFileSync('npx', ['vite', 'build', '--outDir', OUT], {
  stdio: 'inherit',
  env: { ...process.env, VITE_SOURCE: source },
})

const assets = join(OUT, 'assets')
const pick = (ext) => join(assets, readdirSync(assets).find((f) => f.endsWith(ext)))
const css = readFileSync(pick('.css'), 'utf8')
let js = readFileSync(pick('.js'), 'utf8')

if (hasTrack) {
  const mb = statSync(MP3).size / 1024 / 1024
  const dataUri = `data:audio/mpeg;base64,${readFileSync(MP3).toString('base64')}`
  const before = js.length
  js = js.replaceAll('/tracks/track.mp3', dataUri)
  if (js.length === before) throw new Error('Не нашёл путь к треку в бандле — проверь track.ts')
  console.log(`Трек вшит: ${mb.toFixed(1)} МБ → ${(dataUri.length / 1024 / 1024).toFixed(1)} МБ base64`)
}

/* Обёртка артефакта ставит свой reset ВНЕ каскадных слоёв: color-scheme: light,
   светлый фон, 14px на body. Неслоёный CSS бьёт слоёный независимо от
   специфичности, поэтому наш @layer base там проигрывает. Пере-объявляем
   критичное тоже вне слоёв. */
const override = `
html { color-scheme: dark; }
html, body, #root { height: 100%; margin: 0; overflow: hidden; }
body {
  background: #0b0b0f;
  color: rgb(255 255 255 / 0.95);
  font-size: 15px;
  line-height: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}`

const html = `<title>Тёмный плеер</title>
<style>
${css}
${override}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`

const dest = process.env.ARTIFACT_OUT ?? join(OUT, 'artifact.html')
writeFileSync(dest, html)
console.log(`Готово: ${dest} — ${(html.length / 1024 / 1024).toFixed(2)} МБ`)
