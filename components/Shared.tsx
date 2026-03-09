"use client";

import { useState, useEffect } from "react";
import type { Player } from "@/types/game";

// ── Starfield ──────────────────────────────────────────────────────────────
const STAR_DATA = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  dur: (Math.random() * 3 + 2).toFixed(1),
  delay: (Math.random() * 4).toFixed(1),
  minOp: (Math.random() * 0.08 + 0.04).toFixed(2),
  maxOp: (Math.random() * 0.5 + 0.3).toFixed(2),
}));

export function Stars({ color1 = "#ff6eb4", color2 = "#5ee7ff" }: { color1?: string; color2?: string }) {
  return (
    <div className="gn-stars">
      {STAR_DATA.map(s => (
        <div key={s.id} className="gn-star" style={{
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          ["--dur" as string]: `${s.dur}s`,
          ["--delay" as string]: `-${s.delay}s`,
          ["--min-op" as string]: s.minOp,
          ["--max-op" as string]: s.maxOp,
        }} />
      ))}
      <div className="gn-orb" style={{ width: 450, height: 450, background: color1, left: -120, top: -120 }} />
      <div className="gn-orb" style={{ width: 380, height: 380, background: color2, right: -100, bottom: -100 }} />
    </div>
  );
}

// ── Lobby screen ───────────────────────────────────────────────────────────
interface LobbyProps {
  code: string;
  me: Player;
  them: Player | undefined;
  onBack: () => void;
}

export function Lobby({ code, me, them, onBack }: LobbyProps) {
  return (
    <div className="gn-content">
      <button className="gn-btn gn-btn-ghost" style={{ marginBottom: 8 }} onClick={onBack}>← Back</button>
      <div className="gn-card">
        <div className="gn-center">
          <div className="gn-small gn-muted">Your room code</div>
          <div style={{ fontFamily: "'Righteous', cursive", fontSize: "2.6rem", color: "var(--gold)", letterSpacing: 6, margin: "10px 0" }}>{code}</div>
          <div className="gn-small gn-muted">Share this with your partner!</div>
        </div>
        <div className="gn-chip">
          <div className="gn-avatar gn-avatar-me">{me.name[0]?.toUpperCase()}</div>
          <div>
            <div className="gn-chip-name">{me.name}</div>
            <div className="gn-chip-sub">You · Host</div>
          </div>
        </div>
        {them ? (
          <div className="gn-chip">
            <div className="gn-avatar gn-avatar-them">{them.name[0]?.toUpperCase()}</div>
            <div>
              <div className="gn-chip-name">{them.name}</div>
              <div className="gn-chip-sub">Partner ✓</div>
            </div>
          </div>
        ) : (
          <div className="gn-chip gn-chip-ghost">
            <div className="gn-avatar gn-avatar-empty">?</div>
            <div>
              <div className="gn-chip-name">Waiting for partner…</div>
              <div className="gn-chip-sub">Tell them the code!</div>
            </div>
          </div>
        )}
        <div className="gn-dots">
          <span className="gn-dot"/><span className="gn-dot"/><span className="gn-dot"/>
          <span>Waiting for partner to join</span>
        </div>
      </div>
    </div>
  );
}

// ── Landing (name + code entry) ────────────────────────────────────────────
interface LandingProps {
  gameName: string;
  gameEmoji: string;
  myName: string;
  code: string;
  error: string;
  loading: boolean;
  onNameChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onBack: () => void;
}

