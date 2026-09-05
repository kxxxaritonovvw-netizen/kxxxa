export type Track = {
  title: string
  artist: string
  src: string
  /** Дефолтная обложка. Пользователь может заменить своей — см. Player. */
  artwork: string
}

export const TRACK: Track = {
  title: 'Базовый минимум',
  artist: 'SABI, MIA BOYKA',
  src: '/tracks/track.mp3',
  artwork: '/tracks/cover.svg',
}
