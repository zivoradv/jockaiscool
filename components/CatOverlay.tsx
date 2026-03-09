"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// ── Cat designs (pure CSS/emoji cats) ─────────────────────────────────────
const CAT_COLORS = [
  { body: "#f4a261", stripe: "#e07f3a", name: "Orange" },
  { body: "#a8dadc", stripe: "#6bbfc2", name: "Blue" },
  { body: "#f1c0e8", stripe: "#d98ccc", name: "Pink" },
  { body: "#b7e4c7", stripe: "#74c69d", name: "Green" },
  { body: "#ffd6a5", stripe: "#ffb347", name: "Cream" },
  { body: "#d0bfff", stripe: "#9d7fe0", name: "Lavender" },
]

const MEOWS = [
  "Meow! 🐾",
  "Purrr~ 💕",
  "Mrrrow! ✨",
  "Nyaa~ 🌸",
  "Meoow~ 💫",
  "Prrrr 💖",
  "Mew! 🎀",
  "Heehee~ 😸",
  "Nya nya! 🐟",
  "Purrrfect! 😻",
  "Mrow~ 🌙",
  "Meow meow! 🍓",
  "*blinks slowly* 💛",
  "Feed me! 🐾",
  "U r doing great! ✨",
  "Good luck!! 💕",
  "I'm watching 👀",
  "pet me pls 🥺",
  "Meow meow meow! 🐱",
  "Jocka is so cool! 🥹",
  "Jocka is soooooooo cool! 🥹",
]

// ── Meow sound via Web Audio ───────────────────────────────────────────────
function playMeow(ctx: AudioContext, type: "meow" | "purr" | "chirp") {
  const now = ctx.currentTime

  if (type === "meow") {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.linearRampToValueAtTime(900, now + 0.08)
    osc.frequency.linearRampToValueAtTime(700, now + 0.18)
    osc.frequency.linearRampToValueAtTime(500, now + 0.32)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.18)
    gain.gain.linearRampToValueAtTime(0, now + 0.35)
    osc.start(now)
    osc.stop(now + 0.35)
  } else if (type === "purr") {
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.value = 25 + i * 5
      gain.gain.setValueAtTime(0.04, now + i * 0.1)
      gain.gain.linearRampToValueAtTime(0, now + 0.08 + i * 0.1)
      osc.start(now + i * 0.1)
      osc.stop(now + 0.1 + i * 0.1)
    }
  } else {
    // chirp
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "triangle"
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.linearRampToValueAtTime(800, now + 0.05)
    osc.frequency.setValueAtTime(1400, now + 0.07)
    osc.frequency.linearRampToValueAtTime(900, now + 0.12)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02)
    gain.gain.linearRampToValueAtTime(0, now + 0.14)
    osc.start(now)
    osc.stop(now + 0.14)
  }
}

// ── Types ──────────────────────────────────────────────────────────────────
type Edge = "bottom" | "left" | "right"

interface CatInstance {
  id: number
  edge: Edge
  pos: number // % along the edge
  color: (typeof CAT_COLORS)[number]
  message: string
  soundType: "meow" | "purr" | "chirp"
  phase: "peeking" | "talking" | "leaving"
  flip: boolean
}

let catIdCounter = 0

