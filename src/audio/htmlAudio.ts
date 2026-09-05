import type { PlaybackSource, PlaybackState } from './types'

/**
 * Основной движок: один HTMLAudioElement на всё приложение.
 *
 * Элемент создаётся вне React и живёт всё время работы страницы.
 * Пересоздание рвёт «цепочку доверия» автоплея в iOS Safari: разрешение
 * выдаётся конкретному элементу после жеста, а новый элемент его не наследует.
 */
export function createHtmlAudioSource(src: string): PlaybackSource {
  const el = new Audio()
  el.preload = 'metadata'
  el.crossOrigin = 'anonymous'
  el.src = src

  const listeners = new Set<(s: PlaybackState) => void>()
  const emit = (s: PlaybackState) => listeners.forEach((l) => l(s))

  el.addEventListener('loadstart', () => emit('loading'))
  el.addEventListener('playing', () => emit('playing'))
  el.addEventListener('pause', () => emit('paused'))
  el.addEventListener('ended', () => emit('ended'))
  el.addEventListener('error', () => emit('error'))

  return {
    // play() возвращает промис и реджектится, если жест не засчитан —
    // молча проглатывать нельзя, иначе кнопка «не работает» без объяснений.
    play: () => el.play().catch(() => emit('error')),
    pause: () => el.pause(),
    seek: (s) => {
      el.currentTime = s
    },
    position: () => ({
      time: el.currentTime,
      duration: Number.isFinite(el.duration) ? el.duration : 0,
    }),
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    destroy: () => {
      el.pause()
      el.removeAttribute('src')
      el.load()
      listeners.clear()
    },
  }
}
