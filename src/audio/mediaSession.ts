import type { PlaybackSource } from './types'

/** Кнопки на локскрине, в шторке и на наушниках. */
export function bindMediaSession(
  source: PlaybackSource,
  meta: { title: string; artist: string; artwork?: string },
): () => void {
  const ms = navigator.mediaSession
  if (!ms) return () => {}

  ms.metadata = new MediaMetadata({
    title: meta.title,
    artist: meta.artist,
    artwork: meta.artwork ? [{ src: meta.artwork }] : undefined,
  })

  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => source.play()],
    ['pause', () => source.pause()],
    ['seekbackward', () => source.seek(Math.max(0, source.position().time - 15))],
    ['seekforward', () => source.seek(source.position().time + 15)],
    ['seekto', (d) => d.seekTime != null && source.seek(d.seekTime)],
  ]

  for (const [action, fn] of handlers) {
    try {
      ms.setActionHandler(action, fn)
    } catch {
      /* действие не поддержано браузером — пропускаем */
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
