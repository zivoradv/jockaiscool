# Game Night 💕

A couples game hub with 3 real-time 1v1 games built with Next.js, TypeScript & Firebase.

## Games
- 💨 **Word Race** — Race to unscramble the same word
- 🟩 **Wordle 1v1** — Both guess the same hidden word, first to solve wins
- ⚔️ **Card Battle** — Turn-based card game with attack/heal/shield/poison cards

---

## Files to add to your project

```
app/
  globals.css          ← Shared styles & CSS variables
  layout.tsx           ← Root layout
  page.tsx             ← Main routing (Hub → Game)

components/
  Hub.tsx              ← Game selection screen
  Shared.tsx           ← Reusable components (Stars, Lobby, ScoreBar etc.)
  WordRace.tsx         ← Word Race game
  Wordle.tsx           ← 1v1 Wordle game
  CardBattle.tsx       ← Card Battle game

lib/
  firebase.ts          ← Firebase initialization

types/
  game.ts              ← All TypeScript types
```

---

## Setup

### 1. Install Firebase
```bash
npm install firebase
```

### 2. Create a Firebase project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it (e.g. `gf-wordle`)
3. In the sidebar → **Build → Realtime Database → Create Database**
4. Choose a region → **Start in Test Mode**

### 3. Get your config
- **Project Settings** (⚙️ gear icon) → **Your apps** → click **</>** to register a web app
- Copy the `firebaseConfig` values

### 4. Add environment variables
Create `.env.local` in your project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.region.firebasedatabase.app/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Run locally
```bash
npm run dev
```

---

## Deploy to Netlify
1. Push to GitHub
2. **Netlify → Add new site → Import from GitHub**
3. Build command: `npm run build` · Publish dir: `.next`
4. **Site settings → Environment variables** → add all `NEXT_PUBLIC_FIREBASE_*` values
5. Deploy! 🚀

---

## How to play
1. **You** open the site → pick a game → enter name + room code → **Create Room**
2. **Partner** opens same URL → picks same game → same room code → **Join Room**
3. Play! The person who creates is always the "host" (controls round advancement)

### Card Battle cards
| Card | Attack | Effect |
|------|--------|--------|
| Strike | 3 | — |
| Heavy Blow | 5 | — |
| Quick Jab | 1 | — |
| Power Slash | 6 | — |
| Fireball 🔥 | 8 | — |
| Heal 💚 | — | +5 HP |
| Shield 🛡️ | — | Block next attack |
| Poison Dart ☠️ | 2 | +2 poison for 2 turns |
| Drain 🩸 | 3 | Deal 3, heal 2 |
| Double Hit ⚡ | 2×2 | Hits twice |
