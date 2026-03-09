"use client"

import { useState, useEffect, useRef } from "react"
import { ref, set, get, onValue, off } from "firebase/database"
import { db } from "@/lib/firebase"
import { Stars, GameLanding, Lobby } from "./Shared"
import type {
  Card,
  CardEffect,
  CardBattleRoom,
  CardBattleHand,
} from "@/types/game"

// ── Deck definition ────────────────────────────────────────────────────────
interface CardTemplate {
  name: string
  attack: number
  effect: CardEffect
  emoji: string
  color: string
  description: string
  count: number
}

const TEMPLATES: CardTemplate[] = [
  {
    name: "Strike",
    attack: 3,
    effect: "none",
    emoji: "⚔️",
    color: "#5e81f4",
    description: "Deal 3 damage.",
    count: 5,
  },
  {
    name: "Heavy Blow",
    attack: 5,
    effect: "none",
    emoji: "🔨",
    color: "#7c3aed",
    description: "Deal 5 damage.",
    count: 3,
  },
  {
    name: "Quick Jab",
    attack: 1,
    effect: "none",
    emoji: "👊",
    color: "#94a3b8",
    description: "Deal 1 damage.",
    count: 4,
  },
  {
    name: "Power Slash",
    attack: 6,
    effect: "none",
    emoji: "🗡️",
    color: "#c026d3",
    description: "Deal 6 damage.",
    count: 2,
  },
  {
    name: "Fireball",
    attack: 8,
    effect: "none",
    emoji: "🔥",
    color: "#ff6b35",
    description: "Deal 8 damage. Risky!",
    count: 1,
  },
  {
    name: "Heal",
    attack: 0,
    effect: "heal",
    emoji: "💚",
    color: "#22c55e",
    description: "Restore 5 HP (max 20).",
    count: 4,
  },
  {
    name: "Shield",
    attack: 0,
    effect: "shield",
    emoji: "🛡️",
    color: "#38bdf8",
    description: "Block the next attack completely.",
    count: 3,
  },
  {
    name: "Poison Dart",
    attack: 2,
    effect: "poison",
    emoji: "☠️",
    color: "#84cc16",
    description: "2 damage + 2 poison each turn.",
    count: 3,
  },
  {
    name: "Drain",
    attack: 3,
    effect: "drain",
    emoji: "🩸",
    color: "#fb7185",
    description: "Deal 3 damage, heal yourself 2.",
    count: 3,
  },
  {
    name: "Double Hit",
    attack: 2,
    effect: "double",
    emoji: "⚡",
    color: "#ffd166",
    description: "Deal 2 damage twice (4 total).",
    count: 2,
  },
]

const MAX_HP = 20
const HAND_SIZE = 5

