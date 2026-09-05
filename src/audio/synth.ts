import type { PlaybackSource, PlaybackState } from './types'

/**
 * Источник-заглушка на Web Audio: простое арпеджио.
 *
 * Нужен там, где внешний звук недоступен — например, в артефакте с жёстким
 * CSP, куда не пролезает ни YouTube, ни файл с CDN. Транспорт, состояния
 * и прогресс при этом настоящие, поэтому UI тестируется полноценно.
 */
const NOTES = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63]
const STEP_MS = 320
const DURATION = 180

export function createSynthSource(): PlaybackSource {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let timer: number | null = null
  let step = 0
  let startedAt = 0
  let offset = 0

  const listeners = new Set<(s: PlaybackState) => void>()
  const emit = (s: PlaybackState) => listeners.forEach((l) => l(s))

  const note = () => {
    if (!ctx || !master) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = NOTES[step % NOTES.length]
    // Короткая атака и экспоненциальный спад — иначе на каждой ноте щелчок.
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    osc.connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + 0.6)
    step++
  }

  return {
    play: () => {
      // AudioContext создаётся строго внутри жеста: в iOS Safari контекст,
      // созданный вне тапа, стартует в состоянии suspended и молчит.
      if (!ctx) {
        ctx = new AudioContext()
        master = ctx.createGain()
        master.gain.value = 0.5
        master.connect(ctx.destination)
      }
      void ctx.resume()
      startedAt = performance.now()
      note()
      timer = window.setInterval(note, STEP_MS)
      emit('playing')
    },
    pause: () => {
      if (timer !== null) window.clearInterval(timer)
      timer = null
      offset += (performance.now() - startedAt) / 1000
      emit('paused')
    },
    seek: (s) => {
      offset = Math.max(0, Math.min(s, DURATION))
      startedAt = performance.now()
    },
    position: () => {
      const live = timer !== null ? (performance.now() - startedAt) / 1000 : 0
      return { time: Math.min(offset + live, DURATION), duration: DURATION }
    },
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    destroy: () => {
      if (timer !== null) window.clearInterval(timer)
      void ctx?.close()
      ctx = null
      listeners.clear()
    },
  }
}
