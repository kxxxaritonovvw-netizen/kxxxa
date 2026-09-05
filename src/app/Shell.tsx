import type { ReactNode } from 'react'

type Props = { children: ReactNode }

/**
 * Каркас приложения. Скроллится только средняя область — сейчас на
 * единственном экране это не критично, но раскладка приходит бесплатно
 * из прошлой версии и не мешает.
 */
export function Shell({ children }: Props) {
  return (
    <div className="app-shell">
      <main className="scroll-y" style={{ paddingInline: 'var(--gutter)' }}>
        {children}
      </main>
    </div>
  )
}
