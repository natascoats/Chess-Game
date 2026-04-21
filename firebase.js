// =========================
// FIREBASE MULTIPLAYER
// =========================
// Replace the config below with your own Firebase project config.
// Instructions for getting this are in the deployment guide.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ⬇️ REPLACE THIS with your Firebase config from the Firebase console
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBzxoOl1N8d54s-_M4qA4XxFQ0fk0WVOW4",
  authDomain: "chessgame-6a436.firebaseapp.com",
  projectId: "chessgame-6a436",
  storageBucket: "chessgame-6a436.firebasestorage.app",
  messagingSenderId: "595416657716",
  appId: "1:595416657716:web:e05351090a1f8ab7c63f61",
  measurementId: "G-ZQP6BVLMKN"
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Each game is stored under a unique gameId in Firestore
// Document path: games/{gameId}

/**
 * Create a new game in Firestore and return the gameId.
 * Called by the first player (white).
 */
export async function createGame(game) {
  const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const gameRef = doc(db, "games", gameId);
  await setDoc(gameRef, {
    ...game.serialize(),
    phase: "select_white_pawn",
    createdAt: Date.now(),
  });
  return gameId;
}

/**
 * Join an existing game. Returns the current game data or null if not found.
 */
export async function joinGame(gameId) {
  const gameRef = doc(db, "games", gameId);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) return null;
  return snap.data();
}

/**
 * Push the current game state to Firestore.
 */
export async function pushGameState(gameId, game, phase, extraData = {}) {
  const gameRef = doc(db, "games", gameId);
  await setDoc(gameRef, {
    ...game.serialize(),
    phase,
    ...extraData,
    updatedAt: Date.now(),
  });
}

/**
 * Listen for real-time changes to the game document.
 * callback(data) is called every time the document changes.
 * Returns an unsubscribe function.
 */
export function listenToGame(gameId, callback) {
  const gameRef = doc(db, "games", gameId);
  return onSnapshot(gameRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
}
