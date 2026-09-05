import { useEffect, useRef, useState } from 'react'
import { Shell } from './app/Shell'
import { usePlayer } from './audio/usePlayer'
import { formatTime, useProgress } from './audio/useProgress'
import { bindMediaSession } from './audio/mediaSession'
import { TRACK } from './data/track'

// Геометрия кольца-таймлайна в единицах viewBox — фиксированная, сам SVG
// растягивается CSS-размером снаружи, вектор (и толщина обводки) масштабируется
// вместе с ним пропорционально.
const VB = 356
const CENTER = VB / 2
const DISC_R = 150
const RING_R = 175
const STROKE = 6
const HIT_STROKE = 34 // невидимая, но широкая зона захвата пальцем
const CIRCUMFERENCE = 2 * Math.PI * RING_R
const DISC_PCT = `${((DISC_R * 2) / VB) * 100}%`

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M4 16.5V20h3.5L18.5 9 15 5.5 4 16.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m13.5 7 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function Player() {
  const { state, toggle, source } = usePlayer(TRACK.src)
  const playing = state === 'playing'

  const [artworkUrl, setArtworkUrl] = useState(TRACK.artwork)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const progressRef = useRef<SVGCircleElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const totalRef = useRef<HTMLSpanElement>(null)
  const draggingRef = useRef(false)

  // Обложка сменная: тап по диску или по значку — открывает системный
  // пикер. Файл никуда не улетает, это чистый URL.createObjectURL —
  // без бэкенда обложка живёт только в этой вкладке.
  function openPicker() {
    fileInputRef.current?.click()
  }
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // позволяет выбрать тот же файл повторно
    if (!file) return
    const url = URL.createObjectURL(file)
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = url
    setArtworkUrl(url)
  }
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!source.current) return
    return bindMediaSession(source.current, { ...TRACK, artwork: artworkUrl })
  }, [source, artworkUrl, state])

  function applyProgress(time: number, duration: number) {
    const ratio = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0
    if (progressRef.current) {
      progressRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - ratio))
    }
    if (timeRef.current) timeRef.current.textContent = formatTime(time)
    if (totalRef.current) totalRef.current.textContent = formatTime(duration)
  }

  useProgress(source, playing, (time, duration) => {
    if (draggingRef.current) return
    applyProgress(time, duration)
  })

  // Угол считаем от центра рендер-прямоугольника SVG, а не от viewBox —
  // так работает независимо от того, во сколько раз браузер отмасштабировал
  // векторные единицы под реальный размер кольца.
  function ratioFromPointer(e: React.PointerEvent) {
    const el = svgRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let angle = Math.atan2(e.clientY - cy, e.clientX - cx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2
    return angle / (Math.PI * 2)
  }

  function handlePointerDown(e: React.PointerEvent<SVGCircleElement>) {
    const s = source.current
    if (!s) return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    const { duration } = s.position()
    applyProgress(ratioFromPointer(e) * duration, duration)
  }
  function handlePointerMove(e: React.PointerEvent<SVGCircleElement>) {
    if (!draggingRef.current) return
    const s = source.current
    if (!s) return
    const { duration } = s.position()
    applyProgress(ratioFromPointer(e) * duration, duration)
  }
  function handlePointerUp(e: React.PointerEvent<SVGCircleElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    const s = source.current
    if (!s) return
    const { duration } = s.position()
    s.seek(ratioFromPointer(e) * duration)
  }

  return (
    <Shell>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Кольцо-таймлайн вокруг пластинки. Тонкий видимый штрих + широкая
          прозрачная «ловилка» под пальцем поверх него — 6px обводки достаточно
          глазу, но никуда не годится как зона тапа. */}
      <div className="mt-9 flex justify-center">
        <div className="relative" style={{ width: 'min(78vw, 320px)', height: 'min(78vw, 320px)' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB} ${VB}`}
            width="100%"
            height="100%"
            style={{ touchAction: 'none' }}
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_R}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth={STROKE}
            />
            <circle
              ref={progressRef}
              cx={CENTER}
              cy={CENTER}
              r={RING_R}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_R}
              fill="none"
              stroke="transparent"
              strokeWidth={HIT_STROKE}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: 'none', cursor: 'pointer' }}
            />
          </svg>

          {/* Сама пластинка — не вращается только эта обёртка, кручение
              на слое ниже, чтобы значок «сменить обложку» стоял неподвижно. */}
          <div
            className="absolute inset-0 m-auto rounded-full"
            style={{ width: DISC_PCT, height: DISC_PCT }}
          >
            <button
              onClick={openPicker}
              aria-label="Сменить обложку"
              className="vinyl-spin block size-full overflow-hidden rounded-full"
              style={{ animationPlayState: playing ? 'running' : 'paused' }}
            >
              <img src={artworkUrl} alt="" className="pointer-events-none size-full object-cover" />
              {/* Бороздки винила — тонкие концентрические кольца поверх артворка. */}
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'repeating-radial-gradient(circle at center, transparent 0 6px, rgb(0 0 0 / 0.14) 6px 7px)',
                }}
              />
              {/* Лейбл по центру. */}
              <div
                className="bg-bg border-border absolute inset-0 m-auto rounded-full border"
                style={{ width: '17%', height: '17%' }}
              />
            </button>
            <span className="bg-surface-2 border-border text-text-2 pressable pointer-events-none absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border">
              <EditIcon />
            </span>
          </div>
        </div>
      </div>

      <div className="text-caption text-text-3 tnum mt-6 flex justify-between">
        <span ref={timeRef}>0:00</span>
        <span ref={totalRef}>0:00</span>
      </div>

      <div className="mt-5">
        <p className="text-title truncate-1">{TRACK.title}</p>
        <p className="text-meta text-text-2 truncate-1 mt-0.5">{TRACK.artist}</p>
      </div>

      {/* Большая текстовая кнопка вместо иконки — по образцу макета.
          Toggle меняет подпись Play/Stop; поведение по-прежнему пауза
          с сохранением позиции, не сброс в начало — «Stop» здесь название
          состояния кнопки, а не отдельная функция остановки. */}
      <button
        onClick={toggle}
        disabled={state === 'error'}
        className="pressable disabled:text-text-disabled mt-[50px] block text-[56px] leading-none font-bold tracking-tight"
      >
        {playing ? 'Stop' : 'Play'}
      </button>

      {state === 'error' && (
        <p className="text-meta text-danger mt-4">Источник не отвечает.</p>
      )}
    </Shell>
  )
}
