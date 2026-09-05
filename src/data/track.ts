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
}

// Переключается на сборке: VITE_SOURCE=synth npm run build.
// Нужно для артефакта/песочниц с CSP, где скрипт YouTube не загружается.
const SOURCE = (import.meta.env.VITE_SOURCE as Track['source']) || 'youtube'

export const TRACK: Track = {
  id: 'bOupGVM9Uvc',
  source: SOURCE,
  ref: 'bOupGVM9Uvc',
  // Заглушки: настоящие название и исполнитель подтягиваются из oEmbed,
  // чтобы не хардкодить метаданные чужого видео.
  title: 'Загрузка…',
  artist: '',
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
