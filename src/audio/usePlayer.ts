import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaybackSource, PlaybackState } from './types'
import { createYouTubeSource } from './youtube'
import { createHtmlAudioSource } from './htmlAudio'
import { createSynthSource } from './synth'
import type { Track } from '../data/track'

/**
 * Мост между императивным источником звука и React.
 *
 * Позиция трека НЕ хранится в состоянии React: она меняется десятки раз
 * в секунду и перерисовывала бы всё дерево. Её читает useProgress через rAF
 * и пишет напрямую в DOM.
 */
export function usePlayer(track: Track, containerRef: React.RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState<PlaybackState>('idle')
  const sourceRef = useRef<PlaybackSource | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (track.source === 'youtube' && !container) return

    // YT.Player заменяет переданный элемент на <iframe>. Отдавать ему ноду,
    // которой владеет React, нельзя: при размонтировании React не найдёт её
    // и упадёт на removeChild. Поэтому создаём одноразового «хозяина» вручную.
    let host: HTMLDivElement | null = null
    let source: PlaybackSource

    if (track.source === 'youtube') {
      host = document.createElement('div')
      host.style.width = '100%'
      host.style.height = '100%'
      container!.appendChild(host)
      source = createYouTubeSource(track.ref, host)
    } else if (track.source === 'synth') {
      source = createSynthSource()
    } else {
      source = createHtmlAudioSource(track.ref)
    }

    sourceRef.current = source
    const unsubscribe = source.subscribe(setState)

    return () => {
      unsubscribe()
      source.destroy()
      sourceRef.current = null
      if (container) container.replaceChildren()
    }
  }, [track.source, track.ref, containerRef])

  // Актуальное состояние держим в ref, чтобы toggle не пересоздавался
  // на каждой смене состояния и не ломал мемоизацию кнопки.
  const stateRef = useRef(state)
  stateRef.current = state

  const toggle = useCallback(() => {
    const s = sourceRef.current
    if (!s) return
    // Вызов идёт синхронно внутри обработчика тапа — это условие автоплея
    // в iOS Safari. Любой await до play() разрывает жест, и звука не будет.
    if (stateRef.current === 'playing') s.pause()
    else s.play()
  }, [])

  return { state, toggle, source: sourceRef }
}
