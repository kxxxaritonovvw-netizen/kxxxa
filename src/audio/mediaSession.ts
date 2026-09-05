import type { PlaybackSource } from './types'

/**
 * Кнопки на локскрине, в шторке и на наушниках.
 *
 * Работает только поверх настоящего HTMLAudioElement: у встроенного
 * YouTube сессией владеет их iframe, и перехватить её нельзя.
 * Отсюда и вся возня с собственным движком вместо готового плеера.
 */
export function bindMediaSession(
  source: PlaybackSource,
  meta: { title: string; artist: string },
): () => void {
  const ms = navigator.mediaSession
  if (!ms) return () => {}

  ms.metadata = new MediaMetadata({ title: meta.title, artist: meta.artist })

  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => source.play()],
    ['pause', () => source.pause()],
    // Перемотка на ±15 c: без неё система рисует кнопки треков,
    // которых у нас пока нет, и они выглядят сломанными.
    ['seekbackward', () => source.seek(Math.max(0, source.position().time - 15))],
    ['seekforward', () => source.seek(source.position().time + 15)],
    ['seekto', (d) => d.seekTime != null && source.seek(d.seekTime)],
  ]

  for (const [action, fn] of handlers) {
    // Не каждый браузер знает каждое действие — неизвестное бросает TypeError.
    try {
      ms.setActionHandler(action, fn)
    } catch {
      /* действие не поддержано — пропускаем */
    }
  }

  return () => {
    for (const [action] of handlers) {
      try {
        ms.setActionHandler(action, null)
      } catch {
        /* пусто */
      }
    }
    ms.metadata = null
  }
}
