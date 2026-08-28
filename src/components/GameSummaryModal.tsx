import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GameResult, PlayerSymbol, PlayerInfo, GameMode } from '../types/game';
import { soundFx } from '../lib/audio';
import { Trophy, Frown, Equal, RotateCcw, ArrowLeft, History, Sparkles } from 'lucide-react';

interface GameSummaryModalProps {
  isOpen: boolean;
  winner: GameResult;
  mySymbol: PlayerSymbol | null;
  playerX: PlayerInfo;
  playerO: PlayerInfo | null;
  mode: GameMode;
  totalTurns: number;
  onPlayAgain: () => void;
  onReviewTurns: () => void;
  onBackToLobby: () => void;
}

export const GameSummaryModal: React.FC<GameSummaryModalProps> = ({
  isOpen,
  winner,
  mySymbol,
  playerX,
  playerO,
  mode,
  totalTurns,
  onPlayAgain,
  onReviewTurns,
  onBackToLobby,
}) => {
  const isWinner = winner && winner !== 'draw' && winner === mySymbol;
  const isLoser = winner && winner !== 'draw' && winner !== mySymbol;
  const isDraw = winner === 'draw';

  useEffect(() => {
    if (isOpen) {
      if (isWinner) {
        soundFx.playWin();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore if canvas not ready
        }
      } else if (isDraw) {
        soundFx.playDraw();
      }
    }
  }, [isOpen, isWinner, isDraw]);

  if (!isOpen) return null;

  const winnerName =
    winner === 'X'
      ? playerX.displayName
      : winner === 'O'
      ? playerO?.displayName || 'Player O'
      : 'Draw';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm rounded-xl bg-white p-5 text-center shadow-xl border border-slate-200"
        >
          {/* Header Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl shadow-2xs">
            {isWinner && (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200">
                <Trophy className="h-6 w-6" />
              </div>
            )}
            {isLoser && (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 border border-rose-200">
                <Frown className="h-6 w-6" />
              </div>
            )}
            {isDraw && (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 border border-indigo-200">
                <Equal className="h-6 w-6" />
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900">
            {isWinner && 'Victory!'}
            {isLoser && 'Game Over'}
            {isDraw && 'It’s a Draw!'}
          </h3>

          <p className="mt-0.5 text-xs text-slate-600 leading-snug">
            {isWinner && `You won the match in ${totalTurns} moves.`}
            {isLoser && `${winnerName} won this round.`}
            {isDraw && `Both players tied after ${totalTurns} moves.`}
          </p>

          {/* Player stats box */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Player X
              </span>
              <span className="mt-0.5 text-xs font-bold text-slate-800 truncate max-w-[110px]">
                {playerX.displayName}
              </span>
              {winner === 'X' && (
                <span className="mt-1 rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800">
                  Winner
                </span>
              )}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Player O
              </span>
              <span className="mt-0.5 text-xs font-bold text-slate-800 truncate max-w-[110px]">
                {playerO?.displayName || 'Waiting'}
              </span>
              {winner === 'O' && (
                <span className="mt-1 rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800">
                  Winner
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-col gap-2">
            <button
              id="btn-play-again"
              onClick={() => {
                soundFx.playClick();
                onPlayAgain();
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-700 active:scale-98"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{mode === 'ai' ? 'Play AI Again' : 'New Match'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-review-turns"
                onClick={() => {
                  soundFx.playClick();
                  onReviewTurns();
                }}
                className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-98"
              >
                <History className="h-3.5 w-3.5 text-indigo-600" />
                <span>Review Turns</span>
              </button>

              <button
                id="btn-back-to-lobby"
                onClick={() => {
                  soundFx.playClick();
                  onBackToLobby();
                }}
                className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-98"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Lobby</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
