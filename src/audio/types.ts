export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export type PlaybackSource = {
  play(): Promise<void> | void
  pause(): void
  seek(seconds: number): void
  position(): { time: number; duration: number }
  subscribe(listener: (state: PlaybackState) => void): () => void
  destroy(): void
}
