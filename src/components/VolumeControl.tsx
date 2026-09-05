import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaybackSource } from '../audio/types'
import { clamp01, loadVolume, saveVolume, VOLUME_SUPPORTED } from '../audio/volume'

type Props = {
  source: React.RefObject<PlaybackSource | null>
}

/** Высота ползунка из макета. Живёт в JS, а не только в CSS: по ней же
 *  считается позиция указателя при драге. */
const TRACK_H = 120
const STEP = 0.05
const PAGE_STEP = 0.1
/** Ховер не должен рваться на микродвижении мыши у края поповера. */
const CLOSE_DELAY = 140

export function VolumeControl({ source }: Props) {
  const initial = loadVolume()
  // Уровень держим в состоянии React, хотя при драге он меняется покадрово:
  // в отличие от позиции трека, здесь перерисовывается только сам контрол —
  // три элемента, и только пока палец на ползунке.
  const [level, setLevel] = useState(initial.level)
  const [muted, setMuted] = useState(initial.muted)
  const [open, setOpen] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const saveTimer = useRef<number | null>(null)
  /** Взведён, если текущий тап по кнопке должен только раскрыть поповер. */
  const openOnlyRef = useRef(false)

  // localStorage синхронный — писать на каждый кадр драга нельзя.
  const persist = useCallback((next: { level: number; muted: boolean }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => saveVolume(next), 250)
  }, [])

  const applyLevel = useCallback(
    (next: number) => {
      const v = clamp01(next)
      setLevel(v)
      source.current?.setVolume(v)
      // Тянуть ползунок при включённом mute и не слышать результата —
      // тупик: любое движение уровня само снимает беззвучие.
      if (muted && v > 0) {
        setMuted(false)
        source.current?.setMuted(false)
      }
      persist({ level: v, muted: muted && v === 0 })
    },
    [muted, persist, source],
  )

  const toggleMute = useCallback(() => {
    const next = !muted
    setMuted(next)
    source.current?.setMuted(next)
    persist({ level, muted: next })
  }, [level, muted, persist, source])

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY)
  }

  useEffect(() => () => cancelClose(), [])

  // Тач-ветка: ховера нет, поповер открывается тапом — и закрывается
  // касанием мимо, как любое всплывающее меню.
  useEffect(() => {
    if (!open) return
    function onDocDown(e: PointerEvent) {
      if (e.pointerType === 'mouse') return
      if (wrapRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDocDown)
    return () => document.removeEventListener('pointerdown', onDocDown)
  }, [open])

  // Колесо над поповером. Нативный listener, потому что React вешает
  // wheel пассивно на корень — из onWheel preventDefault не работает,
  // и страница под поповером уезжала бы вместе с громкостью.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      applyLevel(level + (e.deltaY < 0 ? STEP : -STEP))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyLevel, level])

  function levelFromPointer(e: React.PointerEvent) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return level
    // Ось Y растёт вниз, громкость — вверх, отсюда инверсия.
    return clamp01(1 - (e.clientY - rect.top) / rect.height)
  }

  function handleTrackDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    trackRef.current?.focus()
    applyLevel(levelFromPointer(e))
  }
  function handleTrackMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    applyLevel(levelFromPointer(e))
  }
  function handleTrackUp() {
    draggingRef.current = false
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const map: Record<string, number | null> = {
      ArrowUp: level + STEP,
      ArrowRight: level + STEP,
      ArrowDown: level - STEP,
      ArrowLeft: level - STEP,
      PageUp: level + PAGE_STEP,
      PageDown: level - PAGE_STEP,
      Home: 0,
      End: 1,
    }
    const next = map[e.key]
    if (next == null) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    e.preventDefault()
    applyLevel(next)
  }

  // Управления громкостью нет (iOS) — контрола тоже нет. Мёртвый ползунок
  // читается как поломка, а не как ограничение платформы.
  if (!VOLUME_SUPPORTED) return null

  const shown = muted ? 0 : level
  const percent = Math.round(shown * 100)

  return (
    <div
      ref={wrapRef}
      className="volume"
      data-open={open || undefined}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        cancelClose()
        setOpen(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return
        if (draggingRef.current) return
        scheduleClose()
      }}
      // Клавиатурный путь: таб доводит фокус до ползунка и тем самым
      // раскрывает поповер — иначе до него было бы не добраться.
      onFocusCapture={() => {
        cancelClose()
        setOpen(true)
      }}
      onBlurCapture={(e) => {
        if (wrapRef.current?.contains(e.relatedTarget as Node)) return
        setOpen(false)
      }}
    >
      <div className="volume-popover">
        <div className="volume-pill">
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Громкость"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={muted ? 'Без звука' : `${percent}%`}
            className="volume-track"
            style={{ height: TRACK_H }}
            onPointerDown={handleTrackDown}
            onPointerMove={handleTrackMove}
            onPointerUp={handleTrackUp}
            onPointerCancel={handleTrackUp}
            onKeyDown={handleKeyDown}
          >
            <div className="volume-fill" style={{ height: `${shown * 100}%` }} />
            <div className="volume-thumb" style={{ bottom: `${shown * 100}%` }} />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="tap pressable volume-button"
        aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        aria-pressed={muted}
        onClick={() => {
          // На тач-устройстве первый тап только раскрывает поповер: без
          // ховера иначе до ползунка не добраться. Дальше кнопка работает
          // как обычный mute.
          //
          // Решение принимаем здесь, а не в pointerdown: preventDefault
          // там подавляет эмуляцию mouse-событий, но click после тапа
          // браузер шлёт всё равно — и звук выключался заодно с открытием.
          if (openOnlyRef.current) {
            openOnlyRef.current = false
            return
          }
          toggleMute()
        }}
        onPointerDown={(e) => {
          // Клавиатурный «клик» по Enter/Space сюда не заходит — флаг
          // остаётся снятым, и с клавиатуры кнопка всегда мьютит.
          openOnlyRef.current = e.pointerType !== 'mouse' && !open
          if (openOnlyRef.current) setOpen(true)
        }}
      >
        <VolumeIcon level={shown} muted={muted} />
      </button>
    </div>
  )
}

/** Волны появляются по уровню — иконка сама по себе индикатор громкости. */
function VolumeIcon({ level, muted }: { level: number; muted: boolean }) {
  // Уровень 0 рисуем перечёркнутым наравне с mute: слышно одинаково —
  // никак, и иконка не должна утверждать обратное.
  const silent = muted || level === 0
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"
        fill="currentColor"
      />
      {silent ? (
        <path
          d="m16 9.5 5 5m0-5-5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M15.4 9.4a3.4 3.4 0 0 1 0 5.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity={level > 0 ? 1 : 0.25}
          />
          <path
            d="M18.3 6.9a7 7 0 0 1 0 10.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity={level >= 0.5 ? 1 : 0.25}
          />
        </>
      )}
    </svg>
  )
}
