import { PlayerSymbol, AiDifficulty } from '../types/game';

const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Col 1
  [1, 4, 7], // Col 2
  [2, 5, 8], // Col 3
  [0, 4, 8], // Diagonal 1
  [2, 4, 6], // Diagonal 2
];

export function checkWinner(board: (PlayerSymbol | null)[]): {
  winner: PlayerSymbol | 'draw' | null;
  line: number[] | null;
} {
  for (const line of WINNING_COMBINATIONS) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as PlayerSymbol, line };
    }
  }

  // Check draw
  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

export function getAvailableMoves(board: (PlayerSymbol | null)[]): number[] {
  const moves: number[] = [];
  board.forEach((cell, index) => {
    if (cell === null) {
      moves.push(index);
    }
  });
  return moves;
}

// Minimax evaluation function
function minimax(
  board: (PlayerSymbol | null)[],
  depth: number,
  isMaximizing: boolean,
  aiSymbol: PlayerSymbol,
  humanSymbol: PlayerSymbol,
  alpha: number = -Infinity,
  beta: number = Infinity
): number {
  const result = checkWinner(board);

  if (result.winner === aiSymbol) {
    return 10 - depth; // Prefer faster wins
  }
  if (result.winner === humanSymbol) {
    return depth - 10; // Prefer slower losses
  }
  if (result.winner === 'draw') {
    return 0;
  }

  const availableMoves = getAvailableMoves(board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of availableMoves) {
      board[move] = aiSymbol;
      const evaluation = minimax(board, depth + 1, false, aiSymbol, humanSymbol, alpha, beta);
      board[move] = null;
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of availableMoves) {
      board[move] = humanSymbol;
      const evaluation = minimax(board, depth + 1, true, aiSymbol, humanSymbol, alpha, beta);
      board[move] = null;
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Find best move for AI
export function getBestMoveMinimax(
  board: (PlayerSymbol | null)[],
  aiSymbol: PlayerSymbol
): number {
  const humanSymbol: PlayerSymbol = aiSymbol === 'X' ? 'O' : 'X';
  const availableMoves = getAvailableMoves(board);

  if (availableMoves.length === 0) return -1;
  if (availableMoves.length === 9) {
    // Opening move: Center or corners are best
    const openings = [0, 2, 4, 6, 8];
    return openings[Math.floor(Math.random() * openings.length)];
  }

  let bestVal = -Infinity;
  let bestMoves: number[] = [];

  for (const move of availableMoves) {
    board[move] = aiSymbol;
    const moveVal = minimax(board, 0, false, aiSymbol, humanSymbol);
    board[move] = null;

    if (moveVal > bestVal) {
      bestVal = moveVal;
      bestMoves = [move];
    } else if (moveVal === bestVal) {
      bestMoves.push(move);
    }
  }

  // Pick randomly among equally optimal moves for natural variety
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// Select move based on chosen difficulty
export function getAiMove(
  board: (PlayerSymbol | null)[],
  aiSymbol: PlayerSymbol,
  difficulty: AiDifficulty = 'hard'
): number {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return -1;

  if (difficulty === 'easy') {
    // 80% random move, 20% optimal
    const isRandom = Math.random() < 0.8;
    if (isRandom) {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
    return getBestMoveMinimax(board, aiSymbol);
  }

  if (difficulty === 'medium') {
    // 40% random move, 60% optimal
    const isRandom = Math.random() < 0.4;
    if (isRandom) {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
    return getBestMoveMinimax(board, aiSymbol);
  }

  // Hard: 100% Unbeatable Minimax
  return getBestMoveMinimax(board, aiSymbol);
}
