# Secret Queen Chess — Deployment Guide

## Overview

Your project has 4 files:
- `index.html` — the webpage
- `chess.js` — all game logic (ported from Python)
- `ui.js` — click handling, board rendering, last-move display
- `firebase.js` — real-time multiplayer sync
- `style.css` — visual styling

---

## Step 1 — Set Up Firebase

You need Firebase to store game state so two players can sync in real time.

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it `secret-queen-chess` → click through the setup
3. Once inside the project, click **"Firestore Database"** in the left sidebar
4. Click **"Create database"** → choose **"Start in test mode"** → pick any region → click **Enable**
5. Now go to **Project Settings** (gear icon top-left) → scroll down to **"Your apps"**
6. Click the **`</>`** (Web) icon → register the app (name it anything) → copy the `firebaseConfig` object that appears. It looks like this:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...",
};
```

7. Open `firebase.js` in VS Code and **replace the placeholder config** at the top of the file with your actual config values.

---

## Step 2 — Push to GitHub

1. Open VS Code → open the `secret-queen-chess` folder
2. Open the **Source Control** panel (Ctrl+Shift+G / Cmd+Shift+G)
3. Click **"Publish to GitHub"**
4. Choose **Public repository** → name it `secret-queen-chess`
5. Click **Publish**

If you prefer the terminal:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/secret-queen-chess.git
git push -u origin main
```

---

## Step 3 — Deploy on Netlify

1. Go to **https://netlify.com** → log in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → authorize if prompted → select `secret-queen-chess`
4. Leave all build settings blank (no build command, no publish directory — it's plain HTML)
5. Click **"Deploy site"**
6. Netlify gives you a URL like `https://random-name-123.netlify.app`
7. Optional: Click **"Domain settings"** to set a custom name like `secret-queen.netlify.app`

Every time you push to GitHub, Netlify auto-deploys. Same workflow as the Italy site.

---

## Step 4 — Lock Down Firestore (Optional but Recommended)

Right now Firestore is in "test mode" which means anyone can read/write. That's fine for playing with friends but you should tighten it eventually.

In the Firebase console → Firestore → **Rules** tab, replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read, write: if true; // open for now
    }
  }
}
```

This keeps it open but scoped to just the `games` collection. For a more locked-down version later, you'd add Firebase Authentication.

---

## How to Play (Two Players)

1. **Player 1** opens the site, clicks **"Create New Game"**
2. A **6-character Game ID** appears in the sidebar — share it with Player 2
3. **Player 2** opens the site, pastes the Game ID, clicks **"Join"**
4. Player 1 (White) clicks a pawn to designate their Secret Queen
5. Player 2 (Black) does the same
6. Take turns — moves sync in real time via Firebase
7. The **"Opponent's Last Move"** panel shows exactly where they moved

---

## Troubleshooting

**"Game not found"** — Double-check the Game ID (6 capital letters/numbers). Make sure your Firebase config in `firebase.js` is correct.

**Board doesn't update in real time** — Open your browser console (F12). Look for Firebase errors. Usually means the config values are wrong or Firestore rules are blocking reads.

**Pieces don't appear** — Make sure all 4 files are in the same folder and pushed to GitHub together.

**Secret Queen glow not showing** — The glow only appears for the player who owns that piece. Your opponent sees it as a normal pawn until revealed.
