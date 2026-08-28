import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import {
  GameDocument,
  GameEvent,
  PlayerSymbol,
  ReconstructedGameState,
  UserProfileData
} from '../types/game';
import { GameBoard } from './GameBoard';
import { TurnHistoryPanel } from './TurnHistoryPanel';
import { TimeTravelControls } from './TimeTravelControls';
import { ShareModal } from './ShareModal';
import { GameSummaryModal } from './GameSummaryModal';
import { soundFx } from '../lib/audio';
import { getAiMove } from '../lib/minimax';
import { reconstructGameState } from '../lib/eventSourcing';
import {
  submitMoveEvent,
  submitRollbackEvent,
  resignMatch,
  createGameMatch,
  recordGameStats
} from '../lib/gameService';
import {
  Bot,
  User as UserIcon,
  Copy,
  Check,
  Share2,
  Flag,
  RotateCcw,
  Sparkles,
  Info,
  Clock
} from 'lucide-react';

interface ActiveMatchProps {
  game: GameDocument;
  events: GameEvent[];
  currentUser: User | null;
  userProfile: UserProfileData | null;
  onLeaveMatch: () => void;
  onRematchStart: (newGame: GameDocument) => void;
}

export const ActiveMatch: React.FC<ActiveMatchProps> = ({
  game,
  events,
  currentUser,
  userProfile,
  onLeaveMatch,
  onRematchStart,
}) => {
  // Event Sourcing state: Viewing a specific historical sequence or live
  const [viewingSequence, setViewingSequence] = useState<number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(
    game.mode === 'multiplayer' && game.status === 'waiting'
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSummaryDismissed, setIsSummaryDismissed] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Determine user's role and symbol
  const isPlayerX = game.playerX?.uid === currentUser?.uid;
  const isPlayerO = game.playerO?.uid === currentUser?.uid;
  const mySymbol: PlayerSymbol | null = isPlayerX ? 'X' : isPlayerO ? 'O' : null;

  // Authoritative live state reconstructed from ALL events
  const liveState = reconstructGameState(events);

  // Active state to display (either live or historical preview)
  const displayState =
    viewingSequence !== null
      ? reconstructGameState(events, viewingSequence)
      : liveState;

  const isLive = viewingSequence === null;
  const totalTurns = liveState.moveHistory.length;

  // Track if stats were recorded for completed game
  const recordedStatsRef = useRef(false);

  useEffect(() => {
    if (game.status === 'completed' && game.winner && !recordedStatsRef.current && currentUser?.uid) {
      recordedStatsRef.current = true;
      const isAi = game.mode === 'ai';
      if (game.winner === 'draw') {
        recordGameStats(currentUser.uid, 'draw', isAi);
      } else if (game.winner === mySymbol) {
        recordGameStats(currentUser.uid, 'win', isAi);
      } else if (mySymbol) {
        recordGameStats(currentUser.uid, 'loss', isAi);
      }
    }
  }, [game.status, game.winner, currentUser?.uid, mySymbol, game.mode]);

  // Handle AI turn automatically when it is AI's turn
  useEffect(() => {
    if (game.mode !== 'ai' || game.status !== 'in_progress' || isSubmittingMove) {
      return;
    }

    const currentTurn = liveState.currentTurn;
    const isAiTurn =
      (currentTurn === 'X' && game.playerX?.isAi) ||
      (currentTurn === 'O' && game.playerO?.isAi);

    if (isAiTurn && !liveState.winner) {
      const aiSymbol = currentTurn;
      const timeoutId = setTimeout(async () => {
        try {
          setIsSubmittingMove(true);
          const aiMoveIndex = getAiMove(
            [...liveState.board],
            aiSymbol,
            game.aiDifficulty || 'hard'
          );

          if (aiMoveIndex >= 0) {
            const nextSeq = events.length + 1;
            await submitMoveEvent({
              gameId: game.id,
              sequence: nextSeq,
              playerSymbol: aiSymbol,
              cellIndex: aiMoveIndex,
              userId: 'ai_minimax',
              userName: `AI (${(game.aiDifficulty || 'HARD').toUpperCase()})`,
              allEvents: events,
            });

            if (aiSymbol === 'X') soundFx.playMoveX();
            else soundFx.playMoveO();
          }
        } catch (err) {
          console.error('Error during AI move execution:', err);
        } finally {
          setIsSubmittingMove(false);
        }
      }, 450); // Natural thinking delay

      return () => clearTimeout(timeoutId);
    }
  }, [game.mode, game.status, game.playerX, game.playerO, game.aiDifficulty, game.id, liveState, events, isSubmittingMove]);

  // Close share modal if player O joins
  useEffect(() => {
    if (game.status === 'in_progress' && isShareModalOpen) {
      setIsShareModalOpen(false);
    }
  }, [game.status, isShareModalOpen]);

  // Handle Human Move
  const handleCellClick = async (cellIndex: number) => {
    if (!isLive) {
      // Prompt return to live
      setViewingSequence(null);
      return;
    }

    if (isSubmittingMove || !mySymbol || liveState.winner || game.status !== 'in_progress') {
      return;
    }

    if (liveState.currentTurn !== mySymbol) {
      return;
    }

    if (liveState.board[cellIndex] !== null) {
      return;
    }

    try {
      setIsSubmittingMove(true);
      if (mySymbol === 'X') soundFx.playMoveX();
      else soundFx.playMoveO();

      const nextSeq = events.length + 1;
      await submitMoveEvent({
        gameId: game.id,
        sequence: nextSeq,
        playerSymbol: mySymbol,
        cellIndex,
        userId: currentUser?.uid || 'guest',
        userName: currentUser?.displayName || 'Player',
        allEvents: events,
      });
    } catch (err) {
      console.error('Error submitting move:', err);
    } finally {
      setIsSubmittingMove(false);
    }
  };

  // Handle Event Sourcing Rollback
  const handleRollback = async (targetSequence: number) => {
    try {
      setIsRollingBack(true);
      await submitRollbackEvent({
        gameId: game.id,
        currentSequence: events.length,
        targetSequence,
        userId: currentUser?.uid || 'player',
        userName: currentUser?.displayName || 'Player',
        allEvents: events,
      });
      setViewingSequence(null);
    } catch (err) {
      console.error('Failed to execute rollback:', err);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Handle Rematch / Play Again
  const handlePlayAgain = async () => {
    try {
      soundFx.playClick();
      const creator = {
        uid: currentUser?.uid || 'player',
        displayName: currentUser?.displayName || 'Player',
        photoURL: currentUser?.photoURL || null,
      };

      const newGame = await createGameMatch({
        creator,
        mode: game.mode,
        playerSymbol: 'X',
        aiDifficulty: game.aiDifficulty || 'hard',
      });

      onRematchStart(newGame);
    } catch (err) {
      console.error('Error starting rematch:', err);
    }
  };

  const handleCopyCode = async () => {
    try {
      soundFx.playClick();
      await navigator.clipboard.writeText(game.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const handleResign = async () => {
    if (!mySymbol || game.status !== 'in_progress') return;
    if (window.confirm('Are you sure you want to resign and forfeit this match?')) {
      try {
        soundFx.playClick();
        await resignMatch({
          gameId: game.id,
          currentSequence: events.length,
          resigningPlayerSymbol: mySymbol,
          userId: currentUser?.uid || 'player',
          userName: currentUser?.displayName || 'Player',
        });
      } catch (err) {
        console.error('Resign error:', err);
      }
    }
  };

  const isMyTurn = isLive && liveState.currentTurn === mySymbol && !liveState.winner;

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs">
        {/* Match Info & Room Code */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Room
            </span>
            <button
              id="btn-active-copy-code"
              onClick={handleCopyCode}
              title="Click to copy room code"
              className="flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 font-mono text-xs font-black text-indigo-700 hover:bg-indigo-100 transition active:scale-95 shadow-2xs"
            >
              <span>{game.code}</span>
              {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          {game.mode === 'multiplayer' && game.status === 'waiting' && (
            <button
              id="btn-open-share-modal"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition active:scale-98"
            >
              <Share2 className="h-3 w-3" />
              <span>Share Code</span>
            </button>
          )}

          <div className="hidden sm:block text-[11px] text-slate-500 font-medium">
            {game.mode === 'ai' ? (
              <span className="capitalize">AI Mode • {game.aiDifficulty || 'Minimax'}</span>
            ) : (
              <span>Multiplayer Match</span>
            )}
          </div>
        </div>

        {/* Turn Status Message */}
        <div className="flex items-center gap-2">
          {game.status === 'waiting' ? (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Waiting for Opponent...</span>
            </div>
          ) : liveState.winner ? (
            <div className="flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-black text-indigo-700">
              <span>
                {liveState.winner === 'draw'
                  ? 'Game Drawn'
                  : `Winner: Player ${liveState.winner}`}
              </span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                isMyTurn
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 ring-1 ring-emerald-300 animate-pulse'
                  : 'bg-slate-100 border border-slate-200 text-slate-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isMyTurn ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              <span>
                {isMyTurn
                  ? 'Your Turn'
                  : `Opponent's Turn (${liveState.currentTurn})`}
              </span>
            </div>
          )}

          {/* Resign Option */}
          {game.status === 'in_progress' && mySymbol && (
            <button
              id="btn-resign-match"
              onClick={handleResign}
              title="Resign Match"
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition active:scale-95"
            >
              <Flag className="h-3 w-3" />
              <span className="hidden sm:inline">Resign</span>
            </button>
          )}
        </div>
      </div>

      {/* Players Header Card */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-4">
        {/* Player X */}
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
            liveState.currentTurn === 'X' && !liveState.winner
              ? 'border-blue-400 bg-blue-50/50 shadow-2xs ring-1 ring-blue-300'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 font-black text-base text-blue-700 shadow-2xs">
            X
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-xs font-bold text-slate-900">
                {game.playerX.displayName}
              </span>
              {isPlayerX && (
                <span className="rounded bg-blue-100 px-1 py-0.2 text-[9px] font-black text-blue-700">
                  YOU
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">
              {game.playerX.isAi ? 'Minimax AI' : 'Plays First'}
            </span>
          </div>
        </div>

        {/* Player O */}
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
            liveState.currentTurn === 'O' && !liveState.winner
              ? 'border-rose-400 bg-rose-50/50 shadow-2xs ring-1 ring-rose-300'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 font-black text-base text-rose-700 shadow-2xs">
            O
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-xs font-bold text-slate-900">
                {game.playerO?.displayName || 'Waiting for opponent...'}
              </span>
              {isPlayerO && (
                <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-black text-rose-700">
                  YOU
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">
              {game.playerO?.isAi
                ? 'Minimax AI'
                : game.playerO
                ? 'Plays Second'
                : 'Share code to start'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Stage Layout (Board on Left, Turn History on Right) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left Column: Board & Time Travel Scrubber */}
        <div className="flex flex-col items-center gap-3 lg:col-span-7">
          <GameBoard
            board={displayState.board}
            winningLine={displayState.winningLine}
            winner={displayState.winner}
            isMyTurn={isMyTurn}
            mySymbol={mySymbol}
            isInteractive={isLive && game.status === 'in_progress'}
            onCellClick={handleCellClick}
            isHistoricalPreview={!isLive}
          />

          {/* Time Travel Scrubber controls */}
          <TimeTravelControls
            totalTurns={totalTurns}
            currentTurnSequence={displayState.activeSequence}
            isLive={isLive}
            onJumpToTurn={(seq) => setViewingSequence(seq)}
            onRollbackToCurrent={() => handleRollback(displayState.activeSequence)}
            canRollback={
              !isLive &&
              (game.status === 'in_progress' || game.status === 'completed') &&
              displayState.activeSequence < totalTurns
            }
            isRollingBack={isRollingBack}
          />
        </div>

        {/* Right Column: Event Sourcing History & Rollback Logs */}
        <div className="lg:col-span-5 h-full">
          <TurnHistoryPanel
            events={events}
            viewingSequence={viewingSequence}
            activeLiveSequence={liveState.activeSequence}
            onSelectSequence={(seq) => setViewingSequence(seq)}
            onRollback={handleRollback}
            isGameComplete={liveState.isComplete}
            canRollback={game.status === 'in_progress' || game.status === 'completed'}
          />
        </div>
      </div>

      {/* Multiplayer Share Code Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        roomCode={game.code}
        gameId={game.id}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Match Completed Summary Dialog */}
      <GameSummaryModal
        isOpen={liveState.isComplete && !isSummaryDismissed}
        winner={liveState.winner}
        mySymbol={mySymbol}
        playerX={game.playerX}
        playerO={game.playerO}
        mode={game.mode}
        totalTurns={totalTurns}
        onPlayAgain={handlePlayAgain}
        onReviewTurns={() => setIsSummaryDismissed(true)}
        onBackToLobby={onLeaveMatch}
      />
    </div>
  );
};
