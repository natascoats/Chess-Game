// =========================
// PIECE CLASSES
// =========================

class Piece {
  constructor(color, position) {
    this.color = color; // "white" or "black"
    this.position = [...position]; // [row, col]
    this.hasMoved = false;
  }

  getLegalMoves(board) {
    return [];
  }
}

class Pawn extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = "Pawn";
    this.isSecretQueen = false;
    this.isRevealed = false;
  }

  getPawnMovesOnly(board) {
    const moves = [];
    const [row, col] = this.position;
    const direction = this.color === "white" ? -1 : 1;
    const startRow = this.color === "white" ? 6 : 1;

    // Forward 1
    if (board.isInBounds(row + direction, col) && board.getPieceAt([row + direction, col]) === null) {
      moves.push([row + direction, col]);
      // Forward 2
      if (row === startRow && board.getPieceAt([row + 2 * direction, col]) === null) {
        moves.push([row + 2 * direction, col]);
      }
    }

    // Diagonal capture
    for (const dc of [-1, 1]) {
      const newRow = row + direction;
      const newCol = col + dc;
      if (board.isInBounds(newRow, newCol)) {
        const target = board.getPieceAt([newRow, newCol]);
        if (target && target.color !== this.color) {
          moves.push([newRow, newCol]);
        }
      }
    }

    return moves;
  }

  getLegalMoves(board) {
    if (this.isSecretQueen && this.isRevealed) {
      return new Queen(this.color, this.position).getLegalMoves(board);
    }
    return this.getPawnMovesOnly(board);
  }
}

class Rook extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = "Rook";
  }

  getLegalMoves(board) {
    const moves = [];
    const [row, col] = this.position;
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (board.isInBounds(r, c)) {
        const target = board.getPieceAt([r, c]);
        if (target === null) {
          moves.push([r, c]);
        } else {
          if (target.color !== this.color) moves.push([r, c]);
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return moves;
  }
}

class Knight extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = "Knight";
  }

  getLegalMoves(board) {
    const moves = [];
    const [row, col] = this.position;
    const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

    for (const [dr, dc] of knightMoves) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (board.isInBounds(newRow, newCol)) {
        const target = board.getPieceAt([newRow, newCol]);
        if (target === null || target.color !== this.color) {
          moves.push([newRow, newCol]);
        }
      }
    }
    return moves;
  }
}

class Bishop extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = "Bishop";
  }

  getLegalMoves(board) {
    const moves = [];
    const [row, col] = this.position;
    const directions = [[-1,-1],[-1,1],[1,-1],[1,1]];

    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (board.isInBounds(r, c)) {
        const target = board.getPieceAt([r, c]);
        if (target === null) {
          moves.push([r, c]);
        } else {
          if (target.color !== this.color) moves.push([r, c]);
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return moves;
  }
}

class Queen extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = "Queen";
  }

  getLegalMoves(board) {
    const rookMoves = new Rook(this.color, this.position).getLegalMoves(board);
    const bishopMoves = new Bishop(this.color, this.position).getLegalMoves(board);
    return [...rookMoves, ...bishopMoves];
  }
}

class King extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = "King";
  }

  getLegalMoves(board) {
    const moves = [];
    const [row, col] = this.position;
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (board.isInBounds(newRow, newCol)) {
        const target = board.getPieceAt([newRow, newCol]);
        if (target === null || target.color !== this.color) {
          moves.push([newRow, newCol]);
        }
      }
    }
    return moves;
  }
}

// =========================
// BOARD CLASS
// =========================

class Board {
  constructor() {
    this.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.pieces = [];
    this.initializeBoard();
  }

  isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  getPieceAt(position) {
    const [row, col] = position;
    return this.grid[row][col];
  }

  placePiece(piece) {
    const [row, col] = piece.position;
    this.grid[row][col] = piece;
    this.pieces.push(piece);
  }

  initializeBoard() {
    for (let col = 0; col < 8; col++) {
      this.placePiece(new Pawn("white", [6, col]));
      this.placePiece(new Pawn("black", [1, col]));
    }
    // Rooks
    this.placePiece(new Rook("white", [7, 0]));
    this.placePiece(new Rook("white", [7, 7]));
    this.placePiece(new Rook("black", [0, 0]));
    this.placePiece(new Rook("black", [0, 7]));
    // Knights
    this.placePiece(new Knight("white", [7, 1]));
    this.placePiece(new Knight("white", [7, 6]));
    this.placePiece(new Knight("black", [0, 1]));
    this.placePiece(new Knight("black", [0, 6]));
    // Bishops
    this.placePiece(new Bishop("white", [7, 2]));
    this.placePiece(new Bishop("white", [7, 5]));
    this.placePiece(new Bishop("black", [0, 2]));
    this.placePiece(new Bishop("black", [0, 5]));
    // Queens
    this.placePiece(new Queen("white", [7, 3]));
    this.placePiece(new Queen("black", [0, 3]));
    // Kings
    this.placePiece(new King("white", [7, 4]));
    this.placePiece(new King("black", [0, 4]));
  }

