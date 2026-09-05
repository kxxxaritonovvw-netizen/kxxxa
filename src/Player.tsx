import { useEffect, useRef, useState } from 'react'
import { Shell } from './app/Shell'
import { usePlayer } from './audio/usePlayer'
import { formatTime, useProgress } from './audio/useProgress'
import { bindMediaSession } from './audio/mediaSession'
import { VolumeControl } from './components/VolumeControl'
import { TRACK } from './data/track'

// Геометрия таймлайна в единицах viewBox — фиксированная, сам SVG
// растягивается CSS-размером снаружи, вектор (и толщина обводки) масштабируется
// вместе с ним пропорционально.
const VB = 356
const CENTER = VB / 2
const DISC_R = 150
const RING_R = 175
const STROKE = 6
const HIT_STROKE = 34 // невидимая, но широкая зона захвата пальцем
const DISC_PCT = `${((DISC_R * 2) / VB) * 100}%`

// Таймлайн — не полное кольцо, а дуга только по низу диска, слева направо.
// Угол 0° — «восток» (математическая ось X), 90° — «юг» (вниз, экранные
// координаты Y растут вниз). Лево — 160° (чуть ниже горизонтали диска),
// право — 20°, дуга между ними проходит через самый низ (90°).
const ARC_LEFT_DEG = 160
const ARC_RIGHT_DEG = 20
const ARC_SPAN_DEG = ARC_LEFT_DEG - ARC_RIGHT_DEG

function pointOnArc(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}
const ARC_P1 = pointOnArc(ARC_LEFT_DEG, RING_R)
const ARC_P2 = pointOnArc(ARC_RIGHT_DEG, RING_R)
// sweep-flag=0: дуга короче 180° и идёт в сторону убывания угла — на экране
// это движение против часовой стрелки, именно то, что визуально читается
// как «слева, через низ, направо».
const ARC_PATH = `M ${ARC_P1.x} ${ARC_P1.y} A ${RING_R} ${RING_R} 0 0 0 ${ARC_P2.x} ${ARC_P2.y}`

// Ховер-наклон. 10° — примерно как у карточек в Steam: заметно, но диск
// не превращается в монету на ребре.
const MAX_TILT_DEG = 10
const HOVER_SCALE = 1.04

