import { useEffect, useRef, useState } from 'react'
import { Shell } from './app/Shell'
import { usePlayer } from './audio/usePlayer'
import { formatTime, useProgress } from './audio/useProgress'
import { TRACK, fetchMeta } from './data/track'

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

export function Player({ onOpenSpecimen }: { onOpenSpecimen: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const leftRef = useRef<HTMLSpanElement>(null)

  const { state, toggle, source } = usePlayer(TRACK, mountRef)
  const isSynth = TRACK.source === 'synth'
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

  // Пока играет — крутим rAF и пишем в DOM в обход рендера React.
  useProgress(source, state === 'playing', (time, duration) => {
    const pct = duration > 0 ? (time / duration) * 100 : 0
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${pct / 100})`
    if (timeRef.current) timeRef.current.textContent = formatTime(time)
    if (leftRef.current) leftRef.current.textContent = `-${formatTime(Math.max(0, duration - time))}`
  })

  const busy = state === 'loading'
  const playing = state === 'playing'

  return (
    <Shell
      header={
        <div className="flex items-center justify-between py-4">
          <span className="text-caption text-text-3 uppercase">Играет сейчас</span>
          <button onClick={onOpenSpecimen} className="text-caption text-text-3 pressable uppercase">
            База →
          </button>
        </div>
      }
    >
      {/* Обложка. Внутрь YT подставляет свой iframe — контейнером владеет
          не React, поэтому здесь только рамка и кадрирование. */}
      <div className="bg-surface-1 border-border relative aspect-square overflow-hidden rounded-lg border">
        <div
          ref={mountRef}
          className="pointer-events-none absolute inset-0 [&_iframe]:size-full"
          // Видео 16:9 в квадрате: масштабируем до заполнения, чтобы не было
          // чёрных полос по краям обложки.
          style={{ transform: 'scale(1.8)' }}
        />
        {isSynth && (
          // Без внешнего источника обложки нет — рисуем градиент на акценте,
          // чтобы проверить посадку блока и радиусы.
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 120% at 25% 15%, var(--color-accent) 0%, transparent 60%), linear-gradient(160deg, #2a1f5c 0%, #0b0b0f 75%)',
            }}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
      </div>

      <div className="mt-6">
        <h1 className="text-display truncate-1">{meta.title}</h1>
        <p className="text-title text-text-2 truncate-1 mt-1">{meta.artist || '—'}</p>
      </div>

      {/* Прогресс. Полоска анимируется через transform: scaleX — это
          composited-свойство, оно не вызывает layout на каждом кадре. */}
      <div className="mt-7">
        <div className="bg-surface-3 h-1 overflow-hidden rounded-full">
          <div
            ref={fillRef}
            className="bg-accent h-full origin-left rounded-full"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
        <div className="text-caption text-text-3 tnum mt-2 flex justify-between">
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
          : 'Источник: YouTube IFrame API. Временный — локскрин и фон с ним не работают.'}
      </p>
    </Shell>
  )
}