  movePiece(startPos, endPos) {
    const piece = this.getPieceAt(startPos);
    if (!piece) return false;

    const target = this.getPieceAt(endPos);
    if (target) {
      this.pieces = this.pieces.filter(p => p !== target);
    }

    this.grid[startPos[0]][startPos[1]] = null;
    this.grid[endPos[0]][endPos[1]] = piece;
    piece.position = [...endPos];
    piece.hasMoved = true;
    return true;
  }

  // Serialize board to a plain object for Firebase
  serialize() {
    const cells = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.grid[row][col];
        if (piece) {
          cells.push({
            row, col,
            type: piece.type,
            color: piece.color,
            hasMoved: piece.hasMoved,
            isSecretQueen: piece.isSecretQueen || false,
            isRevealed: piece.isRevealed || false,
          });
        }
      }
    }
    return cells;
  }

  // Deserialize from Firebase data
  static deserialize(cells) {
    const board = new Board();
    // Clear the default setup
    board.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    board.pieces = [];

    for (const cell of cells) {
      let piece;
      switch (cell.type) {
        case "Pawn":   piece = new Pawn(cell.color, [cell.row, cell.col]); break;
        case "Rook":   piece = new Rook(cell.color, [cell.row, cell.col]); break;
        case "Knight": piece = new Knight(cell.color, [cell.row, cell.col]); break;
        case "Bishop": piece = new Bishop(cell.color, [cell.row, cell.col]); break;
        case "Queen":  piece = new Queen(cell.color, [cell.row, cell.col]); break;
        case "King":   piece = new King(cell.color, [cell.row, cell.col]); break;
      }
      if (piece) {
        piece.hasMoved = cell.hasMoved;
        if (piece instanceof Pawn) {
          piece.isSecretQueen = cell.isSecretQueen;
          piece.isRevealed = cell.isRevealed;
        }
        board.grid[cell.row][cell.col] = piece;
        board.pieces.push(piece);
      }
    }
    return board;
  }
}

// =========================
// GAME CLASS
// =========================

class Game {
  constructor() {
    this.board = new Board();
    this.currentPlayer = "white";
    this.gameOver = false;
    this.lastMove = null; // { from: [r,c], to: [r,c], pieceType, color, wasReveal }
  }

  handleMove(startPos, endPos) {
    const piece = this.board.getPieceAt(startPos);
    if (!piece) return false;
    if (piece.color !== this.currentPlayer) return false;

    // Secret Queen logic
    let wasReveal = false;
    if (piece instanceof Pawn && piece.isSecretQueen && !piece.isRevealed) {
      const pawnMoves = piece.getPawnMovesOnly(this.board);
      const queenMoves = new Queen(piece.color, piece.position).getLegalMoves(this.board);

      const inPawnMoves = pawnMoves.some(m => m[0] === endPos[0] && m[1] === endPos[1]);
      const inQueenMoves = queenMoves.some(m => m[0] === endPos[0] && m[1] === endPos[1]);

      if (inQueenMoves && !inPawnMoves) {
        piece.isRevealed = true;
        wasReveal = true;
      }
    }

    // Validate move
    let legalMoves;
    if (piece instanceof Pawn && piece.isSecretQueen && !piece.isRevealed) {
      const pawnMoves = piece.getPawnMovesOnly(this.board);
      const queenMoves = new Queen(piece.color, piece.position).getLegalMoves(this.board);
      const combined = [...pawnMoves];
      for (const m of queenMoves) {
        if (!combined.some(e => e[0] === m[0] && e[1] === m[1])) combined.push(m);
      }
      legalMoves = combined;
    } else {
      legalMoves = piece.getLegalMoves(this.board);
    }

    const isLegal = legalMoves.some(m => m[0] === endPos[0] && m[1] === endPos[1]);
    if (!isLegal) return false;

    const pieceType = piece.type;
    const success = this.board.movePiece(startPos, endPos);
    if (!success) return false;

    // Record last move for opponent display
    this.lastMove = {
      from: [...startPos],
      to: [...endPos],
      pieceType,
      color: this.currentPlayer,
      wasReveal,
    };

    this.switchTurn();
    return true;
  }

  getLegalMovesForPiece(piece) {
    if (piece instanceof Pawn && piece.isSecretQueen && !piece.isRevealed) {
      const pawnMoves = piece.getPawnMovesOnly(this.board);
      const queenMoves = new Queen(piece.color, piece.position).getLegalMoves(this.board);
      const combined = [...pawnMoves];
      for (const m of queenMoves) {
        if (!combined.some(e => e[0] === m[0] && e[1] === m[1])) combined.push(m);
      }
      return combined;
    }
    return piece.getLegalMoves(this.board);
  }

  switchTurn() {
    this.currentPlayer = this.currentPlayer === "white" ? "black" : "white";
  }

  serialize() {
    return {
      board: this.board.serialize(),
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      lastMove: this.lastMove,
    };
  }

  static deserialize(data) {
    const game = new Game();
    game.board = Board.deserialize(data.board);
    game.currentPlayer = data.currentPlayer;
    game.gameOver = data.gameOver;
    game.lastMove = data.lastMove || null;
    return game;
  }
}