// ── Main component ─────────────────────────────────────────────────────────
export default function CatOverlay() {
  const [cats, setCats] = useState<CatInstance[]>([])
  const audioRef = useRef<AudioContext | null>(null)
  const timeoutRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  )

  const getAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)()
    }
    if (audioRef.current.state === "suspended") audioRef.current.resume()
    return audioRef.current
  }

  const removeCat = useCallback((id: number) => {
    setCats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, phase: "leaving" } : c))
    )
    setTimeout(() => setCats((prev) => prev.filter((c) => c.id !== id)), 700)
  }, [])

  const spawnCat = useCallback(() => {
    const edges: Edge[] = ["bottom", "bottom", "bottom", "left", "right"]
    const edge = edges[Math.floor(Math.random() * edges.length)]
    const color = CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)]
    const message = MEOWS[Math.floor(Math.random() * MEOWS.length)]
    const sounds: ("meow" | "purr" | "chirp")[] = [
      "meow",
      "meow",
      "purr",
      "chirp",
    ]
    const soundType = sounds[Math.floor(Math.random() * sounds.length)]
    const id = ++catIdCounter
    const pos = 15 + Math.random() * 70
    const flip =
      edge === "right" ? false : edge === "left" ? true : Math.random() > 0.5

    const cat: CatInstance = {
      id,
      edge,
      pos,
      color,
      message,
      soundType,
      phase: "peeking",
      flip,
    }

    setCats((prev) => [...prev.slice(-3), cat]) // max 4 cats

    // Play sound after a short delay
    const t1 = setTimeout(() => {
      try {
        playMeow(getAudio(), soundType)
      } catch {}
    }, 400)

    // Show bubble
    const t2 = setTimeout(() => {
      setCats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, phase: "talking" } : c))
      )
    }, 600)

    // Leave after a while
    const duration = 2800 + Math.random() * 1800
    const t3 = setTimeout(() => removeCat(id), duration)

    timeoutRefs.current.set(id, t3)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [removeCat])

  // Spawn cats on a random interval
  useEffect(() => {
    let mounted = true
    const scheduleNext = () => {
      if (!mounted) return
      const delay = 4000 + Math.random() * 6000
      setTimeout(() => {
        if (mounted) {
          spawnCat()
          scheduleNext()
        }
      }, delay)
    }
    // First cat after 2s
    const first = setTimeout(() => {
      if (mounted) {
        spawnCat()
        scheduleNext()
      }
    }, 2000)
    return () => {
      mounted = false
      clearTimeout(first)
    }
  }, [spawnCat])

  return (
    <>
      <style>{CSS}</style>
      <div className="cat-layer" aria-hidden="true">
        {cats.map((cat) => (
          <CatPeek
            key={cat.id}
            cat={cat}
            onPoke={() => {
              try {
                playMeow(getAudio(), "meow")
              } catch {}
              setCats((prev) =>
                prev.map((c) =>
                  c.id === cat.id
                    ? {
                        ...c,
                        message:
                          MEOWS[Math.floor(Math.random() * MEOWS.length)],
                        phase: "talking",
                      }
                    : c
                )
              )
            }}
          />
        ))}
      </div>
    </>
  )
}

