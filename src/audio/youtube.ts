import type { PlaybackSource, PlaybackState } from './types'

/**
 * Адаптер YouTube IFrame API под тот же контракт, что и htmlAudio.
 *
 * Зачем адаптер, а не прямой iframe: так вся логика плеера остаётся
 * общей, и переезд на mp3 — это замена одной строки в фабрике источника.
 *
 * Что здесь НЕ работает и работать не будет:
 *  — MediaSession (кнопки на локскрине и в наушниках);
 *  — фоновое воспроизведение на мобильных: YouTube глушит звук,
 *    когда вкладка уходит в фон, это их политика, а не наш баг;
 *  — точный скраб без задержки — сиденье буферизуется на их стороне.
 * Поэтому это временный источник для прототипа, а не целевой.
 */

type YTPlayer = {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer
      PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api'
let apiPromise: Promise<void> | null = null

/** Скрипт грузим один раз на всё приложение и переиспользуем промис. */
function loadApi(): Promise<void> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) return resolve()
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const s = document.createElement('script')
    s.src = API_SRC
    s.async = true
    s.onerror = () => reject(new Error('YouTube IFrame API не загрузился'))
    document.head.appendChild(s)
  })
  return apiPromise
}

export function createYouTubeSource(videoId: string, mount: HTMLElement): PlaybackSource {
  let player: YTPlayer | null = null
  let destroyed = false
  const listeners = new Set<(s: PlaybackState) => void>()
  const emit = (s: PlaybackState) => listeners.forEach((l) => l(s))

  /** Тап случился до готовности плеера — сыграем, как только он появится. */
  let playWhenReady = false

  emit('loading')

  const ready = loadApi()
    .then(() => {
      if (destroyed) return
      player = new window.YT!.Player(mount, {
        videoId,
        playerVars: {
          // playsinline обязателен: без него iOS открывает нативный
          // полноэкранный плеер и забирает управление себе.
          playsinline: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            emit('paused')
            if (playWhenReady) player?.playVideo()
          },
          onStateChange: (e: { data: number }) => {
            const S = window.YT!.PlayerState
            if (e.data === S.PLAYING) emit('playing')
            else if (e.data === S.PAUSED) emit('paused')
            else if (e.data === S.ENDED) emit('ended')
            else if (e.data === S.BUFFERING) emit('loading')
          },
          onError: () => emit('error'),
        },
      })
    })
    .catch(() => emit('error'))

  return {
    play: () => {
      // Ветка «плеер ещё не готов» существует потому, что жест пользователя
      // приходит раньше загрузки API, и терять первый тап нельзя.
      if (player) player.playVideo()
      else {
        playWhenReady = true
        void ready
      }
    },
    pause: () => {
      playWhenReady = false
      player?.pauseVideo()
    },
    seek: (s) => player?.seekTo(s, true),
    position: () => ({
      time: player?.getCurrentTime() ?? 0,
      duration: player?.getDuration() ?? 0,
    }),
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    destroy: () => {
      destroyed = true
      player?.destroy()
      player = null
      listeners.clear()
    },
  }
}
