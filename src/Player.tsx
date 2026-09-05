import { useEffect, useRef, useState } from 'react'
import { Shell } from './app/Shell'
import { usePlayer } from './audio/usePlayer'
import { formatTime, useProgress } from './audio/useProgress'
import { TRACK, fetchMeta } from './data/track'
import { bindMediaSession } from './audio/mediaSession'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden>
      {/* Оптическая компенсация: треугольник кажется смещённым влево в круге */}
      <path d="M8.5 5.2a1 1 0 0 1 1.52-.85l9 6.8a1 1 0 0 1 0 1.7l-9 6.8A1 1 0 0 1 8.5 18.8z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden>
      <rect x="6.5" y="4.5" width="4.5" height="15" rx="1.6" />
      <rect x="13" y="4.5" width="4.5" height="15" rx="1.6" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden className="animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function Player() {
  const mountRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const leftRef = useRef<HTMLSpanElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  // Пока идёт драг, rAF-колбэк из useProgress не должен перетирать позицию
  // пальца — иначе полоска дёргается между реальным временем и жестом.
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)

  const { state, toggle, source } = usePlayer(TRACK, mountRef)
  const isSynth = TRACK.source === 'synth'
  const hasArtwork = Boolean(TRACK.artwork)
  const [meta, setMeta] = useState(
    isSynth ? { title: 'Тестовый сигнал', artist: 'Web Audio' } : { title: TRACK.title, artist: TRACK.artist },
  )

  useEffect(() => {
    if (isSynth) return
    let alive = true
    void fetchMeta(TRACK.ref).then((m) => {
      if (alive && m) setMeta(m)
    })
    return () => {
      alive = false
    }
  }, [isSynth])

  // Локскрин и наушники — только для настоящего аудиоэлемента.
  useEffect(() => {
    if (TRACK.source !== 'audio' || !source.current) return
    return bindMediaSession(source.current, meta)
  }, [source, meta, state])

  /** Одна точка правды для отрисовки прогресса — использует и rAF, и драг. */
  function applyProgress(time: number, duration: number) {
    const pct = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${pct})`
    if (thumbRef.current) thumbRef.current.style.left = `${pct * 100}%`
    if (timeRef.current) timeRef.current.textContent = formatTime(time)
    if (leftRef.current) leftRef.current.textContent = `-${formatTime(Math.max(0, duration - time))}`
  }

  // Пока играет — крутим rAF и пишем в DOM в обход рендера React.
  useProgress(source, state === 'playing', (time, duration) => {
    if (draggingRef.current) return
    applyProgress(time, duration)
  })

  function ratioFromPointer(e: React.PointerEvent) {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  }

  function handlePointerDown(e: React.PointerEvent) {
    const el = trackRef.current
    const s = source.current
    if (!el || !s) return
    el.setPointerCapture(e.pointerId)
    draggingRef.current = true
    setDragging(true)
    const { duration } = s.position()
    applyProgress(ratioFromPointer(e) * duration, duration)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return
    const s = source.current
    if (!s) return
    const { duration } = s.position()
    applyProgress(ratioFromPointer(e) * duration, duration)
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!draggingRef.current) return
    const s = source.current
    draggingRef.current = false
    setDragging(false)
    if (!s) return
    const { duration } = s.position()
    s.seek(ratioFromPointer(e) * duration)
  }

  const busy = state === 'loading'
  const playing = state === 'playing'

  return (
    <Shell>
      {/* Обложка. Внутрь YT подставляет свой iframe — контейнером владеет
          не React, поэтому здесь только рамка и кадрирование. */}
      <div className="bg-surface-1 border-border relative mt-4 aspect-square overflow-hidden rounded-lg border">
        <div
          ref={mountRef}
          className="pointer-events-none absolute inset-0 [&_iframe]:size-full"
          // Видео 16:9 в квадрате: масштабируем до заполнения, чтобы не было
          // чёрных полос по краям обложки.
          style={{ transform: TRACK.source === 'youtube' ? 'scale(1.8)' : undefined }}
        />
        {hasArtwork && (
          <img
            src={TRACK.artwork}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {!hasArtwork && (
          // Плейсхолдер обложки: нейтральный серый, без акцента.
          // Цветное пятно здесь спорило бы с кнопкой и мешало оценивать палитру.
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 100% at 30% 10%, rgb(255 255 255 / 0.07) 0%, transparent 55%), linear-gradient(165deg, var(--color-surface-3) 0%, var(--color-surface-1) 70%)',
            }}
          />
        )}
        {TRACK.source === 'youtube' && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        )}
      </div>

      <div className="mt-6">
        <h1 className="text-display truncate-1">{meta.title}</h1>
        <p className="text-title text-text-2 truncate-1 mt-1">{meta.artist || '—'}</p>
      </div>

      {/* Прогресс. Полоска и точка позиции анимируются напрямую через ref —
          composited-свойства, layout не пересчитывается на каждом кадре. */}
      <div className="mt-7">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative -mx-1 flex items-center px-1 py-3"
          style={{ touchAction: 'none' }}
        >
          <div className="bg-surface-3 h-1 w-full overflow-hidden rounded-full">
            <div
              ref={fillRef}
              className="bg-accent h-full origin-left rounded-full"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
          <div
            ref={thumbRef}
            className="bg-accent pointer-events-none absolute rounded-full shadow-[0_1px_4px_rgb(0_0_0_/_0.4)] transition-[width,height] duration-100"
            style={{
              left: '0%',
              top: '50%',
              width: dragging ? 16 : 12,
              height: dragging ? 16 : 12,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
        <div className="text-caption text-text-3 tnum -mt-1 flex justify-between">
          <span ref={timeRef}>0:00</span>
          <span ref={leftRef}>-0:00</span>
        </div>
      </div>

      {/* Одна кнопка. Всё, что она делает — синхронно дёргает источник. */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={toggle}
          disabled={state === 'error'}
          aria-label={playing ? 'Пауза' : 'Играть'}
          className="bg-accent text-on-accent pressable disabled:bg-surface-2 disabled:text-text-disabled flex size-[72px] items-center justify-center rounded-full"
        >
          {busy ? <Spinner /> : playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>

      {state === 'error' && (
        <p className="text-meta text-danger mt-4 text-center">
          Источник не отвечает. Проверь сеть или блокировщик — YouTube-плеер часто режут.
        </p>
      )}

      <p className="text-caption text-text-3 mt-6 text-center">
        {isSynth
          ? 'Источник: Web Audio. Здесь проверяется интерфейс, а не звук — CSP не пускает внешний плеер.'
          : TRACK.source === 'audio'
            ? 'Источник: HTMLAudioElement. Файл вшит в страницу, локскрин и наушники работают.'
            : 'Источник: YouTube IFrame API. Временный — локскрин и фон с ним не работают.'}
      </p>
    </Shell>
  )
}
