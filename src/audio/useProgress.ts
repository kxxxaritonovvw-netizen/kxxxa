import { useEffect, useRef } from 'react'
import type { PlaybackSource } from './types'

/**
 * Опрос позиции через requestAnimationFrame с записью напрямую в DOM.
 *
 * Осознанно в обход React: обновление 60 раз в секунду через setState
 * перерисовывало бы список треков и весь Now Playing. Здесь меняются
 * ровно две ноды — ширина полоски и текст таймера.
 */
export function useProgress(
  source: React.RefObject<PlaybackSource | null>,
  active: boolean,
  onFrame: (time: number, duration: number) => void,
) {
  // Колбэк держим в ref: иначе новая функция на каждом рендере
  // перезапускала бы rAF-цикл.
  const cb = useRef(onFrame)
  cb.current = onFrame

  useEffect(() => {
    if (!active) return
    let raf = 0
    const tick = () => {
      const s = source.current
      if (s) {
        const { time, duration } = s.position()
        cb.current(time, duration)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [source, active])
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
