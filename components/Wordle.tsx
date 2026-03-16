"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ref, set, get, onValue, off } from "firebase/database"
import { db } from "@/lib/firebase"
import { Stars, GameLanding, Lobby, ScoreBar, GameOver } from "./Shared"
import type {
  WordleRoom,
  WordleBoard,
  WordleGuessRow,
  TileColor,
} from "@/types/game"
import { WORDS } from "@/lib/wordList"

// Words list is lowercase — normalize for lookup
const VALID_WORDS = new Set(WORDS.map((w) => w.toUpperCase()))

const TOTAL_ROUNDS = 5
const MAX_GUESSES = 6

function calcColors(guess: string, word: string): TileColor[] {
  const result: TileColor[] = Array(5).fill("grey")
  const wordArr = word.toUpperCase().split("")
  const used = Array(5).fill(false)
  const g = guess.toUpperCase()
  // greens first
  for (let i = 0; i < 5; i++) {
    if (g[i] === wordArr[i]) {
      result[i] = "green"
      used[i] = true
    }
  }
  // then yellows
  for (let i = 0; i < 5; i++) {
    if (result[i] === "green") continue
    for (let j = 0; j < 5; j++) {
      if (!used[j] && g[i] === wordArr[j]) {
        result[i] = "yellow"
        used[j] = true
        break
      }
    }
  }
  return result
}

// Firebase ref helpers
const roomDbRef = (c: string) => ref(db, `wl-rooms/${c}`)
const boardDbRef = (c: string, pid: string) => ref(db, `wl-boards/${c}/${pid}`)

interface Props {
  pid: string
  onBack: () => void
}