function buildDeck(): Card[] {
  const cards: Card[] = []
  TEMPLATES.forEach((t) => {
    for (let i = 0; i < t.count; i++) {
      cards.push({
        id: Math.random().toString(36).substr(2, 8),
        name: t.name,
        attack: t.attack,
        effect: t.effect,
        emoji: t.emoji,
        color: t.color,
        description: t.description,
      })
    }
  })
  // shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

// Firebase refs
const roomRef = (c: string) => ref(db, `cb-rooms/${c}`)
const handRef = (c: string, pid: string) => ref(db, `cb-hands/${c}/${pid}`)

interface Props {
  pid: string
  onBack: () => void
}

export default function CardBattle({ pid, onBack }: Props) {
  const [screen, setScreen] = useState<
    "landing" | "lobby" | "playing" | "gameover"
  >("landing")
  const [myName, setMyName] = useState("")
  const [code, setCode] = useState("")
  const [room, setRoom] = useState<CardBattleRoom | null>(null)
  const [myHand, setMyHand] = useState<Card[]>([])
  const [myDeck, setMyDeck] = useState<Card[]>([])
  const [playingCard, setPlayingCard] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastLog, setLastLog] = useState<string[]>([])
  const [poisonAnim, setPoisonAnim] = useState(false)

  const codeRef = useRef(code)
  const roomRef2 = useRef<CardBattleRoom | null>(null)
  codeRef.current = code
  roomRef2.current = room

  // ── Listen to room ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) return
    const r = roomRef(code)
    const unsub = onValue(r, (snap) => {
      if (!snap.exists()) return
      const data = snap.val() as CardBattleRoom
      setRoom((prev) => {
        // detect poison applied
        if (prev && data.hp[pid] < prev.hp[pid] && data.turn === pid) {
          setPoisonAnim(true)
          setTimeout(() => setPoisonAnim(false), 800)
        }
        return data
      })
      roomRef2.current = data
      if (data.status === "playing" && screen === "lobby") setScreen("playing")
      if (data.status === "gameover") setScreen("gameover")
    })
    return () => off(r)
  }, [code, screen, pid])

  // ── Listen to my hand ────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) return
    const h = handRef(code, pid)
    const unsub = onValue(h, (snap) => {
      if (!snap.exists()) return
      const data = snap.val() as CardBattleHand
      setMyHand(data.hand ?? [])
      setMyDeck(data.deck ?? [])
    })
    return () => off(h)
  }, [code])

  // ── Create room ──────────────────────────────────────────────────────────
  const createRoom = async () => {
    if (!myName.trim() || !code.trim()) {
      setError("Enter your name and room code!")
      return
    }
    setLoading(true)
    setError("")
    const c = code.toUpperCase().trim()
    const deck = buildDeck()
    const hand = deck.splice(0, HAND_SIZE)
    const r: CardBattleRoom = {
      host: pid,
      players: [{ id: pid, name: myName.trim() }],
      status: "lobby",
      turn: pid,
      hp: { [pid]: MAX_HP },
      shields: { [pid]: false },
      poison: { [pid]: 0 },
      lastPlayed: null,
      winner: null,
      handSizes: { [pid]: HAND_SIZE },
      totalCards: deck.length,
    }
    await set(roomRef(c), r)
    await set(handRef(c, pid), { hand, deck })
    setCode(c)
    setRoom(r)
    setMyHand(hand)
    setMyDeck(deck)
    setScreen("lobby")
    setLoading(false)
  }

  // ── Join room ────────────────────────────────────────────────────────────
  const joinRoom = async () => {
    if (!myName.trim() || !code.trim()) {
      setError("Enter your name and room code!")
      return
    }
    setLoading(true)
    setError("")
    const c = code.toUpperCase().trim()
    const snap = await get(roomRef(c))
    if (!snap.exists()) {
      setError("Room not found!")
      setLoading(false)
      return
    }
    const r = snap.val() as CardBattleRoom
    if (r.players.length >= 2) {
      setError("Room is full!")
      setLoading(false)
      return
    }
    const deck = buildDeck()
    const hand = deck.splice(0, HAND_SIZE)
    const updated: CardBattleRoom = {
      ...r,
      players: [...r.players, { id: pid, name: myName.trim() }],
      hp: { ...r.hp, [pid]: MAX_HP },
      shields: { ...r.shields, [pid]: false },
      poison: { ...r.poison, [pid]: 0 },
      handSizes: { ...r.handSizes, [pid]: HAND_SIZE },
      status: "playing",
    }
    await set(roomRef(c), updated)
    await set(handRef(c, pid), { hand, deck })
    setCode(c)
    setRoom(updated)
    setMyHand(hand)
    setMyDeck(deck)
    setScreen("playing")
    setLoading(false)
  }

  // ── Play a card ──────────────────────────────────────────────────────────
  const playCard = async (card: Card) => {
    const r = roomRef2.current
    if (!r || r.turn !== pid || r.status !== "playing") return
    setPlayingCard(card.id)

    const c = codeRef.current
    const other = r.players.find((p) => p.id !== pid)
    if (!other) return

    let newHp = { ...r.hp }
    let newShields = { ...r.shields }
    let newPoison = { ...r.poison }
    const logLines: string[] = []

    // 1. Apply poison to self (start of my turn)
    if ((newPoison[pid] ?? 0) > 0) {
      newHp[pid] = Math.max(0, newHp[pid] - 2)
      newPoison[pid] = Math.max(0, newPoison[pid] - 1)
      logLines.push(`☠️ You take 2 poison damage!`)
    }

    // 2. Resolve card
    let dmg = card.attack
    if (card.effect === "double") dmg *= 2

    if (dmg > 0) {
      if (newShields[other.id]) {
        newShields[other.id] = false
        logLines.push(`🛡️ ${other.name}'s shield blocked ${dmg} damage!`)
      } else {
        newHp[other.id] = Math.max(0, newHp[other.id] - dmg)
        logLines.push(`${card.emoji} You dealt ${dmg} damage to ${other.name}!`)
      }
    }

    if (card.effect === "heal") {
      const restored = Math.min(5, MAX_HP - newHp[pid])
      newHp[pid] = Math.min(MAX_HP, newHp[pid] + 5)
      logLines.push(`💚 You healed ${restored} HP!`)
    }
    if (card.effect === "shield") {
      newShields[pid] = true
      logLines.push(`🛡️ You raised a shield!`)
    }
    if (card.effect === "poison") {
      newPoison[other.id] = (newPoison[other.id] ?? 0) + 2
      logLines.push(`☠️ ${other.name} is poisoned for 2 turns!`)
    }
    if (card.effect === "drain") {
      const healed = Math.min(2, MAX_HP - newHp[pid])
      newHp[pid] = Math.min(MAX_HP, newHp[pid] + 2)
      logLines.push(`🩸 Drained! Healed ${healed} HP.`)
    }

    setLastLog(logLines)

    // 3. Draw a card
    const newHand = myHand.filter((c2) => c2.id !== card.id)
    const newDeck = [...myDeck]
    if (newDeck.length > 0) newHand.push(newDeck.shift()!)
    setMyHand(newHand)
    setMyDeck(newDeck)
    await set(handRef(c, pid), { hand: newHand, deck: newDeck })

    // 4. Check win
    const winner =
      newHp[other.id] <= 0 ? pid : newHp[pid] <= 0 ? other.id : null

    await set(roomRef(c), {
      ...r,
      hp: newHp,
      shields: newShields,
      poison: newPoison,
      lastPlayed: { pid, card },
      handSizes: { ...r.handSizes, [pid]: newHand.length },
      turn: other.id,
      winner,
      status: winner ? "gameover" : "playing",
    })

    setTimeout(() => setPlayingCard(null), 400)
  }

  const playAgain = async () => {
    const r = roomRef2.current
    if (!r) return
    const c = codeRef.current
    // Each player rebuilds their own deck/hand
    const deck = buildDeck()
    const hand = deck.splice(0, HAND_SIZE)
    await set(handRef(c, pid), { hand, deck })
    setMyHand(hand)
    setMyDeck(deck)
    if (r.host === pid) {
      const other = r.players.find((p) => p.id !== pid)
      const hp: Record<string, number> = {}
      const shields: Record<string, boolean> = {}
      const poison: Record<string, number> = {}
      r.players.forEach((p) => {
        hp[p.id] = MAX_HP
        shields[p.id] = false
        poison[p.id] = 0
      })
      await set(roomRef(c), {
        ...r,
        hp,
        shields,
        poison,
        status: "playing",
        turn: r.host,
        lastPlayed: null,
        winner: null,
        handSizes: { ...r.handSizes, [pid]: HAND_SIZE },
      })
    }
    setScreen("playing")
  }

  const me = room?.players.find((p) => p.id === pid)
  const them = room?.players.find((p) => p.id !== pid)
  const isHost = room?.host === pid
  const myHp = room?.hp[pid] ?? MAX_HP
  const themHp = them ? room?.hp[them.id] ?? MAX_HP : MAX_HP
  const isMyTurn = room?.turn === pid
  const iWon = room?.winner === pid

  return (
    <>
      <style>{CSS}</style>
      <div className="gn-app">
        <Stars color1="#ff6b35" color2="#b490ff" />

        {screen === "landing" && (
          <GameLanding
            gameName="Card Battle"
            gameEmoji="⚔️"
            myName={myName}
            code={code}
            error={error}
            loading={loading}
            onNameChange={setMyName}
            onCodeChange={setCode}
            onCreate={createRoom}
            onJoin={joinRoom}
            onBack={onBack}
          />
        )}

        {screen === "lobby" && me && (
          <Lobby code={code} me={me} them={them} onBack={onBack} />
        )}

        {screen === "playing" && (
          <div className="gn-content">
            <button className="gn-btn gn-btn-ghost" onClick={onBack}>
              ← Hub
            </button>

            {/* HP bars */}
            <div className="cb-hp-section">
              {/* Opponent */}
              <div className="cb-player-row">
                <div className="cb-avatar cb-avatar-them">
                  {them?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="cb-player-info">
                  <div className="cb-player-name">
                    {them?.name ?? "Partner"}
                    {room?.shields[them?.id ?? ""] && (
                      <span className="cb-shield-badge">🛡️</span>
                    )}
                    {(room?.poison[them?.id ?? ""] ?? 0) > 0 && (
                      <span className="cb-poison-badge">
                        ☠️ ×{room?.poison[them?.id ?? ""]}
                      </span>
                    )}
                  </div>
                  <HpBar hp={themHp} maxHp={MAX_HP} color="#5ee7ff" />
                  <div className="cb-hp-text">
                    {themHp} / {MAX_HP} HP ·{" "}
                    {room?.handSizes[them?.id ?? ""] ?? 0} cards
                  </div>
                </div>
              </div>

              {/* Last played */}
              <div className="cb-arena">
                {room?.lastPlayed ? (
                  <div className="cb-last-played">
                    <div className="cb-last-label">
                      {room.lastPlayed.pid === pid
                        ? "You played"
                        : `${them?.name} played`}
                    </div>
                    <div
                      className="cb-mini-card"
                      style={{
                        borderColor: room.lastPlayed.card.color,
                        boxShadow: `0 0 18px ${room.lastPlayed.card.color}40`,
                      }}
                    >
                      <span className="cb-mini-emoji">
                        {room.lastPlayed.card.emoji}
                      </span>
                      <span className="cb-mini-name">
                        {room.lastPlayed.card.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="cb-arena-empty">⚔️ Game Start!</div>
                )}
                <div
                  className={`cb-turn-badge ${
                    isMyTurn ? "cb-your-turn" : "cb-their-turn"
                  }`}
                >
                  {isMyTurn ? "Your Turn!" : `${them?.name}'s Turn`}
                </div>
              </div>

              {/* Me */}
              <div className="cb-player-row cb-player-row-me">
                <div className="cb-avatar cb-avatar-me">
                  {me?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="cb-player-info">
                  <div className="cb-player-name">
                    You
                    {room?.shields[pid] && (
                      <span className="cb-shield-badge">🛡️</span>
                    )}
                    {(room?.poison[pid] ?? 0) > 0 && (
                      <span
                        className={`cb-poison-badge ${
                          poisonAnim ? "cb-poison-anim" : ""
                        }`}
                      >
                        ☠️ ×{room?.poison[pid]}
                      </span>
                    )}
                  </div>
                  <HpBar hp={myHp} maxHp={MAX_HP} color="#ff6eb4" />
                  <div className="cb-hp-text">
                    {myHp} / {MAX_HP} HP · {myHand.length} cards ·{" "}
                    {myDeck.length} in deck
                  </div>
                </div>
              </div>
            </div>

            {/* Combat log */}
            {lastLog.length > 0 && (
              <div className="cb-log">
                {lastLog.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}

            {/* Hand */}
            <div className="cb-hand-label">
              {isMyTurn
                ? "Your Hand — Pick a card to play"
                : `Waiting for ${them?.name ?? "partner"}…`}
            </div>
            <div className="cb-hand">
              {myHand.map((card) => (
                <button
                  key={card.id}
                  className={`cb-card ${
                    isMyTurn ? "cb-card-active" : "cb-card-disabled"
                  } ${playingCard === card.id ? "cb-card-playing" : ""}`}
                  style={{ "--card-color": card.color } as React.CSSProperties}
                  disabled={!isMyTurn || !!playingCard}
                  onClick={() => playCard(card)}
                >
                  <span className="cb-card-emoji">{card.emoji}</span>
                  <span className="cb-card-name">{card.name}</span>
                  {card.attack > 0 && (
                    <span className="cb-card-atk">
                      ⚔️{" "}
                      {card.effect === "double" ? card.attack * 2 : card.attack}
                    </span>
                  )}
                  <span className="cb-card-desc">{card.description}</span>
                </button>
              ))}
              {myHand.length === 0 && (
                <div className="cb-empty-hand">🃏 No cards left!</div>
              )}
            </div>
          </div>
        )}

        {screen === "gameover" && (
          <div className="gn-content">
            <div className="gn-card" style={{ alignItems: "center" }}>
              <span className="gn-result-emoji">{iWon ? "🏆" : "💀"}</span>
              <div
                className="gn-result-title"
                style={{ color: iWon ? "var(--gold)" : "var(--red)" }}
              >
                {iWon ? "Victory!" : "Defeated!"}
              </div>
              <p
                className="gn-small gn-muted gn-center"
                style={{ marginBottom: 16 }}
              >
                {iWon
                  ? `You destroyed ${them?.name}!`
                  : `${
                      room?.players.find((p) => p.id === room?.winner)?.name
                    } wins this time!`}
              </p>
              {/* Final HP */}
              <div className="cb-final-hp">
                <div className="cb-final-hp-card">
                  <div className="cb-final-hp-name">You</div>
                  <div
                    className="cb-final-hp-val"
                    style={{ color: "var(--pink)" }}
                  >
                    {myHp} HP
                  </div>
                </div>
                <div className="cb-final-hp-card">
                  <div className="cb-final-hp-name">{them?.name}</div>
                  <div
                    className="cb-final-hp-val"
                    style={{ color: "var(--cyan)" }}
                  >
                    {themHp} HP
                  </div>
                </div>
              </div>
              <button
                className="gn-btn gn-btn-primary"
                style={{ width: "100%" }}
                onClick={playAgain}
              >
                🔁 Play Again
              </button>
              <button className="gn-btn gn-btn-ghost" onClick={onBack}>
                ← Back to Hub
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── HP Bar ─────────────────────────────────────────────────────────────────
function HpBar({
  hp,
  maxHp,
  color,
}: {
  hp: number
  maxHp: number
  color: string
}) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const barColor = pct > 50 ? color : pct > 25 ? "#ffd166" : "#ff4757"
  return (
    <div className="cb-hp-bar-bg">
      <div
        className="cb-hp-bar-fill"
        style={{
          width: `${pct}%`,
          background: barColor,
          boxShadow: `0 0 10px ${barColor}80`,
        }}
      />
    </div>
  )
}

const CSS = `
  .cb-hp-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 22px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cb-player-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cb-avatar {
    width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Righteous', cursive; font-size: 1.1rem;
  }
  .cb-avatar-me   { background: linear-gradient(135deg, var(--pink), var(--purple)); }
  .cb-avatar-them { background: linear-gradient(135deg, var(--cyan), #0080cc); color: #001122; }

  .cb-player-info { flex: 1; }
  .cb-player-name {
    font-size: 0.82rem; font-weight: 700; color: var(--text);
    display: flex; align-items: center; gap: 6px; margin-bottom: 5px;
  }
  .cb-shield-badge { font-size: 0.9rem; }
  .cb-poison-badge { font-size: 0.75rem; color: #84cc16; font-weight: 700; }
  .cb-poison-anim  { animation: cbPoison 0.5s ease; }
  @keyframes cbPoison { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }

  .cb-hp-bar-bg {
    height: 10px; border-radius: 100px;
    background: rgba(255,255,255,0.08); overflow: hidden;
  }
  .cb-hp-bar-fill {
    height: 100%; border-radius: 100px;
    transition: width 0.4s ease, background 0.4s ease;
  }
  .cb-hp-text { font-size: 0.7rem; color: var(--muted); margin-top: 3px; }

  .cb-arena {
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
    padding: 10px 0; margin: 2px 0;
  }

  .cb-last-played { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
  .cb-last-label { font-size: 0.7rem; color: var(--muted); }
  .cb-mini-card {
    display: flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.06); border: 1.5px solid;
    border-radius: 10px; padding: 6px 12px;
  }
  .cb-mini-emoji { font-size: 1.1rem; }
  .cb-mini-name  { font-size: 0.8rem; font-weight: 700; color: var(--text); }

  .cb-arena-empty { font-size: 1.4rem; color: var(--muted); }

  .cb-turn-badge {
    font-size: 0.78rem; font-weight: 800; border-radius: 100px; padding: 5px 14px;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .cb-your-turn  { background: rgba(255,209,102,0.15); color: var(--gold); border: 1px solid rgba(255,209,102,0.3); animation: cbPulse 1.5s ease-in-out infinite; }
  .cb-their-turn { background: rgba(255,255,255,0.06); color: var(--muted); }
  @keyframes cbPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

  .cb-log {
    background: rgba(0,0,0,0.3); border: 1px solid var(--border);
    border-radius: 12px; padding: 10px 14px; margin-bottom: 10px;
    font-size: 0.78rem; color: var(--muted);
    display: flex; flex-direction: column; gap: 3px;
    animation: gnFadeUp 0.3s ease both;
  }

  .cb-hand-label { font-size: 0.78rem; color: var(--muted); font-weight: 600; margin-bottom: 8px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }

  .cb-hand {
    display: flex; gap: 8px; overflow-x: auto;
    padding-bottom: 8px; justify-content: center;
    flex-wrap: wrap;
  }

  .cb-card {
    flex-shrink: 0;
    width: 90px;
    background: rgba(255,255,255,0.05);
    border: 2px solid var(--card-color, var(--border));
    border-radius: 14px;
    padding: 12px 8px;
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    transition: all 0.2s;
    cursor: pointer;
    box-shadow: 0 0 12px color-mix(in srgb, var(--card-color, transparent) 20%, transparent);
    position: relative;
    overflow: hidden;
  }
  .cb-card::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--card-color, transparent) 25%, transparent), transparent 70%);
    pointer-events: none;
  }
  .cb-card-active:hover {
    transform: translateY(-8px) scale(1.04);
    box-shadow: 0 12px 28px color-mix(in srgb, var(--card-color, transparent) 40%, transparent);
  }
  .cb-card-disabled { opacity: 0.55; cursor: not-allowed; }
  .cb-card-playing  { animation: cbPlay 0.35s ease; }
  @keyframes cbPlay {
    0%   { transform: translateY(0) scale(1); }
    40%  { transform: translateY(-20px) scale(1.1); }
    100% { transform: translateY(0) scale(1); }
  }

  .cb-card-emoji { font-size: 1.8rem; }
  .cb-card-name  { font-size: 0.7rem; font-weight: 800; color: var(--text); text-align: center; line-height: 1.2; }
  .cb-card-atk   { font-size: 0.72rem; font-weight: 700; color: var(--card-color, var(--text)); }
  .cb-card-desc  { font-size: 0.62rem; color: var(--muted); text-align: center; line-height: 1.3; }

  .cb-empty-hand { color: var(--muted); font-size: 0.88rem; text-align: center; width: 100%; padding: 20px 0; }

  .cb-final-hp { display: flex; gap: 12px; margin: 12px 0 16px; width: 100%; }
  .cb-final-hp-card {
    flex: 1; text-align: center; background: rgba(255,255,255,0.04);
    border: 1px solid var(--border); border-radius: 16px; padding: 16px;
  }
  .cb-final-hp-name { font-size: 0.72rem; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .cb-final-hp-val  { font-family: 'Righteous', cursive; font-size: 2rem; }
`
