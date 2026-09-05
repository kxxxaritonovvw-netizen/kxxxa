/**
 * Единый контракт источника звука.
 *
 * Плеер не знает, что играет: локальный mp3 или встроенный YouTube.
 * Всё, что выше этого интерфейса (стор, UI, жесты), пишется один раз.
 */
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export type PlaybackSource = {
  play(): Promise<void> | void
  pause(): void
  seek(seconds: number): void
  /** Текущая позиция и длительность в секундах. Опрашивается по rAF, не пушится. */
  position(): { time: number; duration: number }
  subscribe(listener: (state: PlaybackState) => void): () => void
  destroy(): void
}