export default function Wordle({ pid, onBack }: Props) {
  const [screen, setScreen] = useState<
    "landing" | "lobby" | "playing" | "result" | "gameover"
  >("landing")
  const [myName, setMyName] = useState("")

  // ── SPLIT code into input state vs active/confirmed code ─────────────────
  // codeInput drives the <input> field only.
  // activeCode is set only after a successful create/join — this is what
  // the Firebase listener depends on, so it never fires on keystrokes.
  const [codeInput, setCodeInput] = useState("")
  const [activeCode, setActiveCode] = useState("")

  const [room, setRoom] = useState<WordleRoom | null>(null)
  const [board, setBoard] = useState<WordleBoard>({
    guesses: [],
    solved: false,
    failed: false,
  })
  const [currentGuess, setCurrentGuess] = useState("")
  const [shake, setShake] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [themGuessCount, setThemGuessCount] = useState(0)
  const [invalidWord, setInvalidWord] = useState(false)

  // Refs so callbacks always see fresh values without needing them in deps
  const activeCodeRef = useRef(activeCode)
  const roomRef2 = useRef<WordleRoom | null>(null)
  const boardRef2 = useRef<WordleBoard>({
    guesses: [],
    solved: false,
    failed: false,
  })
  activeCodeRef.current = activeCode
  roomRef2.current = room
  boardRef2.current = board

  // ── Listen to room — only fires after activeCode is set ──────────────────
  useEffect(() => {
    if (!activeCode) return
    const r = roomDbRef(activeCode)
    const unsub = onValue(r, (snap) => {
      if (!snap.exists()) return
      const data = snap.val() as WordleRoom
      setRoom(data)
      roomRef2.current = data
      setScreen((prev) => {
        if (data.status === "lobby" && prev === "landing") return "lobby"
        if (
          data.status === "playing" &&
          (prev === "lobby" || prev === "result")
        )
          return "playing"
        if (data.status === "result" && prev === "playing") return "result"
        if (data.status === "gameover" && prev !== "gameover") return "gameover"
        return prev
      })
    })
    return () => unsub() // ← use returned unsubscribe, not off()
  }, [activeCode])

  // ── Listen to opponent's board (guess count only) ────────────────────────
  useEffect(() => {
    if (!activeCode || !room) return
    const them = room.players.find((p) => p.id !== pid)
    if (!them) return
    const br = boardDbRef(activeCode, them.id)
    const unsub = onValue(br, (snap) => {
      if (snap.exists()) {
        const b = snap.val() as WordleBoard
        setThemGuessCount(b.guesses.length)
      }
    })
    return () => unsub()
  }, [activeCode, room?.players.length, pid])

  // ── Reset board on each new round ────────────────────────────────────────
  useEffect(() => {
    if (screen !== "playing") return
    const fresh: WordleBoard = { guesses: [], solved: false, failed: false }
    setBoard(fresh)
    boardRef2.current = fresh
    setCurrentGuess("")
    setThemGuessCount(0)
  }, [screen, room?.round])

  // ── Create room ───────────────────────────────────────────────────────────
  const createRoom = async () => {
    if (!myName.trim() || !codeInput.trim()) {
      setError("Enter your name and room code!")
      return
    }
    setLoading(true)
    setError("")
    const c = codeInput.toUpperCase().trim()
    const word = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase()
    const r: WordleRoom = {
      host: pid,
      players: [{ id: pid, name: myName.trim() }],
      scores: { [pid]: 0 },
      word,
      round: 1,
      status: "lobby",
      roundWinner: null,
      done: {},
      solvedIn: {},
    }
    await set(roomDbRef(c), r)
    setActiveCode(c) // ← activates Firebase listener
    setRoom(r)
    setScreen("lobby")
    setLoading(false)
  }

  // ── Join room ─────────────────────────────────────────────────────────────
  const joinRoom = async () => {
    if (!myName.trim() || !codeInput.trim()) {
      setError("Enter your name and room code!")
      return
    }
    setLoading(true)
    setError("")
    const c = codeInput.toUpperCase().trim()
    const snap = await get(roomDbRef(c))
    if (!snap.exists()) {
      setError("Room not found!")
      setLoading(false)
      return
    }
    const r = snap.val() as WordleRoom
    if (r.players.length >= 2) {
      setError("Room is full!")
      setLoading(false)
      return
    }
    const updated: WordleRoom = {
      ...r,
      players: [...r.players, { id: pid, name: myName.trim() }],
      scores: { ...r.scores, [pid]: 0 },
      status: "playing",
    }
    await set(roomDbRef(c), updated)
    setActiveCode(c) // ← activates Firebase listener
    setRoom(updated)
    setScreen("playing")
    setLoading(false)
  }

  // ── Resolve round (host only) ─────────────────────────────────────────────
  const resolveRound = useCallback(
    async (
      r: WordleRoom,
      c: string,
      hostId: string,
      done: Record<string, boolean>,
      solvedIn: Record<string, number>
    ) => {
      const other = r.players.find((p) => p.id !== hostId)
      const myIn = solvedIn[hostId] ?? -1
      const otherIn = other ? solvedIn[other.id] ?? -1 : -1

      let winner: string | null = null
      if (myIn !== -1 && otherIn !== -1) {
        winner = myIn <= otherIn ? hostId : other!.id
      } else if (myIn !== -1) winner = hostId
      else if (otherIn !== -1) winner = other!.id

      const newScores = { ...r.scores }
      if (winner) newScores[winner] = (newScores[winner] || 0) + 1

      await set(ref(db, `wl-rooms/${c}`), {
        ...r,
        status: "result",
        roundWinner: winner,
        scores: newScores,
        done,
        solvedIn,
      })
    },
    []
  )

  // ── Submit a guess ────────────────────────────────────────────────────────
  const submitGuess = useCallback(async () => {
    const r = roomRef2.current
    const b = boardRef2.current
    if (!r || r.status !== "playing" || b.solved || b.failed) return

    const g = currentGuess.toUpperCase()
    if (g.length !== 5) {
      triggerShake()
      return
    }
    if (!VALID_WORDS.has(g)) {
      setInvalidWord(true)
      setTimeout(() => setInvalidWord(false), 600)
      triggerShake()
      return
    }

    const colors = calcColors(g, r.word)
    const row: WordleGuessRow = { word: g, colors }
    const newGuesses = [...b.guesses, row]
    const solved = colors.every((c) => c === "green")
    const failed = !solved && newGuesses.length >= MAX_GUESSES

    const newBoard: WordleBoard = { guesses: newGuesses, solved, failed }
    setBoard(newBoard)
    boardRef2.current = newBoard
    setCurrentGuess("")

    const c = activeCodeRef.current
    await set(boardDbRef(c, pid), newBoard)

    if (solved || failed) {
      const newDone = { ...r.done, [pid]: true }
      const newSolvedIn = {
        ...r.solvedIn,
        [pid]: solved ? newGuesses.length : -1,
      }

      // Write done state so the other player can see we finished
      await set(roomDbRef(c), { ...r, done: newDone, solvedIn: newSolvedIn })

      // Only the HOST resolves the round to avoid race conditions
      if (pid === r.host) {
        const other = r.players.find((p) => p.id !== pid)
        const bothDone = other ? !!newDone[other.id] : true

        if (bothDone) {
          resolveRound(r, c, pid, newDone, newSolvedIn)
        } else {
          // Poll until the other player finishes
          const poll = setInterval(async () => {
            const snap = await get(roomDbRef(c))
            if (!snap.exists()) {
              clearInterval(poll)
              return
            }
            const rr = snap.val() as WordleRoom
            if (rr.status !== "playing") {
              clearInterval(poll)
              return
            }
            const oDone = other ? !!rr.done?.[other.id] : true
            if (oDone) {
              clearInterval(poll)
              resolveRound(rr, c, pid, rr.done, rr.solvedIn)
            }
          }, 1000)
        }
      }
    }
  }, [currentGuess, pid, resolveRound])

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  // ── Keyboard handler (physical + on-screen) ───────────────────────────────
  const handleKey = useCallback(
    (key: string) => {
      const b = boardRef2.current
      if (b.solved || b.failed) return
      if (key === "ENTER") {
        submitGuess()
        return
      }
      if (key === "BACKSPACE" || key === "DELETE") {
        setCurrentGuess((prev) => prev.slice(0, -1))
        return
      }
      if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((prev) => prev + key)
      }
    },
    [submitGuess, currentGuess]
  )

  // Physical keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKey(e.key.toUpperCase())
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleKey])

  // ── Next round / play again ───────────────────────────────────────────────
  const nextRound = async () => {
    const r = roomRef2.current
    if (!r) return
    const c = activeCodeRef.current
    if (r.round >= TOTAL_ROUNDS) {
      await set(roomDbRef(c), { ...r, status: "gameover" })
    } else {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase()
      await set(roomDbRef(c), {
        ...r,
        word,
        round: r.round + 1,
        status: "playing",
        roundWinner: null,
        done: {},
        solvedIn: {},
      })
    }
  }

  const playAgain = async () => {
    const r = roomRef2.current
    if (!r) return
    const c = activeCodeRef.current
    const scores: Record<string, number> = {}
    r.players.forEach((p) => (scores[p.id] = 0))
    const word = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase()
    await set(roomDbRef(c), {
      ...r,
      word,
      round: 1,
      status: "playing",
      roundWinner: null,
      done: {},
      solvedIn: {},
      scores,
    })
  }

  // ── Keyboard key colors ───────────────────────────────────────────────────
  const keyColors: Record<string, TileColor> = {}
  board.guesses.forEach((row) => {
    row.word.split("").forEach((ch, i) => {
      const cur = keyColors[ch]
      const next = row.colors[i]
      if (next === "green") keyColors[ch] = "green"
      else if (next === "yellow" && cur !== "green") keyColors[ch] = "yellow"
      else if (!cur) keyColors[ch] = "grey"
    })
  })

  const me = room?.players.find((p) => p.id === pid)
  const them = room?.players.find((p) => p.id !== pid)
  const isHost = room?.host === pid
  const myScore = room?.scores[pid] ?? 0
  const themScore = them ? room?.scores[them.id] ?? 0 : 0
  const iWon = room?.roundWinner === pid

  const KEYBOARD = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ]
  const tileColorClass: Record<TileColor, string> = {
    green: "wl-green",
    yellow: "wl-yellow",
    grey: "wl-grey",
    empty: "",
    active: "",
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="gn-app">
        <Stars color1="#6bff8e" color2="#ffd166" />

        {/* ── Landing ──────────────────────────────────────────────────── */}
        {screen === "landing" && (
          <GameLanding
            gameName="Wordle 1v1"
            gameEmoji="🟩"
            myName={myName}
            code={codeInput}
            error={error}
            loading={loading}
            onNameChange={setMyName}
            onCodeChange={setCodeInput}
            onCreate={createRoom}
            onJoin={joinRoom}
            onBack={onBack}
          />
        )}

        {/* ── Lobby ────────────────────────────────────────────────────── */}
        {screen === "lobby" && me && (
          <Lobby code={activeCode} me={me} them={them} onBack={onBack} />
        )}

        {/* ── Playing ──────────────────────────────────────────────────── */}
        {screen === "playing" && (
          <div className="gn-content wl-playing">
            <div className="wl-topbar">
              <button className="gn-btn gn-btn-ghost" onClick={onBack}>
                ← Hub
              </button>
              <div className="wl-partner-status">
                {them?.name ?? "Partner"}: {themGuessCount}/{MAX_GUESSES}{" "}
                guesses
              </div>
            </div>

            <ScoreBar
              meName={me?.name ?? "You"}
              themName={them?.name ?? "Partner"}
              myScore={myScore}
              themScore={themScore}
              myColor="var(--green)"
              themColor="var(--gold)"
              round={room?.round ?? 1}
              totalRounds={TOTAL_ROUNDS}
            />

            {/* Board */}
            <div className={`wl-board ${shake ? "wl-shake" : ""}`}>
              {Array.from({ length: MAX_GUESSES }, (_, row) => {
                const guessRow = board.guesses[row]
                const isActive =
                  row === board.guesses.length && !board.solved && !board.failed
                return (
                  <div key={row} className="wl-row">
                    {Array.from({ length: 5 }, (_, col) => {
                      let letter = ""
                      let cls = "wl-tile"
                      if (guessRow) {
                        letter = guessRow.word[col]
                        cls +=
                          " wl-revealed " + tileColorClass[guessRow.colors[col]]
                      } else if (isActive) {
                        letter = currentGuess[col] ?? ""
                        cls += letter ? " wl-filled" : " wl-empty"
                        if (invalidWord) cls += " wl-invalid"
                      } else {
                        cls += " wl-empty"
                      }
                      return (
                        <div key={col} className={cls}>
                          {letter}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* On-screen keyboard */}
            <div className="wl-keyboard">
              {KEYBOARD.map((row, ri) => (
                <div key={ri} className="wl-kb-row">
                  {row.map((k) => {
                    const kKey = k === "⌫" ? "BACKSPACE" : k
                    const kColor = keyColors[k]
                    return (
                      <button
                        key={k}
                        className={`wl-key ${
                          k === "ENTER" || k === "⌫" ? "wl-key-wide" : ""
                        } ${kColor ? "wl-key-" + kColor : ""}`}
                        onClick={() => handleKey(kKey)}
                      >
                        {k}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {(board.solved || board.failed) && (
              <div
                className={`wl-status-msg ${
                  board.solved ? "wl-solved" : "wl-failed"
                }`}
              >
                {board.solved
                  ? "🎉 Solved!"
                  : `❌ Out of guesses — the word was ${room?.word}`}
                <div className="gn-dots" style={{ marginTop: 6 }}>
                  <span className="gn-dot" />
                  <span className="gn-dot" />
                  <span className="gn-dot" />
                  <span>Waiting for {them?.name ?? "partner"}…</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Result ───────────────────────────────────────────────────── */}
        {screen === "result" && (
          <div className="gn-content">
            <button className="gn-btn gn-btn-ghost" onClick={onBack}>
              ← Hub
            </button>
            <ScoreBar
              meName={me?.name ?? "You"}
              themName={them?.name ?? "Partner"}
              myScore={myScore}
              themScore={themScore}
              myColor="var(--green)"
              themColor="var(--gold)"
              round={room?.round ?? 1}
              totalRounds={TOTAL_ROUNDS}
            />
            <div className="gn-card" style={{ alignItems: "center" }}>
              <span className="gn-result-emoji">
                {!room?.roundWinner ? "🤝" : iWon ? "🧠" : "😬"}
              </span>
              <div
                className="gn-result-title"
                style={{
                  color: !room?.roundWinner
                    ? "var(--muted)"
                    : iWon
                    ? "var(--green)"
                    : "var(--gold)",
                }}
              >
                {!room?.roundWinner
                  ? "Nobody got it!"
                  : iWon
                  ? "You cracked it!"
                  : `${them?.name} got it first!`}
              </div>
              <p className="gn-small gn-muted" style={{ marginBottom: 4 }}>
                The word was:
              </p>
              <div className="wl-answer-reveal">{room?.word}</div>
              {room?.solvedIn && (
                <div className="wl-solve-stats">
                  {room.players.map((p) => {
                    const n = room.solvedIn?.[p.id] ?? -1
                    return (
                      <div key={p.id} className="wl-solve-stat">
                        <span>{p.id === pid ? "You" : p.name}</span>
                        <strong>{n === -1 ? "❌" : `${n}/6`}</strong>
                      </div>
                    )
                  })}
                </div>
              )}
              {isHost ? (
                <button
                  className="gn-btn gn-btn-gold"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={nextRound}
                >
                  {(room?.round ?? 0) >= TOTAL_ROUNDS
                    ? "See Final Results →"
                    : "Next Round →"}
                </button>
              ) : (
                <div className="gn-dots">
                  <span className="gn-dot" />
                  <span className="gn-dot" />
                  <span className="gn-dot" />
                  <span>Waiting for {them?.name} to continue…</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Game over ────────────────────────────────────────────────── */}
        {screen === "gameover" && (
          <GameOver
            meName={me?.name ?? "You"}
            themName={them?.name ?? "Partner"}
            myScore={myScore}
            themScore={themScore}
            totalRounds={TOTAL_ROUNDS}
            isHost={isHost}
            code={activeCode}
            onPlayAgain={playAgain}
            onBack={onBack}
          />
        )}
      </div>
    </>
  )
}

const CSS = `
  .wl-playing { max-width: 420px; }

  .wl-topbar {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
  }

  .wl-partner-status {
    font-size: 0.75rem; font-weight: 600;
    background: rgba(107,255,142,0.08); border: 1px solid rgba(107,255,142,0.2);
    border-radius: 100px; padding: 4px 12px; color: var(--green);
  }

  .wl-board {
    display: flex; flex-direction: column; gap: 5px;
    margin: 12px auto; width: fit-content;
  }
  .wl-row { display: flex; gap: 5px; }

  .wl-tile {
    width: 52px; height: 52px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Righteous', cursive; font-size: 1.6rem; font-weight: 700;
    text-transform: uppercase; transition: background 0.15s, border-color 0.15s;
    user-select: none;
  }
  .wl-empty    { border: 2px solid var(--border); color: transparent; }
  .wl-filled   { border: 2px solid rgba(240,240,255,0.35); color: var(--text); background: rgba(255,255,255,0.06); }
  .wl-revealed { border: none; animation: wlFlip 0.4s ease both; }
  .wl-green    { background: #538d4e; color: white; }
  .wl-yellow   { background: #b59f3b; color: white; }
  .wl-grey     { background: rgba(255,255,255,0.12); color: var(--text); }
  .wl-invalid  { border-color: #ff4757 !important; }

  @keyframes wlFlip {
    0%   { transform: scaleY(1); }
    50%  { transform: scaleY(0); }
    100% { transform: scaleY(1); }
  }
  .wl-shake { animation: wlShake 0.45s ease; }
  @keyframes wlShake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }

  /* On-screen keyboard */
  .wl-keyboard  { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
  .wl-kb-row    { display: flex; justify-content: center; gap: 5px; }
  .wl-key {
    height: 52px; min-width: 34px; padding: 0 4px; border-radius: 7px;
    border: none; background: rgba(255,255,255,0.12); color: var(--text);
    font-family: 'Righteous', cursive; font-size: 0.85rem;
    cursor: pointer; transition: all 0.15s; flex: 1; max-width: 40px;
    user-select: none;
  }
  .wl-key-wide  { min-width: 60px; max-width: 64px; font-size: 0.72rem; }
  .wl-key:hover { background: rgba(255,255,255,0.22); transform: translateY(-1px); }
  .wl-key:active { transform: translateY(0); }
  .wl-key-green  { background: #538d4e !important; color: white !important; }
  .wl-key-yellow { background: #b59f3b !important; color: white !important; }
  .wl-key-grey   { background: rgba(255,255,255,0.07) !important; color: var(--muted) !important; }

  .wl-status-msg {
    text-align: center; padding: 10px 14px; border-radius: 12px; margin-top: 10px;
    font-size: 0.85rem; font-weight: 600;
  }
  .wl-solved { background: rgba(83,141,78,0.15); border: 1px solid rgba(83,141,78,0.3); color: var(--green); }
  .wl-failed { background: rgba(255,71,87,0.12); border: 1px solid rgba(255,71,87,0.25); color: #ff8fa3; }

  .wl-answer-reveal {
    font-family: 'Righteous', cursive; font-size: 1.6rem; letter-spacing: 5px;
    color: var(--green); background: rgba(107,255,142,0.08);
    border: 1px solid rgba(107,255,142,0.2); border-radius: 14px;
    padding: 12px 20px; margin: 6px 0 10px; width: 100%; text-align: center;
  }
  .wl-solve-stats { display: flex; gap: 20px; margin-bottom: 8px; }
  .wl-solve-stat {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
    border-radius: 12px; padding: 10px 20px;
  }
  .wl-solve-stat span     { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; }
  .wl-solve-stat strong   { font-family: 'Righteous', cursive; font-size: 1.4rem; }
`
