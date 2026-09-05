export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export type PlaybackSource = {
  play(): Promise<void> | void
  pause(): void
  seek(seconds: number): void
  position(): { time: number; duration: number }
  /** Воспринимаемый уровень 0..1 — на элемент ложится по кривой из volume.ts. */
  setVolume(level: number): void
  setMuted(muted: boolean): void
  subscribe(listener: (state: PlaybackState) => void): () => void
  destroy(): void
}
