import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaybackSource, PlaybackState } from './types'
import { createHtmlAudioSource } from './htmlAudio'

/**
 * Мост между императивным источником звука и React.
 *
 * Позиция трека НЕ хранится в состоянии React — она меняется десятки раз
 * в секунду и перерисовывала бы всё дерево. Её читает useProgress через rAF
 * и пишет напрямую в DOM.
 */
export function usePlayer(src: string) {
  const [state, setState] = useState<PlaybackState>('idle')
  const sourceRef = useRef<PlaybackSource | null>(null)

  useEffect(() => {
    const source = createHtmlAudioSource(src)
    sourceRef.current = source
    const unsubscribe = source.subscribe(setState)
    return () => {
      unsubscribe()
      source.destroy()
      sourceRef.current = null
    }
  }, [src])

  // Ref, чтобы toggle не пересоздавался на каждой смене состояния.
  const stateRef = useRef(state)
  stateRef.current = state

  const toggle = useCallback(() => {
    const s = sourceRef.current
    if (!s) return
    // Синхронный вызов внутри обработчика тапа — условие автоплея в iOS
    // Safari. Любой await до play() разрывает жест, и звука не будет.
    if (stateRef.current === 'playing') s.pause()
    else s.play()
  }, [])

  return { state, toggle, source: sourceRef }
}
