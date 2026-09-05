import type { ReactNode } from 'react'

type Props = {
  header?: ReactNode
  children: ReactNode
  /** Мини-плеер и таб-бар: закреплены снизу, вне скролла. */
  bottom?: ReactNode
}

/**
 * Каркас приложения.
 *
 * Скроллится только средняя область. Хром (шапка, мини-плеер, табы) закреплён,
 * поэтому схлопывание адресной строки на iOS ничего не двигает.
 */
export function Shell({ header, children, bottom }: Props) {
  return (
    <div className="app-shell">
      {header && (
        <header
          className="shrink-0"
          style={{ paddingTop: 'var(--safe-t)', paddingInline: 'var(--gutter)' }}
        >
          {header}
        </header>
      )}

      <main className="scroll-y" style={{ paddingInline: 'var(--gutter)' }}>
        {children}
        {/* Разгонный блок: последний элемент списка не уезжает под нижний хром. */}
        <div style={{ height: 'var(--bottom-chrome)' }} aria-hidden />
      </main>

      {bottom && (
        <div
          className="shrink-0"
          style={{ paddingBottom: 'var(--safe-b)', zIndex: 'var(--z-miniplayer)' }}
        >
          {bottom}
        </div>
      )}
    </div>
  )
}
