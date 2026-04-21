// =========================
// UI + GAME CONTROLLER
// =========================

import { createGame, joinGame, pushGameState, listenToGame } from "./firebase.js";

// Piece unicode symbols
const PIECE_UNICODE = {
  white: { King: "♔", Queen: "♕", Rook: "♖", Bishop: "♗", Knight: "♘", Pawn: "♙" },
  black: { King: "♚", Queen: "♛", Rook: "♜", Bishop: "♝", Knight: "♞", Pawn: "♟" },
};

// =========================
// STATE
// =========================

let game = null;
let gameId = null;
let myColor = null; // "white" or "black"
let phase = "lobby"; // lobby | select_white_pawn | select_black_pawn | playing | game_over
let selectedSquare = null;
let legalMovesCache = [];
let lastMoveHighlight = null; // { from, to }
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
const gameIdDisplay = document.getElementById("game-id-display");
const myColorDisplay = document.getElementById("my-color-display");

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
      setStatus("Click one of your pawns to designate it as your Secret Queen.");
    } else {
      setStatus("Waiting for White to select their Secret Queen pawn...");
    }
  } else if (phase === "select_black_pawn") {
    turnEl.textContent = "Setup — Black's turn";
    if (myColor === "black") {
      setStatus("Click one of your pawns to designate it as your Secret Queen.");
    } else {
      setStatus("Waiting for Black to select their Secret Queen pawn...");
    }
  } else if (phase === "playing") {
    const isMyTurn = game.currentPlayer === myColor;
    turnEl.textContent = `${capitalize(game.currentPlayer)}'s turn${isMyTurn ? " (You)" : ""}`;
    if (isMyTurn) {
      setStatus("Your turn. Click a piece to select it.");
    } else {
      setStatus(`Waiting for ${capitalize(game.currentPlayer)} to move...`);
    }
    renderLastMove();
  } else if (phase === "game_over") {
    turnEl.textContent = "Game Over";
  }
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function renderLastMove() {
  if (!game.lastMove) {
    lastMoveEl.textContent = "No moves yet.";
    return;
  }
  const m = game.lastMove;
  const from = squareLabel(m.from);
  const to = squareLabel(m.to);
  let text = `${capitalize(m.color)}'s ${m.pieceType}: ${from} → ${to}`;
  if (m.wasReveal) text += " ✦ Secret Queen Revealed!";
  lastMoveEl.textContent = text;
  lastMoveHighlight = { from: m.from, to: m.to };
}

function squareLabel([row, col]) {
  const files = ["a","b","c","d","e","f","g","h"];
  return `${files[col]}${8 - row}`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// =========================
// FIREBASE LISTENER
// =========================

function startListening() {
  if (unsubscribe) unsubscribe();
  unsubscribe = listenToGame(gameId, (data) => {
    game = Game.deserialize(data);
    phase = data.phase;
    lastMoveHighlight = game.lastMove ? { from: game.lastMove.from, to: game.lastMove.to } : null;
    renderBoard();
    updateSidebar();
  });
}

// =========================
// BOARD RENDERING
// =========================

function renderBoard() {
  boardEl.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.className = "square";
      square.dataset.row = row;
      square.dataset.col = col;

      // Base color
      square.classList.add((row + col) % 2 === 0 ? "light" : "dark");

      // Last move highlight
      if (lastMoveHighlight) {
        const { from, to } = lastMoveHighlight;
        if ((from[0] === row && from[1] === col) || (to[0] === row && to[1] === col)) {
          square.classList.add("last-move");
        }
      }

      // Selected square
      if (selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col) {
        square.classList.add("selected");
      }

      // Legal move indicator
      const isLegal = legalMovesCache.some(m => m[0] === row && m[1] === col);
      if (isLegal) {
        const piece = game.board.getPieceAt([row, col]);
        const dot = document.createElement("div");
        dot.className = piece ? "capture-ring" : "legal-dot";
        square.appendChild(dot);
      }

      // Reveal flash
      if (revealFlashSquare && revealFlashSquare[0] === row && revealFlashSquare[1] === col) {
        square.classList.add("reveal-flash");
      }

      // Piece
      const piece = game.board.getPieceAt([row, col]);
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${piece.color}`;
        // Show secret queen indicator only to its owner
        let symbol = PIECE_UNICODE[piece.color][piece.type];
        if (piece.isSecretQueen && !piece.isRevealed && piece.color === myColor) {
          pieceEl.classList.add("secret-queen");
        }
        pieceEl.textContent = symbol;
        square.appendChild(pieceEl);
      }

      // Coordinate label
      if (col === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "coord rank";
        rankLabel.textContent = 8 - row;
        square.appendChild(rankLabel);
      }
      if (row === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "coord file";
        fileLabel.textContent = ["a","b","c","d","e","f","g","h"][col];
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
    trySelectSecretPawn([row, col], "white");
    return;
  }
  if (phase === "select_black_pawn" && myColor === "black") {
    trySelectSecretPawn([row, col], "black");
    return;
  }
  if (phase === "playing" && game.currentPlayer === myColor) {
    handleGameplayClick([row, col]);
  }
}

function trySelectSecretPawn(pos, color) {
  const piece = game.board.getPieceAt(pos);
  if (!piece || piece.color !== color || piece.type !== "Pawn") {
    setStatus(`${capitalize(color)}: please click one of your own pawns.`);
    return;
  }
  piece.isSecretQueen = true;
  const newPhase = color === "white" ? "select_black_pawn" : "playing";
  pushGameState(gameId, game, newPhase);
}

function handleGameplayClick(pos) {
  const piece = game.board.getPieceAt(pos);

  // Nothing selected yet
  if (!selectedSquare) {
    if (!piece || piece.color !== myColor) return;
    selectedSquare = pos;
    legalMovesCache = game.getLegalMovesForPiece(piece);
    renderBoard();
    return;
  }

  // Click same square → deselect
  if (selectedSquare[0] === pos[0] && selectedSquare[1] === pos[1]) {
    selectedSquare = null;
    legalMovesCache = [];
    renderBoard();
    return;
  }

  // Click another own piece → switch selection
  if (piece && piece.color === myColor) {
    selectedSquare = pos;
    legalMovesCache = game.getLegalMovesForPiece(piece);
    renderBoard();
    return;
  }

  // Attempt move
  const isLegal = legalMovesCache.some(m => m[0] === pos[0] && m[1] === pos[1]);
  if (isLegal) {
    const startPos = selectedSquare;
    const success = game.handleMove(startPos, pos);
    if (success) {
      // Check for reveal flash
      if (game.lastMove && game.lastMove.wasReveal) {
        revealFlashSquare = pos;
        if (revealFlashTimeout) clearTimeout(revealFlashTimeout);
        revealFlashTimeout = setTimeout(() => {
          revealFlashSquare = null;
          renderBoard();
        }, 1200);
      }
      pushGameState(gameId, game, "playing");
    } else {
      setStatus("Illegal move.");
    }
  }

  selectedSquare = null;
  legalMovesCache = [];
  renderBoard();
  updateSidebar();
}

// =========================
// INIT
// =========================

renderBoard();
