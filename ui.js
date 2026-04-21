// =========================
// UI + GAME CONTROLLER
// =========================

import { createGame, joinGame, pushGameState, listenToGame } from "./firebase.js";

// =========================
// PIECE SKINS
// =========================

const SKINS = {
  classic: {
    label: "Classic",
    font: "'Segoe UI Symbol', 'DejaVu Sans', sans-serif",
    white: { King: "♔", Queen: "♕", Rook: "♖", Bishop: "♗", Knight: "♘", Pawn: "♙" },
    black: { King: "♚", Queen: "♛", Rook: "♜", Bishop: "♝", Knight: "♞", Pawn: "♟" },
  },
  serif: {
    label: "Serif",
    font: "'Georgia', 'Times New Roman', serif",
    white: { King: "♔", Queen: "♕", Rook: "♖", Bishop: "♗", Knight: "♘", Pawn: "♙" },
    black: { King: "♚", Queen: "♛", Rook: "♜", Bishop: "♝", Knight: "♞", Pawn: "♟" },
  },
  letters: {
    label: "Letters",
    font: "'Cinzel', serif",
    white: { King: "K", Queen: "Q", Rook: "R", Bishop: "B", Knight: "N", Pawn: "P" },
    black: { King: "K", Queen: "Q", Rook: "R", Bishop: "B", Knight: "N", Pawn: "P" },
  },
  minimal: {
    label: "Minimal",
    font: "'Courier New', monospace",
    white: { King: "K", Queen: "Q", Rook: "R", Bishop: "B", Knight: "N", Pawn: "P" },
    black: { King: "k", Queen: "q", Rook: "r", Bishop: "b", Knight: "n", Pawn: "p" },
  },
};

// =========================
// BOARD THEMES
// =========================

const THEMES = {
  classic: { label: "Classic", light: "#f0d9b5", dark: "#b58863" },
  green: { label: "Green Felt", light: "#ffffdd", dark: "#86a666" },
  slate: { label: "Slate", light: "#cdd6e0", dark: "#6d8fa8" },
  midnight: { label: "Midnight", light: "#4a4a6a", dark: "#2a2a4a" },
  contrast: { label: "Contrast", light: "#ffffff", dark: "#333333" },
};

// =========================
// LOCAL PREFERENCES
// =========================

function loadPrefs() {
  try {
    const raw = localStorage.getItem("sqchess-prefs");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePrefs(p) {
  try { localStorage.setItem("sqchess-prefs", JSON.stringify(p)); } catch { }
}

let prefs = { skin: "classic", theme: "classic", flipped: false, sounds: true, ...loadPrefs() };

// =========================
// SOUND ENGINE
// =========================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playSound(type) {
  if (!prefs.sounds) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "select") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    } else if (type === "move") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(); osc.stop(ctx.currentTime + 0.18);
    } else if (type === "capture") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } else if (type === "reveal") {
      [440, 554, 659, 880].forEach((freq, i) => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.value = freq;
        const t = ctx.currentTime + i * 0.1;
        g2.gain.setValueAtTime(0.15, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o2.start(t); o2.stop(t + 0.25);
      });
    }
  } catch { }
}

// =========================
// STATE
// =========================

let game = null;
let gameId = null;
let myColor = null;
let phase = "lobby";
let selectedSquare = null;
let legalMovesCache = [];
let lastMoveHighlight = null;
let revealFlashSquare = null;
let revealFlashTimeout = null;
let unsubscribe = null;

// =========================
// DOM REFERENCES
// =========================

const lobbyScreen = document.getElementById("lobby-screen");
const gameScreen = document.getElementById("game-screen");
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnEl = document.getElementById("turn-indicator");
const lastMoveEl = document.getElementById("last-move");
const lastMoveSquaresEl = document.getElementById("last-move-squares");
const lastMoveFromEl = document.getElementById("last-move-from");
const lastMoveToEl = document.getElementById("last-move-to");
const lastMoveRevealBadge = document.getElementById("last-move-reveal-badge");
const selectionBanner = document.getElementById("selection-banner");
const gameIdDisplay = document.getElementById("game-id-display");
const myColorDisplay = document.getElementById("my-color-display");

