import { useEffect, useState } from 'react'
import { Shell } from './app/Shell'

/**
 * Витрина базы: палитра, типографика, состояния и сетка на живом экране.
 * Экран одноразовый — уйдёт, как только появится настоящая библиотека треков.
 */

const SURFACES = [
  ['bg', 'канвас'],
  ['surface-1', 'карточки, ряды'],
  ['surface-2', 'мини-плеер, шиты'],
  ['surface-3', 'pressed, выделение'],
] as const

const TEXTS = [
  ['text', 'Название трека', '~18:1'],
  ['text-2', 'Исполнитель, подписи', '~8.2:1'],
  ['text-3', 'Тайминги, мета', '~5.0:1'],
  ['text-disabled', 'Недоступно', 'не для чтения'],
] as const

/* Классы перечислены литералами намеренно: Tailwind сканирует исходники
   по строкам и не увидит склеенное `text-${size}`. */
const TYPE = [
  ['text-display', 'display', 'Now Playing'],
  ['text-heading', 'heading', 'Заголовок секции'],
  ['text-title', 'title', 'Название трека'],
  ['text-body', 'body', 'Основной текст'],
  ['text-meta', 'meta', 'Исполнитель · Альбом'],
  ['text-caption', 'caption', 'ПОДПИСЬ'],
] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-caption text-text-3 mb-3 uppercase">{title}</h2>
      {children}
    </section>
  )
}

export function Specimen({ onBack }: { onBack: () => void }) {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const inRange = width >= 360 && width <= 440

  return (
    <Shell
      header={
        <div className="flex items-baseline justify-between py-4">
          <button onClick={onBack} className="text-heading pressable text-left">
            ← База
          </button>
          <span className={`text-meta tnum ${inRange ? 'text-text-3' : 'text-danger'}`}>
            {width}px
          </span>
        </div>
      }
      bottom={
        <>
          {/* Мини-плеер */}
          <div
            className="blur-surface border-border mx-2 flex items-center gap-3 rounded-md border px-3"
            style={{ height: 'var(--miniplayer-h)' }}
          >
            <div className="bg-accent-soft border-border size-10 shrink-0 rounded-sm border" />
            <div className="min-w-0 flex-1">
              <div className="text-title truncate-1">Название трека подлиннее</div>
              <div className="text-meta text-text-2 truncate-1">Исполнитель</div>
            </div>
            <button className="tap pressable text-text" aria-label="Пауза">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1.4" />
                <rect x="14" y="5" width="4" height="14" rx="1.4" />
              </svg>
            </button>
          </div>

          {/* Таб-бар */}
          <nav
            className="border-border mt-1 flex items-center border-t"
            style={{ height: 'var(--tabbar-h)' }}
          >
            {['Медиатека', 'Поиск'].map((label, i) => (
              <button
                key={label}
                className={`tap pressable text-caption h-full flex-1 ${
                  i === 0 ? 'text-accent' : 'text-text-3'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </>
      }
    >
      <Section title="Поверхности">
        <div className="border-border overflow-hidden rounded-md border">
          {SURFACES.map(([name, note]) => (
            <div
              key={name}
              className="flex items-center justify-between px-4 py-3.5"
              style={{ background: `var(--color-${name})` }}
            >
              <span className="text-body">--color-{name}</span>
              <span className="text-meta text-text-3">{note}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Текст">
        <div className="flex flex-col gap-3">
          {TEXTS.map(([name, sample, ratio]) => (
            <div key={name} className="flex items-baseline justify-between gap-3">
              <span className="text-body" style={{ color: `var(--color-${name})` }}>
                {sample}
              </span>
              <span className="text-caption text-text-3 tnum shrink-0">{ratio}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Типографика">
        <div className="flex flex-col gap-3">
          {TYPE.map(([cls, name, sample]) => (
            <div key={name} className="flex items-baseline justify-between gap-3">
              <span className={`${cls} truncate-1`}>{sample}</span>
              <span className="text-caption text-text-3 shrink-0">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Ряд списка">
        <div className="-mx-1">
          {['Первый трек', 'Второй трек с длинным названием, которое не влезает', 'Третий'].map(
            (t, i) => (
              <button
                key={t}
                className="pressable active:bg-surface-3 flex w-full items-center rounded-sm px-1 text-left"
                style={{ gap: 'var(--gap-row)', paddingBlock: 'var(--gap-row)' }}
              >
                <div className="bg-surface-2 border-border size-12 shrink-0 rounded-sm border" />
                <div className="min-w-0 flex-1">
                  <div className={`text-title truncate-1 ${i === 0 ? 'text-accent' : ''}`}>{t}</div>
                  <div className="text-meta text-text-2 truncate-1">Исполнитель · Альбом</div>
                </div>
                <span className="text-meta text-text-3 tnum">3:0{i}</span>
              </button>
            ),
          )}
        </div>
      </Section>

      <Section title="Радиусы">
        <div className="flex flex-wrap gap-2">
          {['xs', 'sm', 'md', 'lg', 'xl'].map((r) => (
            <div
              key={r}
              className="bg-surface-2 border-border text-caption text-text-3 flex size-14 items-center justify-center border"
              style={{ borderRadius: `var(--radius-${r})` }}
            >
              {r}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Акцент">
        <div className="flex items-center gap-2">
          <button className="bg-accent text-on-accent pressable text-title rounded-full px-5 py-3">
            Слушать
          </button>
          <button className="bg-accent-soft text-accent pressable text-title rounded-full px-5 py-3">
            В очередь
          </button>
        </div>
        <p className="text-meta text-text-3 mt-3">
          --color-accent переопределяется из доминантного цвета обложки в рантайме.
        </p>
      </Section>
    </Shell>
  )
}
