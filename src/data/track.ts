/**
 * Пока один трек. Когда появится медиатека — это станет tracks.json,
 * а тип переедет в data/tracks.ts без изменений в остальном коде.
 */
export type Track = {
  id: string
  /** youtube — временный источник прототипа, audio — целевой,
   *  synth — заглушка для сред, куда внешний звук не пролезает. */
  source: 'youtube' | 'audio' | 'synth'
  /** videoId для youtube, URL файла для audio. */
  ref: string
  title: string
  artist: string
  /** Путь к обложке. Нет своего изображения — используем плейсхолдер. */
  artwork?: string
}

// Переключается на сборке: VITE_SOURCE=synth npm run build.
// Нужно для артефакта/песочниц с CSP, где скрипт YouTube не загружается.
const SOURCE = (import.meta.env.VITE_SOURCE as Track['source']) || 'youtube'

export const TRACK: Track = {
  id: 'bOupGVM9Uvc',
  source: SOURCE,
  // Для youtube — videoId, для audio — путь к файлу в public/.
  ref: SOURCE === 'audio' ? '/tracks/track.mp3' : 'bOupGVM9Uvc',
  // Для youtube название приезжает из oEmbed. Для файла ID3-тегов не было,
  // поэтому подписи заданы здесь — поправь строкой ниже.
  title: SOURCE === 'audio' ? 'Базовый минимум' : 'Загрузка…',
  artist: SOURCE === 'audio' ? 'SABI, MIA BOYKA' : '',
  // Собран по описанию присланного скриншота — сам файл обложки не дошёл
  // как вложение, только как картинка в переписке. Пришли файлом — заменю.
  artwork: SOURCE === 'audio' ? '/tracks/cover.svg' : undefined,
}

type OEmbed = { title: string; author_name: string }

/**
 * Публичный oEmbed YouTube: отдаёт название и канал без ключа и без OAuth.
 * Если запрос не прошёл — просто оставляем заглушку, кнопка от этого не ломается.
 */
export async function fetchMeta(videoId: string): Promise<{ title: string; artist: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as OEmbed
    return { title: data.title, artist: data.author_name }
  } catch {
    return null
  }
}