// =========================
// THEME
// =========================

function applyTheme() {
  const t = THEMES[prefs.theme] || THEMES.classic;
  document.documentElement.style.setProperty("--light-sq", t.light);
  document.documentElement.style.setProperty("--dark-sq", t.dark);
}

// =========================
// CUSTOMIZATION PANEL
// =========================

function buildCustomPanel() {
  const skinWrap = document.getElementById("skin-options");
  if (skinWrap) {
    skinWrap.innerHTML = "";
    Object.entries(SKINS).forEach(([key, skin]) => {
      const btn = document.createElement("button");
      btn.className = "custom-btn" + (prefs.skin === key ? " active" : "");
      btn.textContent = skin.label;
      btn.addEventListener("click", () => {
        prefs.skin = key; savePrefs(prefs);
        document.querySelectorAll("#skin-options .custom-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderBoard();
      });
      skinWrap.appendChild(btn);
    });
  }

  const themeWrap = document.getElementById("theme-options");
  if (themeWrap) {
    themeWrap.innerHTML = "";
    Object.entries(THEMES).forEach(([key, theme]) => {
      const btn = document.createElement("button");
      btn.className = "custom-btn theme-swatch" + (prefs.theme === key ? " active" : "");
      btn.title = theme.label;
      btn.style.background = `linear-gradient(135deg, ${theme.light} 50%, ${theme.dark} 50%)`;
      btn.addEventListener("click", () => {
        prefs.theme = key; savePrefs(prefs);
        applyTheme();
        document.querySelectorAll("#theme-options .custom-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderBoard();
      });
      themeWrap.appendChild(btn);
    });
  }

  const flipBtn = document.getElementById("btn-flip");
  if (flipBtn) {
    flipBtn.textContent = prefs.flipped ? "Unflip Board" : "Flip Board";
    flipBtn.onclick = () => {
      prefs.flipped = !prefs.flipped; savePrefs(prefs);
      flipBtn.textContent = prefs.flipped ? "Unflip Board" : "Flip Board";
      renderBoard();
    };
  }

  const soundBtn = document.getElementById("btn-sound");
  if (soundBtn) {
    soundBtn.textContent = prefs.sounds ? "Sound: On" : "Sound: Off";
    soundBtn.onclick = () => {
      prefs.sounds = !prefs.sounds; savePrefs(prefs);
      soundBtn.textContent = prefs.sounds ? "Sound: On" : "Sound: Off";
    };
  }
}

// =========================
// LOBBY LOGIC
// =========================

document.getElementById("btn-new-game").addEventListener("click", async () => {
  game = new Game();
  myColor = "white";
  gameId = await createGame(game);
  startListening();
  showGame();
  setPhase("select_white_pawn");
  gameIdDisplay.textContent = gameId;
  myColorDisplay.textContent = "White";
  setStatus("Share the Game ID with your opponent. You are White — click one of your pawns to make it your Secret Queen.");
});

document.getElementById("btn-join-game").addEventListener("click", async () => {
  const input = document.getElementById("join-id-input").value.trim().toUpperCase();
  if (!input) return alert("Enter a Game ID.");
  const data = await joinGame(input);
  if (!data) return alert("Game not found. Check the ID and try again.");
  gameId = input;
  myColor = "black";
  game = Game.deserialize(data);
  phase = data.phase;
  startListening();
  showGame();
  gameIdDisplay.textContent = gameId;
  myColorDisplay.textContent = "Black";
  renderBoard();
  updateSidebar();
});

function showGame() {
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  applyTheme();
  buildCustomPanel();
}

// =========================
// PHASE MANAGEMENT
// =========================

function setPhase(newPhase) {
  phase = newPhase;
  updateSidebar();
}

function updateSidebar() {
  if (phase === "select_white_pawn") {
    turnEl.textContent = "Setup — White's turn";
    if (myColor === "white") {
      selectionBanner.classList.remove("hidden");
      setStatus("Designate your Secret Queen — choose wisely.");
    } else {
      selectionBanner.classList.add("hidden");
      setStatus("Waiting for White to select their Secret Queen pawn...");
    }
  } else if (phase === "select_black_pawn") {
    turnEl.textContent = "Setup — Black's turn";
    if (myColor === "black") {
      selectionBanner.classList.remove("hidden");
      setStatus("Designate your Secret Queen — choose wisely.");
    } else {
      selectionBanner.classList.add("hidden");
      setStatus("Waiting for Black to select their Secret Queen pawn...");
    }
  } else if (phase === "playing") {
    selectionBanner.classList.add("hidden");
    const isMyTurn = game.currentPlayer === myColor;
    turnEl.textContent = `${capitalize(game.currentPlayer)}'s turn${isMyTurn ? " (You)" : ""}`;
    if (isMyTurn) {
      setStatus("Your turn. Click a piece to select it.");
    } else {
      setStatus(`Waiting for ${capitalize(game.currentPlayer)} to move...`);
    }
    renderLastMove();
  } else if (phase === "game_over") {
    selectionBanner.classList.add("hidden");
    turnEl.textContent = "Game Over";
  }
}

function setStatus(msg) { statusEl.textContent = msg; }

function renderLastMove() {
  if (!game.lastMove) {
    lastMoveEl.textContent = "No moves yet.";
    lastMoveSquaresEl.classList.add("hidden");
    lastMoveRevealBadge.classList.add("hidden");
    return;
  }
  const m = game.lastMove;
  lastMoveEl.textContent = `${capitalize(m.color)}'s ${m.pieceType}`;
  lastMoveFromEl.textContent = squareLabel(m.from);
  lastMoveToEl.textContent = squareLabel(m.to);
  lastMoveSquaresEl.classList.remove("hidden");
  lastMoveRevealBadge.classList[m.wasReveal ? "remove" : "add"]("hidden");
  lastMoveHighlight = { from: m.from, to: m.to };
}

function squareLabel([row, col]) {
  return `${"abcdefgh"[col]}${8 - row}`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// =========================
// FIREBASE LISTENER
// =========================

function startListening() {
  if (unsubscribe) unsubscribe();
  unsubscribe = listenToGame(gameId, (data) => {
    const prevPlayer = game ? game.currentPlayer : null;
    game = Game.deserialize(data);
    phase = data.phase;
    lastMoveHighlight = game.lastMove ? { from: game.lastMove.from, to: game.lastMove.to } : null;

    if (prevPlayer && game.currentPlayer !== prevPlayer && game.lastMove) {
      if (game.lastMove.wasReveal) playSound("reveal");
      else playSound("move");
    }

    renderBoard();
    updateSidebar();
  });
}

// =========================
// BOARD RENDERING
// =========================

function renderBoard() {
  boardEl.innerHTML = "";
  const skin = SKINS[prefs.skin] || SKINS.classic;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const row = prefs.flipped ? 7 - r : r;
      const col = prefs.flipped ? 7 - c : c;

      const square = document.createElement("div");
      square.className = "square";
      square.dataset.row = row;
      square.dataset.col = col;
      square.classList.add((row + col) % 2 === 0 ? "light" : "dark");

      if (lastMoveHighlight) {
        const { from, to } = lastMoveHighlight;
        if (from[0] === row && from[1] === col) square.classList.add("last-move-from");
        if (to[0] === row && to[1] === col) square.classList.add("last-move-to");
      }

      if (selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col) {
        square.classList.add("selected");
      }

      const isLegal = legalMovesCache.some(m => m[0] === row && m[1] === col);
      if (isLegal) {
        const target = game.board.getPieceAt([row, col]);
        const dot = document.createElement("div");
        dot.className = target ? "capture-ring" : "legal-dot";
        square.appendChild(dot);
      }

      if (revealFlashSquare && revealFlashSquare[0] === row && revealFlashSquare[1] === col) {
        square.classList.add("reveal-flash");
      }

      const piece = game.board.getPieceAt([row, col]);
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${piece.color}`;
        pieceEl.style.fontFamily = skin.font;
        if (piece.isSecretQueen && !piece.isRevealed && piece.color === myColor) {
          pieceEl.classList.add("secret-queen");
        }
        const isSelectPhase =
          (phase === "select_white_pawn" && myColor === "white") ||
          (phase === "select_black_pawn" && myColor === "black");
        if (isSelectPhase && piece.color === myColor && piece.type === "Pawn") {
          square.classList.add("secret-selectable");
        }
        pieceEl.textContent = skin[piece.color][piece.type];
        square.appendChild(pieceEl);
      }

      if (c === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "coord rank";
        rankLabel.textContent = prefs.flipped ? row + 1 : 8 - row;
        square.appendChild(rankLabel);
      }
      if (r === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "coord file";
        fileLabel.textContent = "abcdefgh"[col];
        square.appendChild(fileLabel);
      }

      square.addEventListener("click", () => handleSquareClick(row, col));
      boardEl.appendChild(square);
    }
  }
}

// =========================
// CLICK HANDLING
// =========================

function handleSquareClick(row, col) {
  if (phase === "select_white_pawn" && myColor === "white") {
    trySelectSecretPawn([row, col], "white"); return;
  }
  if (phase === "select_black_pawn" && myColor === "black") {
    trySelectSecretPawn([row, col], "black"); return;
  }
  if (phase === "playing" && game.currentPlayer === myColor) {
    handleGameplayClick([row, col]);
  }
}

function trySelectSecretPawn(pos, color) {
  const piece = game.board.getPieceAt(pos);
  if (!piece || piece.color !== color || piece.type !== "Pawn") {
    setStatus(`${capitalize(color)}: please click one of your glowing pawns.`);
    return;
  }
  piece.isSecretQueen = true;
  playSound("select");
  const squareEl = boardEl.querySelector(`[data-row="${pos[0]}"][data-col="${pos[1]}"]`);
  if (squareEl) {
    squareEl.classList.add("secret-chosen");
    setTimeout(() => squareEl.classList.remove("secret-chosen"), 800);
  }
  setStatus("✦ Secret Queen designated. Let the game begin.");
  const newPhase = color === "white" ? "select_black_pawn" : "playing";
  setTimeout(() => pushGameState(gameId, game, newPhase), 400);
}

function handleGameplayClick(pos) {
  const piece = game.board.getPieceAt(pos);

  if (!selectedSquare) {
    if (!piece || piece.color !== myColor) return;
    selectedSquare = pos;
    legalMovesCache = game.getLegalMovesForPiece(piece);
    playSound("select");
    renderBoard();
    return;
  }

  if (selectedSquare[0] === pos[0] && selectedSquare[1] === pos[1]) {
    selectedSquare = null; legalMovesCache = [];
    renderBoard(); return;
  }

  if (piece && piece.color === myColor) {
    selectedSquare = pos;
    legalMovesCache = game.getLegalMovesForPiece(piece);
    playSound("select");
    renderBoard(); return;
  }

  const isLegal = legalMovesCache.some(m => m[0] === pos[0] && m[1] === pos[1]);
  if (isLegal) {
    const isCapture = game.board.getPieceAt(pos) !== null;
    const success = game.handleMove(selectedSquare, pos);
    if (success) {
      if (game.lastMove && game.lastMove.wasReveal) {
        playSound("reveal");
        revealFlashSquare = pos;
        if (revealFlashTimeout) clearTimeout(revealFlashTimeout);
        revealFlashTimeout = setTimeout(() => { revealFlashSquare = null; renderBoard(); }, 1200);
      } else if (isCapture) {
        playSound("capture");
      } else {
        playSound("move");
      }
      pushGameState(gameId, game, "playing");
    } else {
      setStatus("Illegal move.");
    }
  }

  selectedSquare = null; legalMovesCache = [];
  renderBoard(); updateSidebar();
}

// =========================
// INIT
// =========================

applyTheme();
renderBoard();