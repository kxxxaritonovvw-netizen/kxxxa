/**
 * Сборка одностраничного билда для публикации в артефакт.
 *
 * Артефакт запрещает любые внешние загрузки: скрипты, стили, картинки,
 * media, fetch. Поэтому CSS и JS инлайнятся в страницу, а трек и обложка
 * зашиваются как data: URI. Лимит страницы 16 МБ, base64 раздувает файл
 * примерно на треть.
 *
 * Использование: node scripts/build-artifact.mjs
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const MP3 = 'public/tracks/track.mp3'
const COVER = 'public/tracks/cover.svg'
const OUT = 'dist-artifact'

execFileSync('npx', ['vite', 'build', '--outDir', OUT], { stdio: 'inherit' })

const assets = join(OUT, 'assets')
const pick = (ext) => join(assets, readdirSync(assets).find((f) => f.endsWith(ext)))
const css = readFileSync(pick('.css'), 'utf8')
let js = readFileSync(pick('.js'), 'utf8')

function embed(path, publicPath, mime) {
  const dataUri = `data:${mime};base64,${readFileSync(path).toString('base64')}`
  const before = js.length
  js = js.replaceAll(publicPath, dataUri)
  if (js.length === before) throw new Error(`Не нашёл ${publicPath} в бандле`)
  return dataUri.length
}

const mp3Bytes = embed(MP3, '/tracks/track.mp3', 'audio/mpeg')
console.log(`Трек вшит: ${(statSync(MP3).size / 1024 / 1024).toFixed(1)} МБ → ${(mp3Bytes / 1024 / 1024).toFixed(1)} МБ base64`)
embed(COVER, '/tracks/cover.svg', 'image/svg+xml')
console.log('Обложка вшита')

/* Обёртка артефакта ставит свой reset ВНЕ каскадных слоёв: color-scheme: light,
   светлый фон, 14px на body. Неслоёный CSS бьёт слоёный независимо от
   специфичности, поэтому наш @layer base там проигрывает. Пере-объявляем
   критичное тоже вне слоёв. */
const override = `
html { color-scheme: dark; }
html, body, #root { height: 100%; margin: 0; overflow: hidden; }
#root { display: flex; align-items: center; justify-content: center; }
body {
  background: #333338;
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
