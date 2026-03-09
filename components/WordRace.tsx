"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ref, set, get, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import { Stars, GameLanding, Lobby, ScoreBar, GameOver } from "./Shared";
import type { WordRaceRoom, WordRaceGuess } from "@/types/game";

const WORDS = [
  "BUTTERFLY","RAINBOW","CHOCOLATE","ADVENTURE","ELEPHANT","STARFISH",
  "BLANKET","FIREPLACE","PENGUIN","JELLYFISH","CINNAMON","TELESCOPE",
  "HURRICANE","BASKETBALL","CHAMPAGNE","CROCODILE","PINEAPPLE","SAXOPHONE",
  "WATERFALL","DRAGONFLY","MUSHROOM","SUNSHINE","NOTEBOOK","TREASURE",
  "CARNIVAL","FIREWORKS","LAUGHTER","POPCORN","DIAMOND","VOLCANO",
  "CALENDAR","CUCUMBER","FLAMINGO","HEDGEHOG","CAPPUCCINO","SKATEBOARD",
  "LIGHTNING","TROPICAL","NOODLES","QUICKSAND","UMBRELLA","SPAGHETTI",
];

const TOTAL_ROUNDS = 5;

function scramble(word: string): string {
  const a = word.split("");
  let s: string;
  do {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    s = a.join("");
  } while (s === word);
  return s;
}

const rRef  = (c: string) => ref(db, `wr-rooms/${c}`);
const gRef  = (c: string, pid: string) => ref(db, `wr-guesses/${c}/${pid}`);

interface Props { pid: string; onBack: () => void; }

