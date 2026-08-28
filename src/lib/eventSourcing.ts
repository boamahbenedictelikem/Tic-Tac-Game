import { GameEvent, PlayerSymbol, ReconstructedGameState } from '../types/game';
import { checkWinner } from './minimax';

export function createEmptyBoard(): (PlayerSymbol | null)[] {
  return Array(9).fill(null);
}

export function getCellCoordinate(cellIndex: number): {
  row: number;
  col: number;
  label: string;
} {
  const row = Math.floor(cellIndex / 3) + 1;
  const col = (cellIndex % 3) + 1;

  const rowNames = ['Top', 'Middle', 'Bottom'];
  const colNames = ['Left', 'Center', 'Right'];

  let label = `${rowNames[row - 1]} ${colNames[col - 1]}`;
  if (cellIndex === 4) label = 'Center';

  return { row, col, label };
}

/**
 * Pure Event Sourcing state reconstruction.
 * Replays all events in sequence to construct the deterministic game state.
 */
export function reconstructGameState(
  events: GameEvent[],
  upToSequence?: number
): ReconstructedGameState {
  const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);

  let board = createEmptyBoard();
  let currentTurn: PlayerSymbol = 'X';
  let winner: PlayerSymbol | 'draw' | null = null;
  let winningLine: number[] | null = null;
  const moveHistory: ReconstructedGameState['moveHistory'] = [];

  for (const event of sortedEvents) {
    if (upToSequence !== undefined && event.sequence > upToSequence) {
      break;
    }

    if (event.type === 'MOVE') {
      const { cellIndex, playerSymbol, sequence, userId, userName, timestamp } = event;

      if (cellIndex !== undefined && playerSymbol && cellIndex >= 0 && cellIndex < 9) {
        board[cellIndex] = playerSymbol;

        const check = checkWinner(board);
        winner = check.winner;
        winningLine = check.line;

        moveHistory.push({
          sequence,
          playerSymbol,
          cellIndex,
          userId,
          userName,
          timestamp,
          boardSnapshot: [...board],
        });

        if (!winner) {
          currentTurn = playerSymbol === 'X' ? 'O' : 'X';
        }
      }
    } else if (event.type === 'ROLLBACK') {
      const targetSeq = event.targetSequence ?? 0;
      // Truncate move history to targetSeq and rebuild board
      const filteredMoves = moveHistory.filter((m) => m.sequence <= targetSeq);
      board = createEmptyBoard();
      for (const move of filteredMoves) {
        board[move.cellIndex] = move.playerSymbol;
      }
      const check = checkWinner(board);
      winner = check.winner;
      winningLine = check.line;

      if (filteredMoves.length > 0) {
        const lastMove = filteredMoves[filteredMoves.length - 1];
        currentTurn = lastMove.playerSymbol === 'X' ? 'O' : 'X';
      } else {
        currentTurn = 'X';
      }
    }
  }

  const effectiveActiveSequence =
    upToSequence !== undefined
      ? upToSequence
      : sortedEvents.length > 0
      ? sortedEvents[sortedEvents.length - 1].sequence
      : 0;

  return {
    board,
    currentTurn,
    winner,
    winningLine,
    moveHistory,
    activeSequence: effectiveActiveSequence,
    isComplete: winner !== null,
  };
}
