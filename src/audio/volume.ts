/**
 * Громкость: детект поддержки, кривая восприятия, персист.
 *
 * Живёт отдельным модулем от источника звука, потому что решает три
 * задачи, к воспроизведению отношения не имеющих: понять, можно ли
 * вообще управлять уровнем, перевести «сколько слышно» в «сколько
 * амплитуды» и пережить перезагрузку вкладки.
 */

const STORAGE_KEY = 'player:volume'

export type VolumeState = {
  /** Воспринимаемый уровень 0..1 — то, что показывает ползунок. */
  level: number
  muted: boolean
}

export const DEFAULT_VOLUME: VolumeState = { level: 0.8, muted: false }

/**
 * На iOS `HTMLMediaElement.volume` — read-only: система отдаёт громкость
 * только физическим кнопкам, присваивание молча игнорируется. Проверяем
 * на пустом элементе (без src он ничего не грузит и не звучит) и,
 * если управления нет, не рисуем контрол вовсе — неработающий ползунок
 * хуже его отсутствия.
 */
export const VOLUME_SUPPORTED = ((): boolean => {
  if (typeof Audio === 'undefined') return false
  try {
    const probe = new Audio()
    probe.volume = 0.5
    return probe.volume === 0.5
  } catch {
    return false
  }
})()

/**
 * Ухо слышит громкость примерно логарифмически, а `el.volume` линеен по
 * амплитуде: на линейной шкале верхняя половина хода почти не слышна,
 * а вся разница набегает у нуля. Квадрат — дешёвое приближение, которое
 * делает ход ползунка равномерным на слух.
 */
export function levelToGain(level: number): number {
  const v = clamp01(level)
  return v * v
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function loadVolume(): VolumeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_VOLUME
    const parsed = JSON.parse(raw) as Partial<VolumeState>
    const level = typeof parsed.level === 'number' ? clamp01(parsed.level) : DEFAULT_VOLUME.level
    return { level, muted: parsed.muted === true }
  } catch {
    // Приватный режим Safari, забитая квота, чужой мусор под тем же
    // ключом — ни один из случаев не повод падать из-за громкости.
    return DEFAULT_VOLUME
  }
}

export function saveVolume(state: VolumeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* нет хранилища — громкость просто не переживёт перезагрузку */
  }
}