// ── Individual cat ─────────────────────────────────────────────────────────
function CatPeek({ cat, onPoke }: { cat: CatInstance; onPoke: () => void }) {
  const { edge, pos, color, message, phase, flip, id } = cat

  const style: React.CSSProperties = {
    ["--cat-body" as string]: color.body,
    ["--cat-stripe" as string]: color.stripe,
  }

  if (edge === "bottom") {
    style.bottom =
      phase === "leaving" ? "-90px" : phase === "peeking" ? "-40px" : "-10px"
    style.left = `${pos}%`
    style.transform = `translateX(-50%)`
  } else if (edge === "left") {
    style.left =
      phase === "leaving" ? "-90px" : phase === "peeking" ? "-42px" : "-10px"
    style.top = `${pos}%`
    style.transform = `translateY(-50%) rotate(90deg)`
  } else {
    style.right =
      phase === "leaving" ? "-90px" : phase === "peeking" ? "-42px" : "-10px"
    style.top = `${pos}%`
    style.transform = `translateY(-50%) rotate(-90deg)`
  }

  return (
    <div
      className={`cat-wrap cat-wrap-${edge} cat-phase-${phase}`}
      style={style}
      onClick={onPoke}
      title="Poke the cat!"
    >
      {/* Speech bubble — only when talking */}
      {phase === "talking" && (
        <div className={`cat-bubble cat-bubble-${edge}`}>{message}</div>
      )}

      {/* Cat SVG */}
      <div className="cat-body">
        {/* Ears */}
        <div className="cat-ears">
          <div className="cat-ear cat-ear-l">
            <div className="cat-ear-inner" />
          </div>
          <div className="cat-ear cat-ear-r">
            <div className="cat-ear-inner" />
          </div>
        </div>
        {/* Head */}
        <div className="cat-head">
          {/* Eyes */}
          <div className="cat-eyes">
            <div className="cat-eye">
              <div className="cat-pupil" />
            </div>
            <div className="cat-eye">
              <div className="cat-pupil" />
            </div>
          </div>
          {/* Nose + mouth */}
          <div className="cat-nose" />
          <div className="cat-mouth" />
          {/* Whiskers */}
          <div className="cat-whiskers">
            <div className="cat-w cat-w-l1" />
            <div className="cat-w cat-w-l2" />
            <div className="cat-w cat-w-r1" />
            <div className="cat-w cat-w-r2" />
          </div>
          {/* Blush */}
          <div className="cat-blush cat-blush-l" />
          <div className="cat-blush cat-blush-r" />
        </div>
        {/* Paws (peek above edge) */}
        <div className="cat-paws">
          <div className="cat-paw" />
          <div className="cat-paw" />
        </div>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const CSS = `
  .cat-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  }

  /* ── Wrapper ──────────────────────────────────────── */
  .cat-wrap {
    position: absolute;
    pointer-events: auto;
    cursor: pointer;
    transition: all 0.55s cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  /* ── Cat body parts ───────────────────────────────── */
  .cat-body {
    position: relative;
    width: 72px;
    animation: catWiggle 2s ease-in-out infinite;
  }
  @keyframes catWiggle {
    0%,100% { transform: rotate(-2deg); }
    50%      { transform: rotate(2deg); }
  }
  .cat-phase-talking .cat-body {
    animation: catBob 0.8s ease-in-out infinite;
  }
  @keyframes catBob {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-4px); }
  }

  /* Ears */
  .cat-ears {
    display: flex;
    justify-content: space-between;
    padding: 0 6px;
    position: relative;
    z-index: 2;
  }
  .cat-ear {
  width: 24px;
  height: 28px;
  background: var(--cat-body);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
}
  .cat-ear-inner {
    width: 10px; height: 10px;
    background: var(--cat-stripe);
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    opacity: 0.6;
  }

  /* Head */
  .cat-head {
  width: 72px;
  height: 60px;
  background: var(--cat-body);
  border-radius: 48% 48% 42% 42%;
  margin-top: -12px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 -5px 10px rgba(0,0,0,0.08);
}
.cat-head::after {
  content: '';
  position: absolute;
  bottom: 12px;
  width: 28px;
  height: 16px;
  background: rgba(255,255,255,0.25);
  border-radius: 50%;
  opacity: 0.25;
}
  /* Stripes */
  .cat-head::before {
    content: '';
    position: absolute;
    top: 8px; left: 50%; transform: translateX(-50%);
    width: 28px; height: 3px;
    background: var(--cat-stripe);
    border-radius: 2px;
    opacity: 0.45;
    box-shadow: 0 6px 0 var(--cat-stripe);
  }

  /* Eyes */
  .cat-eyes {
    display: flex;
    gap: 12px;
    margin-bottom: 5px;
  }
  .cat-eye {
    width: 14px; height: 14px;
    background: white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    animation: catBlink 4s ease-in-out infinite;
  }
  @keyframes catBlink {
    0%,90%,100% { transform: scaleY(1); }
    95%          { transform: scaleY(0.1); }
  }
  .cat-pupil {
    width: 7px; height: 9px;
    background: #1a0a2e;
    border-radius: 50%;
  }
  .cat-phase-talking .cat-pupil {
    animation: catPupilHeart 0.5s ease;
  }

  /* Nose */
  .cat-nose {
    width: 8px; height: 6px;
    background: var(--cat-stripe);
    border-radius: 50% 50% 40% 40%;
    margin-bottom: 2px;
    opacity: 0.8;
  }

  /* Mouth */
  .cat-mouth {
    width: 14px; height: 6px;
    border-bottom: 2px solid var(--cat-stripe);
    border-left: 2px solid var(--cat-stripe);
    border-right: 2px solid var(--cat-stripe);
    border-radius: 0 0 8px 8px;
    opacity: 0.6;
    margin-top: 1px;
  }

  /* Whiskers */
  .cat-whiskers {
    position: absolute;
    top: 50%; left: 0; right: 0;
    transform: translateY(-2px);
  }
  .cat-w {
    position: absolute;
    height: 1.5px;
    background: rgba(255,255,255,0.6);
    border-radius: 1px;
  }
  .cat-w-l1 { width: 22px; left: 2px;  top: -5px; transform: rotate(-8deg); }
  .cat-w-l2 { width: 22px; left: 2px;  top:  2px; transform: rotate( 5deg); }
  .cat-w-r1 { width: 22px; right: 2px; top: -5px; transform: rotate( 8deg); }
  .cat-w-r2 { width: 22px; right: 2px; top:  2px; transform: rotate(-5deg); }

  /* Blush */
  .cat-blush {
    position: absolute;
    bottom: 14px;
    width: 14px; height: 8px;
    background: rgba(255,150,150,0.35);
    border-radius: 50%;
  }
  .cat-blush-l { left: 6px; }
  .cat-blush-r { right: 6px; }

  /* Paws */
  .cat-paws {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: -4px;
    position: relative;
    z-index: 3;
  }
  .cat-paw {
    width: 20px; height: 14px;
    background: var(--cat-body);
    border-radius: 50% 50% 40% 40%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    position: relative;
  }
  .cat-paw::before, .cat-paw::after {
    content: '';
    position: absolute;
    bottom: 2px;
    width: 4px; height: 4px;
    background: rgba(255,255,255,0.4);
    border-radius: 50%;
  }
  .cat-paw::before { left: 4px; }
  .cat-paw::after  { right: 4px; }

  /* ── Speech bubble ────────────────────────────────── */
  .cat-bubble {
    position: absolute;
    background: white;
    color: #333;
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.3;
    padding: 8px 12px;
    border-radius: 14px;
    white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    pointer-events: none;
    animation: bubblePop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
    z-index: 10;
  }
  @keyframes bubblePop {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* Bubble arrow & position per edge */
  .cat-bubble-bottom {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) !important;
    margin-bottom: 10px;
  }
  .cat-bubble-bottom::after {
    content: '';
    position: absolute;
    top: 100%; left: 50%; transform: translateX(-50%);
    border: 7px solid transparent;
    border-top-color: white;
  }

  .cat-bubble-left {
    left: 100%;
    top: 50%;
    transform: translateY(-50%) rotate(-90deg) !important;
    margin-left: 10px;
  }
  .cat-bubble-right {
    right: 100%;
    top: 50%;
    transform: translateY(-50%) rotate(90deg) !important;
    margin-right: 10px;
  }

  /* ── Hover: bounce ───────────────────────────────── */
  .cat-wrap:hover .cat-body {
    animation: catJump 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes catJump {
    0%   { transform: translateY(0) scale(1); }
    40%  { transform: translateY(-12px) scale(1.05); }
    100% { transform: translateY(0) scale(1); }
  }

  /* ── Heart particles on click ────────────────────── */
  .cat-wrap:active::after {
    content: '💕';
    position: absolute;
    top: -20px; left: 50%;
    transform: translateX(-50%);
    font-size: 1.2rem;
    animation: heartFloat 0.8s ease forwards;
    pointer-events: none;
  }
  @keyframes heartFloat {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to   { opacity: 0; transform: translateX(-50%) translateY(-40px); }
  }
`
