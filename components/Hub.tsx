"use client"

import type { GameType } from "@/types/game"

interface HubProps {
  onSelect: (game: GameType) => void
}

const GAMES: {
  type: GameType
  emoji: string
  title: string
  desc: string
  accent: string
  glow: string
}[] = [
  {
    type: "word-race",
    emoji: "💨",
    title: "Word Race",
    desc: "Both see the same scrambled word — fastest to unscramble wins!",
    accent: "#5ee7ff",
    glow: "rgba(94,231,255,0.2)",
  },
  {
    type: "wordle",
    emoji: "🟩",
    title: "Wordle 1v1",
    desc: "Guess the hidden 5-letter word in 6 tries. First to crack it wins!",
    accent: "#6bff8e",
    glow: "rgba(107,255,142,0.2)",
  },
  {
    type: "card-battle",
    emoji: "⚔️",
    title: "Card Battle",
    desc: "Take turns playing cards — attack, heal, shield. First to 0 HP loses!",
    accent: "#ff6b35",
    glow: "rgba(255,107,53,0.2)",
  },
]

export default function Hub({ onSelect }: HubProps) {
  return (
    <>
      <style>{CSS}</style>
      <div className="gn-app">
        <Background />
        <div className="gn-content">
          <div className="hub-title">JOCKA IS SO COOL</div>
          <div className="gn-tagline">Luv you 🥹</div>
          <div className="gn-tagline">PICK A GAME ZLOCO</div>

          <div className="hub-games">
            {GAMES.map((g) => (
              <button
                key={g.type}
                className="hub-game-card"
                style={
                  {
                    "--accent": g.accent,
                    "--glow": g.glow,
                  } as React.CSSProperties
                }
                onClick={() => onSelect(g.type)}
              >
                <span className="hub-game-emoji">{g.emoji}</span>
                <div className="hub-game-info">
                  <div className="hub-game-title">{g.title}</div>
                  <div className="hub-game-desc">{g.desc}</div>
                </div>
                <span className="hub-arrow">→</span>
              </button>
            ))}
          </div>

          <p className="gn-hint" style={{ marginTop: 24 }}>
            created by your bf hehe
          </p>
        </div>
      </div>
    </>
  )
}

function Background() {
  const stars = Array.from({ length: 55 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    dur: (Math.random() * 3 + 2).toFixed(1),
    delay: (Math.random() * 4).toFixed(1),
    minOp: (Math.random() * 0.08 + 0.04).toFixed(2),
    maxOp: (Math.random() * 0.5 + 0.3).toFixed(2),
  }))
  return (
    <div className="gn-stars">
      {stars.map((s) => (
        <div
          key={s.id}
          className="gn-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            ["--dur" as string]: `${s.dur}s`,
            ["--delay" as string]: `-${s.delay}s`,
            ["--min-op" as string]: s.minOp,
            ["--max-op" as string]: s.maxOp,
          }}
        />
      ))}
      <div
        className="gn-orb"
        style={{
          width: 500,
          height: 500,
          background: "#ff6eb4",
          left: -150,
          top: -150,
        }}
      />
      <div
        className="gn-orb"
        style={{
          width: 400,
          height: 400,
          background: "#5ee7ff",
          right: -120,
          bottom: -120,
        }}
      />
      <div
        className="gn-orb"
        style={{
          width: 300,
          height: 300,
          background: "#b490ff",
          right: "30%",
          top: "40%",
        }}
      />
    </div>
  )
}

const CSS = `
  .hub-title {
    font-family: 'Righteous', cursive;
    font-size: 3.2rem;
    text-align: center;
    background: linear-gradient(135deg, #ff6eb4, #b490ff, #5ee7ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
    margin-bottom: 8px;
    animation: gnFadeUp 0.5s ease both;
  }

  .hub-games {
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: gnFadeUp 0.55s ease both;
  }

  .hub-game-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 22px;
    padding: 20px 22px;
    cursor: pointer;
    transition: all 0.25s;
    text-align: left;
    backdrop-filter: blur(16px);
    position: relative;
    overflow: hidden;
  }
  .hub-game-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--glow);
    opacity: 0;
    transition: opacity 0.25s;
    border-radius: inherit;
  }
  .hub-game-card:hover::before { opacity: 1; }
  .hub-game-card:hover {
    border-color: var(--accent);
    transform: translateY(-3px);
    box-shadow: 0 8px 30px var(--glow);
  }
  .hub-game-card:active { transform: translateY(-1px); }

  .hub-game-emoji {
    font-size: 2.4rem;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .hub-game-info {
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .hub-game-title {
    font-family: 'Righteous', cursive;
    font-size: 1.2rem;
    color: var(--accent);
    margin-bottom: 4px;
  }

  .hub-game-desc {
    font-size: 0.82rem;
    color: var(--muted);
    line-height: 1.45;
  }

  .hub-arrow {
    font-size: 1.4rem;
    color: var(--accent);
    opacity: 0;
    transform: translateX(-6px);
    transition: all 0.2s;
    position: relative;
    z-index: 1;
  }
  .hub-game-card:hover .hub-arrow {
    opacity: 1;
    transform: translateX(0);
  }
`