export function GameLanding({
  gameName, gameEmoji, myName, code, error, loading,
  onNameChange, onCodeChange, onCreate, onJoin, onBack,
}: LandingProps) {
  return (
    <div className="gn-content">
      <button className="gn-btn gn-btn-ghost" style={{ marginBottom: 8 }} onClick={onBack}>← Back</button>
      <div className="gn-logo gn-logo-sm">{gameEmoji} {gameName}</div>
      <div className="gn-tagline" style={{ marginBottom: 20 }}>Enter your name and a room code to play</div>
      <div className="gn-card">
        <input className="gn-inp" placeholder="Your name"
          value={myName} onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onCreate()} />
        <input className="gn-inp" placeholder="Room code (e.g. LOVE23)"
          value={code} maxLength={12}
          onChange={e => onCodeChange(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && onCreate()} />
        {error && <div className="gn-err">{error}</div>}
        <button className="gn-btn gn-btn-primary" disabled={loading} onClick={onCreate}>
          {loading ? "Creating…" : "✨ Create Room"}
        </button>
        <div className="gn-divider">or</div>
        <button className="gn-btn gn-btn-secondary" disabled={loading} onClick={onJoin}>
          {loading ? "Joining…" : "🚪 Join Room"}
        </button>
        <p className="gn-hint">The host creates, the partner joins with the same code!</p>
      </div>
    </div>
  );
}

// ── Score bar ──────────────────────────────────────────────────────────────
interface ScoreBarProps {
  meName: string;
  themName: string;
  myScore: number;
  themScore: number;
  myColor: string;
  themColor: string;
  round: number;
  totalRounds: number;
}
export function ScoreBar({ meName, themName, myScore, themScore, myColor, themColor, round, totalRounds }: ScoreBarProps) {
  return (
    <>
      <div className="gn-round-pill"><span>Round {round} of {totalRounds}</span></div>
      <div className="gn-scorebar">
        <div className="gn-spl">
          <div className="gn-spl-name">{meName}</div>
          <div className="gn-spl-score" style={{ color: myColor }}>{myScore}</div>
        </div>
        <div className="gn-vs">vs</div>
        <div className="gn-spl">
          <div className="gn-spl-name">{themName}</div>
          <div className="gn-spl-score" style={{ color: themColor }}>{themScore}</div>
        </div>
      </div>
    </>
  );
}

// ── Game over screen ───────────────────────────────────────────────────────
interface GameOverProps {
  meName: string;
  themName: string;
  myScore: number;
  themScore: number;
  totalRounds: number;
  isHost: boolean;
  code: string;
  onPlayAgain: () => void;
  onBack: () => void;
}
export function GameOver({ meName, themName, myScore, themScore, totalRounds, isHost, code, onPlayAgain, onBack }: GameOverProps) {
  const iWon = myScore > themScore;
  const tie  = myScore === themScore;
  return (
    <div className="gn-content">
      <div className="gn-card" style={{ alignItems: "center", gap: 0 }}>
        <span className="gn-result-emoji">{tie ? "🤝" : iWon ? "🎉" : "💙"}</span>
        <div className="gn-result-title" style={{ marginBottom: 4, background: "linear-gradient(135deg, var(--gold), var(--pink))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {tie ? "It's a Tie!" : iWon ? "You Won!" : `${themName} Won!`}
        </div>
        <p className="gn-small gn-muted gn-center" style={{ marginBottom: 16 }}>After {totalRounds} rounds</p>
        <div className="gn-final-wrap" style={{ width: "100%" }}>
          <div className={`gn-final-card ${iWon && !tie ? "winner" : ""}`}>
            <div className="gn-final-name">{meName} {iWon && !tie ? "👑" : ""}</div>
            <div className="gn-final-pts">{myScore}</div>
          </div>
          <div className={`gn-final-card ${!iWon && !tie ? "winner" : ""}`}>
            <div className="gn-final-name">{themName} {!iWon && !tie ? "👑" : ""}</div>
            <div className="gn-final-pts">{themScore}</div>
          </div>
        </div>
        {isHost ? (
          <button className="gn-btn gn-btn-primary" style={{ width: "100%" }} onClick={onPlayAgain}>🔁 Play Again</button>
        ) : (
          <div className="gn-dots" style={{ marginTop: 8 }}>
            <span className="gn-dot"/><span className="gn-dot"/><span className="gn-dot"/>
            <span>Waiting for host to restart…</span>
          </div>
        )}
        <button className="gn-btn gn-btn-ghost" style={{ marginTop: 8 }} onClick={onBack}>← Back to Hub</button>
        <p className="gn-hint">Room: <strong style={{ color: "var(--gold)" }}>{code}</strong></p>
      </div>
    </div>
  );
}
