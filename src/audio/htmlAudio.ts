import type { PlaybackSource, PlaybackState } from './types'

/**
 * Один HTMLAudioElement на всё приложение, живёт вне React.
 *
 * Пересоздание элемента рвёт «цепочку доверия» автоплея в iOS Safari:
 * разрешение выдаётся конкретному элементу после жеста и не наследуется
 * новым элементом.
 */
export function createHtmlAudioSource(src: string): PlaybackSource {
  const el = new Audio()
  el.preload = 'metadata'
  el.src = src

  const listeners = new Set<(s: PlaybackState) => void>()
  const emit = (s: PlaybackState) => listeners.forEach((l) => l(s))

  el.addEventListener('loadstart', () => emit('loading'))
  el.addEventListener('playing', () => emit('playing'))
  el.addEventListener('pause', () => emit('paused'))
  el.addEventListener('ended', () => emit('ended'))
  el.addEventListener('error', () => emit('error'))

  return {
    // play() реджектится, если жест не засчитан — молча глотать нельзя,
    // иначе кнопка «не работает» без объяснений.
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
