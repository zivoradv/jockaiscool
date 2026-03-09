"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// ─────────────────────────────────────────────────────────────────
// 🐾 PAW CURSOR
// ─────────────────────────────────────────────────────────────────
function PawCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [clicking, setClick] = useState(false)
  const [trail, setTrail] = useState<
    { id: number; x: number; y: number; angle: number }[]
  >([])
  const lastPosRef = useRef({ x: -100, y: -100 })
  const trailId = useRef(0)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
      const dx = e.clientX - lastPosRef.current.x
      const dy = e.clientY - lastPosRef.current.y
      const dist = Math.hypot(dx, dy)
      if (dist > 28) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
        const id = ++trailId.current
        setTrail((prev) => [
          ...prev.slice(-7),
          { id, x: e.clientX, y: e.clientY, angle },
        ])
        setTimeout(
          () => setTrail((prev) => prev.filter((t) => t.id !== id)),
          700
        )
        lastPosRef.current = { x: e.clientX, y: e.clientY }
      }
    }
    const down = () => setClick(true)
    const up = () => setClick(false)
    window.addEventListener("mousemove", move)
    window.addEventListener("mousedown", down)
    window.addEventListener("mouseup", up)
    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mousedown", down)
      window.removeEventListener("mouseup", up)
    }
  }, [])

  return (
    <>
      <style>{`
        * { cursor: none !important; }
        .paw-cursor {
          position: fixed;
          pointer-events: none;
          z-index: 99999;
          width: 36px; height: 36px;
          transform: translate(-4px, -4px) ${
            clicking ? "scale(0.82)" : "scale(1)"
          };
          transition: transform 0.1s ease;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        }
        .paw-trail {
          position: fixed;
          pointer-events: none;
          z-index: 99998;
          width: 18px; height: 18px;
          opacity: 0;
          transform: translate(-50%, -50%);
          animation: trailFade 0.7s ease forwards;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
        }
        @keyframes trailFade {
          0%   { opacity: 0.65; transform: translate(-50%,-50%) scale(0.9); }
          100% { opacity: 0;    transform: translate(-50%,-50%) scale(0.5); }
        }
      `}</style>

      {/* Trail paws */}
      {trail.map((t) => (
        <img
          key={t.id}
          src="/paw.png"
          className="paw-trail"
          style={{ left: t.x, top: t.y, rotate: `${t.angle + 90}deg` }}
          alt=""
        />
      ))}

      {/* Main cursor */}
      <img
        src="/paw.png"
        className="paw-cursor"
        style={{ left: pos.x, top: pos.y }}
        alt=""
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// 👻 FLOATING GHOSTS
// ─────────────────────────────────────────────────────────────────
const GHOST_MSGS = [
  "boo! 👻",
  "spooky~",
  "hehe 😈",
  "wooooo",
  "gotcha!",
  "peek 👀",
  "*haunts*",
  "boo hoo",
  "eek! 💀",
  "yikes~",
]

interface Ghost {
  id: number
  x: number
  y: number
  size: number
  speed: number
  wobble: number
  color: string
  message: string | null
  direction: 1 | -1
}

let ghostId = 0

function GhostLayer() {
  const [ghosts, setGhosts] = useState<Ghost[]>([])
  const frameRef = useRef<number>(0)
  const ghostsRef = useRef<Ghost[]>([])
  ghostsRef.current = ghosts

  const spawnGhost = useCallback(() => {
    const id = ++ghostId
    const fromLeft = Math.random() > 0.5
    const colors = ["#e0d4ff", "#c8f7ff", "#ffd6f0", "#d4f5d4", "#fff3cd"]
    const g: Ghost = {
      id,
      x: fromLeft ? -80 : window.innerWidth + 80,
      y: 10 + Math.random() * 70,
      size: 24 + Math.random() * 22,
      speed: 0.6 + Math.random() * 0.8,
      wobble: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      message:
        Math.random() > 0.6
          ? GHOST_MSGS[Math.floor(Math.random() * GHOST_MSGS.length)]
          : null,
      direction: fromLeft ? 1 : -1,
    }
    setGhosts((prev) => [...prev, g])
    // Remove after it crosses screen
    const duration = ((window.innerWidth + 200) / g.speed / 60) * 1000
    setTimeout(
      () => setGhosts((prev) => prev.filter((gh) => gh.id !== id)),
      duration + 2000
    )
  }, [])

  // Animate
  useEffect(() => {
    let t = 0
    const loop = () => {
      t++
      setGhosts((prev) =>
        prev.map((g) => ({
          ...g,
          x: g.x + g.speed * g.direction,
          wobble: Math.sin(t * 0.04 + g.id) * 14,
        }))
      )
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  // Spawn periodically
  useEffect(() => {
    let mounted = true
    const sched = () => {
      if (!mounted) return
      spawnGhost()
      setTimeout(sched, 6000 + Math.random() * 9000)
    }
    const t = setTimeout(sched, 3000)
    return () => {
      mounted = false
      clearTimeout(t)
    }
  }, [spawnGhost])

  return (
    <>
      <style>{`
        .ghost-wrap {
          position: fixed;
          pointer-events: none;
          z-index: 9990;
          transition: none;
          will-change: transform;
        }
        .ghost-svg { display: block; filter: drop-shadow(0 4px 12px rgba(180,140,255,0.4)); }
        .ghost-msg {
          position: absolute;
          bottom: 110%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255,255,255,0.92);
          color: #444;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          animation: ghostMsgPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes ghostMsgPop {
          from { opacity:0; transform: translateX(-50%) scale(0.5); }
          to   { opacity:1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
      {ghosts.map((g) => (
        <div
          key={g.id}
          className="ghost-wrap"
          style={{
            left: g.x,
            top: `${g.y}%`,
            transform: `translateY(${g.wobble}px) scaleX(${
              g.direction === -1 ? -1 : 1
            })`,
          }}
        >
          {g.message && <div className="ghost-msg">{g.message}</div>}
          <GhostSVG size={g.size} color={g.color} />
        </div>
      ))}
    </>
  )
}

function GhostSVG({ size, color }: { size: number; color: string }) {
  return (
    <svg
      className="ghost-svg"
      width={size}
      height={size * 1.2}
      viewBox="0 0 40 48"
    >
      {/* Body */}
      <path
        d="M4 20 Q4 4 20 4 Q36 4 36 20 L36 44 Q30 38 24 44 Q20 48 16 44 Q10 38 4 44 Z"
        fill={color}
      />
      {/* Eyes */}
      <ellipse cx="14" cy="20" rx="4" ry="5" fill="#2d1b69" />
      <ellipse cx="26" cy="20" rx="4" ry="5" fill="#2d1b69" />
      {/* Pupils */}
      <circle cx="15" cy="21" r="1.8" fill="white" />
      <circle cx="27" cy="21" r="1.8" fill="white" />
      {/* Smile */}
      <path
        d="M14 30 Q20 35 26 30"
        stroke="#2d1b69"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Blush */}
      <ellipse cx="10" cy="26" rx="4" ry="2.5" fill="rgba(255,150,150,0.35)" />
      <ellipse cx="30" cy="26" rx="4" ry="2.5" fill="rgba(255,150,150,0.35)" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────
// 🐸 JUMPING FROG
// ─────────────────────────────────────────────────────────────────
const FROG_MSGS = [
  "ribbit! 🍃",
  "boing!",
  "hi!! 💚",
  "*ribbit*",
  "jump jump!",
  "wheee~",
  "froggo 🐸",
  "croak!",
  ":D",
  "hewwo!",
  "ur cute 💚",
]

type FrogEdge = "bottom" | "left" | "right" | "top"
type FrogPhase = "idle" | "sitting" | "jumping" | "landing"

interface FrogState {
  edge: FrogEdge
  pos: number // % along edge
  phase: FrogPhase
  flipped: boolean
  message: string | null
  rotation: number
}

function FrogLayer() {
  const [frog, setFrog] = useState<FrogState | null>(null)
  const [jumpArc, setJumpArc] = useState(0)

  const spawnFrog = useCallback(() => {
    const edges: FrogEdge[] = [
      "bottom",
      "bottom",
      "bottom",
      "left",
      "right",
      "top",
    ]
    const edge = edges[Math.floor(Math.random() * edges.length)]
    const pos = 15 + Math.random() * 70
    const flipped =
      edge === "right" || (edge === "bottom" && Math.random() > 0.5)
    setJumpArc(0)
    setFrog({
      edge,
      pos,
      phase: "jumping",
      flipped,
      message: null,
      rotation: 0,
    })

    // Land
    setTimeout(() => {
      setFrog((prev) => (prev ? { ...prev, phase: "landing" } : null))
      setTimeout(() => {
        setFrog((prev) => (prev ? { ...prev, phase: "sitting" } : null))
        // Show message after settling
        setTimeout(() => {
          setFrog((prev) =>
            prev
              ? {
                  ...prev,
                  message:
                    FROG_MSGS[Math.floor(Math.random() * FROG_MSGS.length)],
                }
              : null
          )
        }, 500)
        // Jump away
        setTimeout(() => {
          setFrog((prev) =>
            prev ? { ...prev, phase: "jumping", message: null } : null
          )
          setTimeout(() => setFrog(null), 700)
        }, 3500 + Math.random() * 2000)
      }, 350)
    }, 600)
  }, [])

  // Spin during jump
  useEffect(() => {
    if (!frog || frog.phase !== "jumping") return
    let frame = 0
    const id = setInterval(() => {
      frame++
      setFrog((prev) => (prev ? { ...prev, rotation: frame * 18 } : null))
    }, 30)
    return () => clearInterval(id)
  }, [frog?.phase])

  // Schedule spawns
  useEffect(() => {
    let mounted = true
    const sched = () => {
      if (!mounted) return
      spawnFrog()
      setTimeout(sched, 12000 + Math.random() * 16000)
    }
    const t = setTimeout(sched, 5000)
    return () => {
      mounted = false
      clearTimeout(t)
    }
  }, [spawnFrog])

  if (!frog) return null

  // Position
  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 9995,
    pointerEvents: "none",
  }
  const isLeaving = frog.phase === "jumping" && frog.message !== null // second jump = leaving

  const offset =
    frog.phase === "sitting" ? 0 : frog.phase === "landing" ? 4 : -80

  if (frog.edge === "bottom") {
    style.bottom = offset
    style.left = `${frog.pos}%`
    style.transform = `translateX(-50%) scaleX(${
      frog.flipped ? -1 : 1
    }) rotate(${frog.phase !== "sitting" ? frog.rotation : 0}deg)`
  } else if (frog.edge === "top") {
    style.top = offset
    style.left = `${frog.pos}%`
    style.transform = `translateX(-50%) rotate(180deg) scaleX(${
      frog.flipped ? -1 : 1
    })`
  } else if (frog.edge === "left") {
    style.left = offset
    style.top = `${frog.pos}%`
    style.transform = `translateY(-50%) rotate(90deg)`
  } else {
    style.right = offset
    style.top = `${frog.pos}%`
    style.transform = `translateY(-50%) rotate(-90deg)`
  }

  return (
    <>
      <style>{`
        .frog-wrap {
          transition: bottom 0.5s cubic-bezier(0.34,1.56,0.64,1),
                      top    0.5s cubic-bezier(0.34,1.56,0.64,1),
                      left   0.5s cubic-bezier(0.34,1.56,0.64,1),
                      right  0.5s cubic-bezier(0.34,1.56,0.64,1);
          cursor: pointer;
          pointer-events: auto !important;
        }
        .frog-wrap:hover { filter: brightness(1.15); }
        .frog-msg {
          position: absolute;
          bottom: 108%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255,255,255,0.93);
          color: #1a4a1a;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 100px;
          white-space: nowrap;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          animation: frogMsgPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
          pointer-events: none;
        }
        @keyframes frogMsgPop {
          from { opacity:0; transform: translateX(-50%) scale(0.4) translateY(10px); }
          to   { opacity:1; transform: translateX(-50%) scale(1)   translateY(0); }
        }
        .frog-sit {
          animation: frogSit 1.2s ease-in-out infinite;
        }
        @keyframes frogSit {
          0%,100% { transform: scaleY(1); }
          50%      { transform: scaleY(0.9) scaleX(1.05); }
        }
      `}</style>
      <div className="frog-wrap" style={style}>
        {frog.message && <div className="frog-msg">{frog.message}</div>}
        <div className={frog.phase === "sitting" ? "frog-sit" : ""}>
          <FrogSVG />
        </div>
      </div>
    </>
  )
}

function FrogSVG() {
  return (
    <svg
      width="52"
      height="46"
      viewBox="0 0 52 46"
      fill="none"
      style={{ filter: "drop-shadow(0 4px 10px rgba(0,120,0,0.3))" }}
    >
      {/* Body */}
      <ellipse cx="26" cy="30" rx="18" ry="14" fill="#5cb85c" />
      {/* Belly */}
      <ellipse cx="26" cy="33" rx="11" ry="8" fill="#a8e6a8" />
      {/* Back legs */}
      <ellipse cx="9" cy="40" rx="8" ry="5" fill="#4a9e4a" />
      <ellipse cx="43" cy="40" rx="8" ry="5" fill="#4a9e4a" />
      {/* Front arms */}
      <ellipse cx="12" cy="28" rx="5" ry="3.5" fill="#5cb85c" />
      <ellipse cx="40" cy="28" rx="5" ry="3.5" fill="#5cb85c" />
      {/* Head */}
      <ellipse cx="26" cy="18" rx="15" ry="12" fill="#5cb85c" />
      {/* Eyes bumps */}
      <circle cx="15" cy="10" r="7" fill="#5cb85c" />
      <circle cx="37" cy="10" r="7" fill="#5cb85c" />
      {/* Eyes whites */}
      <circle cx="15" cy="10" r="5.5" fill="white" />
      <circle cx="37" cy="10" r="5.5" fill="white" />
      {/* Pupils */}
      <circle cx="15.5" cy="10.5" r="3" fill="#1a3a0a" />
      <circle cx="37.5" cy="10.5" r="3" fill="#1a3a0a" />
      {/* Shine */}
      <circle cx="16.5" cy="9" r="1.2" fill="white" />
      <circle cx="38.5" cy="9" r="1.2" fill="white" />
      {/* Smile */}
      <path
        d="M19 22 Q26 27 33 22"
        stroke="#2d6a2d"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Nostrils */}
      <circle cx="23" cy="20" r="1.2" fill="#3a7a3a" />
      <circle cx="29" cy="20" r="1.2" fill="#3a7a3a" />
      {/* Toe dots */}
      <circle cx="5" cy="43" r="2" fill="#3a7a3a" />
      <circle cx="9" cy="44" r="2" fill="#3a7a3a" />
      <circle cx="13" cy="43" r="2" fill="#3a7a3a" />
      <circle cx="39" cy="43" r="2" fill="#3a7a3a" />
      <circle cx="43" cy="44" r="2" fill="#3a7a3a" />
      <circle cx="47" cy="43" r="2" fill="#3a7a3a" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────
// 🎀 MAIN EXPORT — drop this in layout.tsx
// ─────────────────────────────────────────────────────────────────
export default function CuteExtras() {
  return (
    <>
      <PawCursor />
      <GhostLayer />
      <FrogLayer />
    </>
  )
}
