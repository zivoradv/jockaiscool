// ── Shared ─────────────────────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
}

export type GameType = "word-race" | "wordle" | "card-battle";
export type GameStatus = "lobby" | "playing" | "result" | "gameover";

// ── Word Race ───────────────────────────────────────────────────────────────
export interface WordRaceRoom {
  host: string;
  players: Player[];
  scores: Record<string, number>;
  word: string;
  scrambled: string;
  round: number;
  status: GameStatus;
  roundWinner: string | null;
}

export interface WordRaceGuess {
  guess: string;
  correct: boolean;
  time: number;
  round: number;
}

// ── Wordle ──────────────────────────────────────────────────────────────────
export type TileColor = "green" | "yellow" | "grey" | "empty" | "active";

export interface WordleGuessRow {
  word: string;
  colors: TileColor[];
}

export interface WordleRoom {
  host: string;
  players: Player[];
  scores: Record<string, number>;
  word: string;
  round: number;
  status: GameStatus;
  roundWinner: string | null;
  done: Record<string, boolean>;
  solvedIn: Record<string, number>; // -1 = failed
}

export interface WordleBoard {
  guesses: WordleGuessRow[];
  solved: boolean;
  failed: boolean;
}

// ── Card Battle ─────────────────────────────────────────────────────────────
export type CardEffect = "none" | "heal" | "shield" | "poison" | "drain" | "double";

export interface Card {
  id: string;
  name: string;
  attack: number;
  effect: CardEffect;
  emoji: string;
  color: string;
  description: string;
}

export interface CardBattleRoom {
  host: string;
  players: Player[];
  status: "lobby" | "playing" | "gameover";
  turn: string;
  hp: Record<string, number>;
  shields: Record<string, boolean>;
  poison: Record<string, number>;
  lastPlayed: { pid: string; card: Card } | null;
  winner: string | null;
  handSizes: Record<string, number>;
  totalCards: number;
}

export interface CardBattleHand {
  hand: Card[];
  deck: Card[];
}
