import { useState } from 'react'
import { Player } from './Player'
import { Specimen } from './Specimen'

export function App() {
  const [showSpecimen, setShowSpecimen] = useState(false)
  return showSpecimen ? (
    <Specimen onBack={() => setShowSpecimen(false)} />
  ) : (
    <Player onOpenSpecimen={() => setShowSpecimen(true)} />
  )
}