export default function WordRace({ pid, onBack }: Props) {
  const [screen, setScreen]     = useState<"landing"|"lobby"|"playing"|"result"|"gameover">("landing");
  const [myName, setMyName]     = useState("");
  const [code, setCode]         = useState("");
  const [room, setRoom]         = useState<WordRaceRoom | null>(null);
  const [guess, setGuess]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const codeRef = useRef(code);
  const roomRef2 = useRef<WordRaceRoom | null>(null);
  codeRef.current  = code;
  roomRef2.current = room;

  useEffect(() => {
    if (!code) return;
    const r = rRef(code);
    const unsub = onValue(r, snap => {
      if (!snap.exists()) return;
      const data = snap.val() as WordRaceRoom;
      setRoom(data);
      roomRef2.current = data;
      setScreen(prev => {
        if (data.status === "lobby"   && prev === "landing")               return "lobby";
        if (data.status === "playing" && (prev === "lobby" || prev === "result")) return "playing";
        if (data.status === "result"  && prev === "playing")               return "result";
        if (data.status === "gameover"&& prev !== "gameover")              return "gameover";
        return prev;
      });
    });
    return () => off(r);
  }, [code]);

  useEffect(() => {
    if (screen === "playing") { setGuess(""); setSubmitted(false); }
  }, [screen, room?.round]);

  const createRoom = async () => {
    if (!myName.trim() || !code.trim()) { setError("Enter your name and room code!"); return; }
    setLoading(true); setError("");
    const c = code.toUpperCase().trim();
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const newRoom: WordRaceRoom = {
      host: pid, players: [{ id: pid, name: myName.trim() }],
      scores: { [pid]: 0 }, word, scrambled: scramble(word),
      round: 1, status: "lobby", roundWinner: null,
    };
    await set(rRef(c), newRoom);
    setCode(c); setRoom(newRoom); setScreen("lobby"); setLoading(false);
  };

  const joinRoom = async () => {
    if (!myName.trim() || !code.trim()) { setError("Enter your name and room code!"); return; }
    setLoading(true); setError("");
    const c = code.toUpperCase().trim();
    const snap = await get(rRef(c));
    if (!snap.exists())           { setError("Room not found!"); setLoading(false); return; }
    const r = snap.val() as WordRaceRoom;
    if (r.players.length >= 2)    { setError("Room is full!"); setLoading(false); return; }
    const updated: WordRaceRoom = {
      ...r, players: [...r.players, { id: pid, name: myName.trim() }],
      scores: { ...r.scores, [pid]: 0 }, status: "playing",
    };
    await set(rRef(c), updated);
    setCode(c); setRoom(updated); setScreen("playing"); setLoading(false);
  };

  const submitGuess = useCallback(async () => {
    if (!guess.trim() || submitted) return;
    setSubmitted(true);
    const c = codeRef.current;
    const r = roomRef2.current;
    if (!r || r.status !== "playing") return;
    const upper = guess.trim().toUpperCase();
    const isCorrect = upper === r.word;
    const now = Date.now();
    await set(gRef(c, pid), { guess: upper, correct: isCorrect, time: now, round: r.round } as WordRaceGuess);

    if (r.host === pid) {
      const other = r.players.find(p => p.id !== pid);
      if (isCorrect) {
        let winner = pid;
        if (other) {
          const oSnap = await get(gRef(c, other.id));
          if (oSnap.exists()) {
            const og = oSnap.val() as WordRaceGuess;
            if (og.round === r.round && og.correct && og.time < now) winner = other.id;
          }
        }
        const newScores = { ...r.scores, [winner]: (r.scores[winner] || 0) + 1 };
        await set(rRef(c), { ...r, status: "result", roundWinner: winner, scores: newScores });
      } else if (other) {
        setTimeout(async () => {
          const r2 = roomRef2.current;
          if (!r2 || r2.status !== "playing") return;
          const oSnap = await get(gRef(c, other.id));
          let w: string | null = null;
          if (oSnap.exists()) {
            const og = oSnap.val() as WordRaceGuess;
            if (og.round === r2.round && og.correct) w = other.id;
          }
          const ns = { ...r2.scores };
          if (w) ns[w] = (ns[w] || 0) + 1;
          await set(rRef(c), { ...r2, status: "result", roundWinner: w, scores: ns });
        }, 3500);
      }
    } else if (isCorrect) {
      setTimeout(async () => {
        const r2 = roomRef2.current;
        if (!r2 || r2.status !== "playing") return;
        const host = r2.players.find(p => p.id === r2.host);
        if (!host) return;
        let winner: string = pid;
        const hSnap = await get(gRef(c, host.id));
        if (hSnap.exists()) {
          const hg = hSnap.val() as WordRaceGuess;
          if (hg.round === r2.round && hg.correct && hg.time < now) winner = host.id;
        }
        const ns = { ...r2.scores, [winner]: (r2.scores[winner] || 0) + 1 };
        await set(rRef(c), { ...r2, status: "result", roundWinner: winner, scores: ns });
      }, 800);
    }
  }, [guess, submitted, pid]);

  const nextRound = async () => {
    const r = roomRef2.current; if (!r) return;
    const c = codeRef.current;
    if (r.round >= TOTAL_ROUNDS) {
      await set(rRef(c), { ...r, status: "gameover" });
    } else {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      await set(rRef(c), { ...r, word, scrambled: scramble(word), round: r.round + 1, status: "playing", roundWinner: null });
    }
  };

  const playAgain = async () => {
    const r = roomRef2.current; if (!r) return;
    const c = codeRef.current;
    const scores: Record<string, number> = {};
    r.players.forEach(p => scores[p.id] = 0);
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    await set(rRef(c), { ...r, word, scrambled: scramble(word), round: 1, status: "playing", roundWinner: null, scores });
  };

  const me    = room?.players.find(p => p.id === pid);
  const them  = room?.players.find(p => p.id !== pid);
  const isHost = room?.host === pid;
  const myScore   = room?.scores[pid] ?? 0;
  const themScore = them ? (room?.scores[them.id] ?? 0) : 0;
  const iWon = room?.roundWinner === pid;

  return (
    <>
      <style>{CSS}</style>
      <div className="gn-app">
        <Stars color1="#5ee7ff" color2="#b490ff" />

        {screen === "landing" && (
          <GameLanding gameName="Word Race" gameEmoji="💨"
            myName={myName} code={code} error={error} loading={loading}
            onNameChange={setMyName} onCodeChange={setCode}
            onCreate={createRoom} onJoin={joinRoom} onBack={onBack} />
        )}

        {screen === "lobby" && me && (
          <Lobby code={code} me={me} them={them} onBack={onBack} />
        )}

        {screen === "playing" && (
          <div className="gn-content">
            <button className="gn-btn gn-btn-ghost" onClick={onBack}>← Hub</button>
            <ScoreBar
              meName={me?.name ?? "You"} themName={them?.name ?? "Partner"}
              myScore={myScore} themScore={themScore}
              myColor="var(--cyan)" themColor="var(--pink)"
              round={room?.round ?? 1} totalRounds={TOTAL_ROUNDS} />
            <div className="gn-card" style={{ gap: 0 }}>
              <p className="gn-center gn-small gn-muted">Unscramble this word!</p>
              <div className="wr-tiles">
                {(room?.scrambled ?? "").split("").map((ch, i) => (
                  <div key={i} className="wr-tile" style={{ animationDelay: `${i * 0.04}s` }}>{ch}</div>
                ))}
              </div>
              <div className="wr-guess-row">
                <input className="wr-guess-inp"
                  placeholder="Type your answer…"
                  value={guess} disabled={submitted} autoFocus
                  onChange={e => setGuess(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && submitGuess()} />
                <button className="wr-go-btn" disabled={submitted || !guess.trim()} onClick={submitGuess}>→</button>
              </div>
              {submitted ? (
                <div className="wr-submitted">✅ Submitted — waiting for {them?.name ?? "partner"}…</div>
              ) : (
                <div className="gn-dots" style={{ marginTop: 8 }}>
                  <span className="gn-dot"/><span className="gn-dot"/><span className="gn-dot"/>
                  <span>Racing against {them?.name ?? "partner"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {screen === "result" && (
          <div className="gn-content">
            <button className="gn-btn gn-btn-ghost" onClick={onBack}>← Hub</button>
            <ScoreBar
              meName={me?.name ?? "You"} themName={them?.name ?? "Partner"}
              myScore={myScore} themScore={themScore}
              myColor="var(--cyan)" themColor="var(--pink)"
              round={room?.round ?? 1} totalRounds={TOTAL_ROUNDS} />
            <div className="gn-card" style={{ alignItems: "center" }}>
              <span className="gn-result-emoji">{!room?.roundWinner ? "🤝" : iWon ? "🏆" : "😅"}</span>
              <div className="gn-result-title" style={{ color: !room?.roundWinner ? "var(--muted)" : iWon ? "var(--gold)" : "var(--cyan)" }}>
                {!room?.roundWinner ? "Nobody got it!" : iWon ? "You win this round!" : `${them?.name} wins!`}
              </div>
              <p className="gn-small gn-muted" style={{ marginBottom: 4 }}>The word was:</p>
              <div className="wr-answer">{room?.word}</div>
              {isHost ? (
                <button className="gn-btn gn-btn-gold" style={{ width: "100%" }} onClick={nextRound}>
                  {(room?.round ?? 0) >= TOTAL_ROUNDS ? "See Final Results →" : "Next Round →"}
                </button>
              ) : (
                <div className="gn-dots">
                  <span className="gn-dot"/><span className="gn-dot"/><span className="gn-dot"/>
                  <span>Waiting for {them?.name} to continue…</span>
                </div>
              )}
            </div>
          </div>
        )}

        {screen === "gameover" && (
          <GameOver
            meName={me?.name ?? "You"} themName={them?.name ?? "Partner"}
            myScore={myScore} themScore={themScore}
            totalRounds={TOTAL_ROUNDS} isHost={isHost} code={code}
            onPlayAgain={playAgain} onBack={onBack} />
        )}
      </div>
    </>
  );
}

const CSS = `
  .wr-tiles { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin: 22px 0 18px; }
  .wr-tile {
    width: 46px; height: 52px; border-radius: 11px;
    background: linear-gradient(135deg, rgba(94,231,255,0.15), rgba(180,144,255,0.15));
    border: 1.5px solid rgba(94,231,255,0.3);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Righteous', cursive; font-size: 1.5rem; color: var(--cyan);
    box-shadow: 0 0 16px rgba(94,231,255,0.1);
    animation: wrTile 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes wrTile {
    from { opacity: 0; transform: translateY(-14px) scale(0.7); }
    to   { opacity: 1; transform: none; }
  }
  .wr-guess-row { display: flex; gap: 9px; }
  .wr-guess-inp {
    flex: 1; padding: 13px 16px; border-radius: 13px;
    border: 1.5px solid var(--border); background: rgba(255,255,255,0.05);
    color: var(--text); font-size: 1.05rem; font-family: 'Righteous', cursive;
    letter-spacing: 2px; text-transform: uppercase; outline: none;
    transition: border 0.2s, box-shadow 0.2s;
  }
  .wr-guess-inp:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(94,231,255,0.15); }
  .wr-guess-inp:disabled { opacity: 0.5; }
  .wr-guess-inp::placeholder { font-family: 'DM Sans', sans-serif; letter-spacing: 0; font-size: 0.88rem; color: rgba(240,240,255,0.2); }
  .wr-go-btn {
    padding: 13px 18px; border-radius: 13px; border: none;
    background: linear-gradient(135deg, var(--cyan), #0090cc);
    color: #001a2e; font-size: 1.2rem; font-weight: 800;
    cursor: pointer; transition: all 0.2s;
  }
  .wr-go-btn:hover:not(:disabled) { transform: translateY(-2px); }
  .wr-go-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .wr-submitted {
    text-align: center; padding: 9px; border-radius: 11px; margin-top: 4px;
    background: rgba(94,231,255,0.1); border: 1px solid rgba(94,231,255,0.2);
    color: var(--cyan); font-size: 0.85rem; font-weight: 600;
  }
  .wr-answer {
    font-family: 'Righteous', cursive; font-size: 1.5rem; letter-spacing: 4px;
    color: var(--cyan); background: rgba(94,231,255,0.08);
    border: 1px solid rgba(94,231,255,0.2); border-radius: 14px;
    padding: 12px 20px; margin: 6px 0 14px; width: 100%; text-align: center;
  }
`;
