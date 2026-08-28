import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerSymbol, GameResult } from '../types/game';

interface GameBoardProps {
  board: (PlayerSymbol | null)[];
  winningLine: number[] | null;
  winner: GameResult;
  isMyTurn: boolean;
  mySymbol: PlayerSymbol | null;
  isInteractive: boolean;
  onCellClick: (index: number) => void;
  isHistoricalPreview?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  winningLine,
  winner,
  isMyTurn,
  mySymbol,
  isInteractive,
  onCellClick,
  isHistoricalPreview = false,
}) => {
  const isWinningCell = (index: number) => {
    return winningLine?.includes(index) ?? false;
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[360px]">
      {/* 3x3 Grid Container */}
      <div
        id="tictactoe-grid"
        className="relative grid grid-cols-3 gap-2 rounded-xl bg-slate-200/80 p-2 shadow-inner border border-slate-300/80"
      >
        {board.map((cell, index) => {
          const isWinner = isWinningCell(index);
          const canClick = isInteractive && isMyTurn && cell === null && !winner;

          return (
            <button
              key={index}
              id={`board-cell-${index}`}
              aria-label={`Cell ${index + 1}, ${cell ? cell : 'empty'}`}
              disabled={!canClick}
              onClick={() => {
                if (canClick) {
                  onCellClick(index);
                }
              }}
              className={`group relative flex aspect-square items-center justify-center rounded-lg transition-all duration-150 select-none ${
                isWinner
                  ? cell === 'X'
                    ? 'bg-blue-50 border-2 border-blue-500 shadow-xs'
                    : 'bg-rose-50 border-2 border-rose-500 shadow-xs'
                  : cell
                  ? 'bg-white shadow-2xs border border-slate-200'
                  : canClick
                  ? 'bg-white border border-slate-200/90 hover:bg-indigo-50/40 hover:border-indigo-300 hover:shadow-2xs cursor-pointer active:scale-96'
                  : 'bg-white/70 border border-slate-200/50 cursor-not-allowed'
              }`}
            >
              {/* Cell index hint in subtle tiny text */}
              <span className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-300 pointer-events-none">
                {index + 1}
              </span>

              {/* Cell Content (X or O) with entry animations */}
              <AnimatePresence mode="wait">
                {cell === 'X' && (
                  <motion.div
                    key="X"
                    initial={{ scale: 0, rotate: -30, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className="relative flex items-center justify-center w-[68%] h-[68%]"
                  >
                    <svg
                      viewBox="0 0 100 100"
                      className="h-full w-full stroke-blue-600 drop-shadow-2xs"
                      style={{ strokeWidth: 15, strokeLinecap: 'round' }}
                    >
                      <line x1="20" y1="20" x2="80" y2="80" />
                      <line x1="80" y1="20" x2="20" y2="80" />
                    </svg>
                  </motion.div>
                )}

                {cell === 'O' && (
                  <motion.div
                    key="O"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className="relative flex items-center justify-center w-[68%] h-[68%]"
                  >
                    <svg
                      viewBox="0 0 100 100"
                      className="h-full w-full stroke-rose-500 drop-shadow-2xs"
                      style={{ strokeWidth: 15, fill: 'none', strokeLinecap: 'round' }}
                    >
                      <circle cx="50" cy="50" r="30" />
                    </svg>
                  </motion.div>
                )}

                {/* Hover Ghost Marker for player */}
                {cell === null && canClick && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none">
                    {mySymbol === 'X' ? (
                      <svg
                        viewBox="0 0 100 100"
                        className="h-[65%] w-[65%] stroke-blue-600"
                        style={{ strokeWidth: 15, strokeLinecap: 'round' }}
                      >
                        <line x1="20" y1="20" x2="80" y2="80" />
                        <line x1="80" y1="20" x2="20" y2="80" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 100 100"
                        className="h-[65%] w-[65%] stroke-rose-500"
                        style={{ strokeWidth: 15, fill: 'none' }}
                      >
                        <circle cx="50" cy="50" r="30" />
                      </svg>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* Historical Preview Banner indicator */}
      {isHistoricalPreview && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800">
          <span>Viewing Historical Turn State (Read-only)</span>
        </div>
      )}
    </div>
  );
};
