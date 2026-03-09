"use client"

import { useState } from "react"
import type { GameType } from "@/types/game"
import Hub from "@/components/Hub"
import WordRace from "@/components/WordRace"
import Wordle from "@/components/Wordle"
import CardBattle from "@/components/CardBattle"

// Stable player ID for the session
const SESSION_PID =
  "p" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)

export default function Page() {
  const [game, setGame] = useState<GameType | null>(null)

  if (!game) return <Hub onSelect={setGame} />

  const goBack = () => setGame(null)

  console.log(game)

  if (game === "word-race")
    return <WordRace pid={SESSION_PID} onBack={goBack} />
  if (game === "wordle") return <Wordle pid={SESSION_PID} onBack={goBack} />
  if (game === "card-battle")
    return <CardBattle pid={SESSION_PID} onBack={goBack} />

  return null
}
