# 🧠 Quizoo - Real-Time Multiplayer Academic Battle Arena

Welcome to **Quizoo**, an interactive, real-time multiplayer quiz and academic battle platform built inside **InvertisPrep**.

Quizoo is designed with a high-energy **Indigo, Purple, and White** color theme. Students can host private room battles, join live quizzes using a 6-digit PIN, play quick matches against AI bots, compete on a live Hall of Fame leaderboard, and earn **QCoins**!

---

## 🎨 Theme & Color Palette

- **Primary Background**: Deep Indigo (`bg-indigo-950`, `bg-indigo-900`, `bg-slate-900`).
- **Surface Cards**: Pure White (`bg-white/95`) with smooth glassmorphism (`backdrop-blur-md`).
- **Gradients**: Electric Indigo, Purple, and Pink (`from-indigo-600 via-purple-600 to-indigo-800`).
- **Highlights & Accents**: Bright Indigo (`text-indigo-400`), Electric Purple (`text-purple-400`), crisp Slate (`text-slate-900`).

---

## 🎮 Game Modes

### 1. ⚔️ 1v1 Head-to-Head Multiplayer Duel
- Real-time 1-on-1 battle mode (`mode: '1v1'`).
- Pairs you against a live online student or 1v1 AI Rival (*RivalBot ⚔️*).
- Live **1v1 Head-to-Head Score Clash Bar** displaying real-time points lead.
- 5 rapid questions with speed bonus score calculations.

### 2. Host Group Battle Room
- Generates a unique **6-digit PIN code** (e.g., `849201`).
- Select any course or subject category (Computer Science, Management, Biotech, Law, Pharmacy, Agriculture, Engineering Math, Aptitude, PYQ Special).
- Choose question timer (10s, 15s, 30s) and total question count (5 to 15 questions).
- Toggle automated **AI Bot Opponents** (e.g., *ByteBot 🤖*, *LogicWizard 🧙‍♂️*, *CyberNova ⚡*).

### 3. Join Room (PIN Access)
- Enter 6-digit room PIN code.
- Customize player nickname and animated avatar emoji (`⚡`, `🚀`, `🧙‍♂️`, `👑`, `🎯`, `🔥`, `🏆`, `💎`).

### 4. Quick Solo Match
- 1-click play against AI bot opponents with varying difficulty levels.

---

## ⚡ Key Features

- **Dynamic Database Courses**: Queries active `Department` documents directly from MongoDB so every course (CS, BBA/MBA, Biotech, Law, Pharmacy, Agriculture, Math, etc.) populates dynamically into Quizoo.
- **Live Quiz Arena**:
  - Animated circular countdown timer.
  - Consecutive correct answer streak multiplier (🔥 2x / 3x points bonus).
  - Speed bonus calculation (up to +400 pts for fast responses).
  - Solution explanation box displayed immediately after locking in an answer.
- **Web Audio API Sound Synthesizer**: Zero-dependency synthesizer producing crisp audio for clicks, timer ticks, correct chimes, wrong buzzes, and victory fanfare.
- **Victory Podium & Confetti**: 3D 1st, 2nd, and 3rd place podiums with gold/silver/bronze badges, animated victory confetti (`canvas-confetti`), and QCoin rewards.

---

## 🏗️ Architecture & Component Layout

```
InvertisPrep/
├── client/
│   ├── app/quizz0/page.tsx       # Main Multiplayer Quizoo React Application
│   ├── lib/quizooApi.ts          # Axios REST API helpers & TypeScript types
│   ├── lib/quizooSound.ts        # Web Audio API Synthesizer
│   └── types/canvas-confetti.d.ts# Confetti TypeScript declarations
│
└── server/
    └── src/
        ├── models/Quizoo.js      # Mongoose Schema for Questions & User Stats
        ├── controllers/quizooController.js # Category, Room & Leaderboard logic
        ├── routes/quizoo.js      # Express API Router (/api/quizoo/*)
        └── services/quizooSocket.js # Socket.io Real-Time Room & Bot Handler
```

---

## 🔌 Socket.io Real-Time Events

| Event | Direction | Description |
|---|---|---|
| `join_room` | Client ➔ Server | Player joins a room using room PIN & avatar |
| `room_updated` | Server ➔ Client | Broadcasts updated list of players & ready status |
| `start_game` | Client ➔ Server | Host triggers game start for all joined players |
| `game_started` | Server ➔ Client | Notifies all room players that quiz arena is live |
| `submit_answer` | Client ➔ Server | Submits answer option & speed time taken |
| `player_answered` | Server ➔ Client | Broadcasts live player score update & streak |
| `next_question` | Client ➔ Server | Host advances to the next question |
| `game_finished` | Server ➔ Client | Triggers final scores, podium, and victory fanfare |

---

## 📡 REST API Reference

### 1. Get Categories
- **GET** `/api/quizoo/categories`
- **Response**: List of dynamic categories merged from MongoDB `Department` collection.

### 2. Create Room
- **POST** `/api/quizoo/rooms/create`
- **Body**: `{ category: "cs", timePerQuestion: 15, totalQuestions: 5, addBots: true, isPublic: true }`

### 3. Get Room Details
- **GET** `/api/quizoo/rooms/:pin`

### 4. Get Hall of Fame Leaderboard
- **GET** `/api/quizoo/leaderboard`

### 5. Complete Quiz & Earn QCoins
- **POST** `/api/quizoo/complete`
- **Body**: `{ score: 1250, totalQuestions: 5, correctAnswers: 4, bestStreak: 3 }`

---

## 🚀 How to Run Locally

1. **Start Backend Server**:
   ```bash
   cd server
   npm run dev
   ```
   *The server runs on http://localhost:5000 with Socket.io enabled.*

2. **Start Frontend Next.js Client**:
   ```bash
   cd client
   npm run dev
   ```
   *The frontend runs on http://localhost:3000.*

3. **Navigate to Quizoo**:
   Open [http://localhost:3000/quizz0](http://localhost:3000/quizz0) or click **Quizzo** in the navigation menu.