export function Player() {
  const { state, toggle, source } = usePlayer(TRACK.src)
  const playing = state === 'playing'

  const [artworkUrl, setArtworkUrl] = useState(TRACK.artwork)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const discRef = useRef<HTMLButtonElement>(null)
  // Габариты диска кэшируем на входе курсора: во-первых, не дёргаем layout
  // на каждом mousemove, во-вторых, при наведении диск масштабируется —
  // и читать его прямоугольник уже наклонённым значило бы считать угол
  // от «плывущей» системы координат.
  const discRectRef = useRef<DOMRect | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const progressRef = useRef<SVGPathElement>(null)
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

  // Наклон диска под курсором. Пишем в DOM напрямую, минуя состояние React:
  // mousemove сыплется десятками кадров в секунду, и setState на каждый
  // перерисовывал бы весь экран.
  function handleDiscEnter(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== 'mouse') return
    discRectRef.current = e.currentTarget.getBoundingClientRect()
  }

  function handleDiscMove(e: React.PointerEvent<HTMLButtonElement>) {
    // Только мышь: на тач-устройствах ховера нет, а pointermove там означает
    // палец на экране — диск дёргался бы при каждом касании.
    if (e.pointerType !== 'mouse') return
    const el = discRef.current
    const rect = discRectRef.current ?? el?.getBoundingClientRect()
    if (!el || !rect) return

    // Позиция курсора в диапазоне -1..1 от центра диска.
    const nx = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)))
    const ny = Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)))

    // Диск наклоняется НАВСТРЕЧУ курсору: край под указателем приподнимается
    // к зрителю, противоположный уходит вглубь. Отсюда знаки — отрицательный
    // rotateY тянет правый край вперёд, положительный rotateX — нижний.
    el.style.transform =
      `perspective(700px) rotateX(${(ny * MAX_TILT_DEG).toFixed(2)}deg) ` +
      `rotateY(${(-nx * MAX_TILT_DEG).toFixed(2)}deg) scale(${HOVER_SCALE})`
    // Тень уезжает против наклона — как будто источник света сверху и диск
    // реально приподнят над фоном.
    el.style.boxShadow = `${(-nx * 14).toFixed(1)}px ${(20 - ny * 6).toFixed(1)}px 38px rgb(0 0 0 / 0.65)`
  }

  function resetTilt() {
    const el = discRef.current
    if (!el) return
    discRectRef.current = null
    // Пустая строка возвращает значения из CSS-класса, а не «ноль»:
    // покоящийся наклон и базовая тень описаны в .disc-tilt.
    el.style.transform = ''
    el.style.boxShadow = ''
  }

  function applyProgress(time: number, duration: number) {
    const ratio = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0
    if (progressRef.current) {
      // pathLength=100 на самом path — офсет считается в «процентах» дуги,
      // не в реальных единицах длины, поэтому формула не зависит от радиуса.
      progressRef.current.style.strokeDashoffset = String(100 * (1 - ratio))
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
  // векторные единицы под реальный размер дуги.
  function ratioFromPointer(e: React.PointerEvent) {
    const el = svgRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI
    if (deg <= ARC_LEFT_DEG && deg >= ARC_RIGHT_DEG) {
      return (ARC_LEFT_DEG - deg) / ARC_SPAN_DEG
    }
    // Палец соскользнул выше дуги (во время активного драга — курсор не
    // ограничен хитбоксом). Решаем по горизонтали, чтобы не «перескакивало»
    // на другой конец: слева от центра — начало, справа — конец.
    return dx < 0 ? 0 : 1
  }

  function handlePointerDown(e: React.PointerEvent<SVGPathElement>) {
    const s = source.current
    if (!s) return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    const { duration } = s.position()
    applyProgress(ratioFromPointer(e) * duration, duration)
  }
  function handlePointerMove(e: React.PointerEvent<SVGPathElement>) {
    if (!draggingRef.current) return
    const s = source.current
    if (!s) return
    const { duration } = s.position()
    applyProgress(ratioFromPointer(e) * duration, duration)
  }
  function handlePointerUp(e: React.PointerEvent<SVGPathElement>) {
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

      {/* Таймлайн — дуга только по низу диска, слева направо (не полное
          кольцо). Тонкий видимый штрих + широкая прозрачная «ловилка» под
          пальцем поверх него — 6px обводки не годится как зона тапа. */}
      <div className="relative mt-9 flex justify-center">
        <div className="relative" style={{ width: 'min(78vw, 320px)', height: 'min(78vw, 320px)' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB} ${VB}`}
            width="100%"
            height="100%"
            style={{ touchAction: 'none' }}
          >
            <path d={ARC_PATH} fill="none" stroke="var(--color-surface-3)" strokeWidth={STROKE} strokeLinecap="round" />
            <path
              ref={progressRef}
              d={ARC_PATH}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              pathLength={100}
              // Не просто `100`: одиночное значение задаёт периодический
              // паттерн 100 вкл / 100 выкл, и на нулевом прогрессе «вкл»
              // успевает начаться ровно в конце дуги — round-cap рисует там
              // паразитную точку, будто playhead уехал в конец. Явный пробел
              // длиннее самой дуги не даёт паттерну повториться.
              strokeDasharray="100 200"
              strokeDashoffset={100}
            />
            <path
              d={ARC_PATH}
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

          {/* Сама пластинка. Тап по ней открывает пикер обложки — отдельного
              значка нет, диск и есть кнопка.
              Внешний слой — наклон под курсором, вложенный — вращение. */}
          <button
            ref={discRef}
            onClick={openPicker}
            onPointerEnter={handleDiscEnter}
            onPointerMove={handleDiscMove}
            onPointerLeave={resetTilt}
            onPointerCancel={resetTilt}
            aria-label="Сменить обложку"
            className="disc-tilt absolute inset-0 m-auto rounded-full"
            style={{ width: DISC_PCT, height: DISC_PCT }}
          >
            <span
              className="vinyl-spin relative block size-full overflow-hidden rounded-full"
              style={{ animationPlayState: playing ? 'running' : 'paused' }}
            >
              <img src={artworkUrl} alt="" className="pointer-events-none size-full object-cover" />
              {/* Бороздки винила — тонкие концентрические кольца поверх артворка. */}
              <span
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'repeating-radial-gradient(circle at center, transparent 0 6px, rgb(0 0 0 / 0.14) 6px 7px)',
                }}
              />
              {/* Лейбл по центру. */}
              <span
                className="bg-bg border-border absolute inset-0 m-auto rounded-full border"
                style={{ width: '17%', height: '17%' }}
              />
            </span>
          </button>
        </div>

        {/* Тайминги прижаты базовой линией к нижней границе дуги.
            Нижний край дуги вместе с обводкой приходится ровно на низ
            viewBox (178 + 175 + 6/2 = 356), то есть на низ этой обёртки,
            поэтому bottom: 0 ставит на эту линию низ строки — а нужна
            базовая линия. Разница — глубина нижних выносных: при
            line-height: 1 это ≈0.13em, у всего системного стека
            (SF / Roboto / Segoe) соотношение практически одинаковое. */}
        <div
          className="text-caption text-text-3 tnum absolute inset-x-0 bottom-0 flex justify-between"
          style={{ lineHeight: 1, transform: 'translateY(0.13em)' }}
        >
          <span ref={timeRef}>0:00</span>
          <span ref={totalRef}>0:00</span>
        </div>
      </div>

      <div className="mt-8 text-center">
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
        className="pressable disabled:text-text-disabled mt-[50px] block w-full text-center text-[56px] leading-none font-bold tracking-tight"
      >
        {playing ? 'Stop' : 'Play'}
      </button>

      {/* Громкость прижата вправо: поповер выезжает вверх и накрывает
          правый край кнопки Play, где нет текста — по центру он бы лёг
          прямо на надпись. */}
      <div className="mt-4 flex justify-end">
        <VolumeControl source={source} />
      </div>

      {state === 'error' && (
        <p className="text-meta text-danger mt-4 text-center">Источник не отвечает.</p>
      )}
    </Shell>
  )
}
