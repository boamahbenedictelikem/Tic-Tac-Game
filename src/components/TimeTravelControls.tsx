import React from 'react';
import { soundFx } from '../lib/audio';
import {
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  RotateCcw,
  Sparkles,
  Play
} from 'lucide-react';

interface TimeTravelControlsProps {
  totalTurns: number;
  currentTurnSequence: number; // current preview turn (or total if live)
  isLive: boolean;
  onJumpToTurn: (seq: number | null) => void;
  onRollbackToCurrent: () => void;
  canRollback: boolean;
  isRollingBack?: boolean;
}

export const TimeTravelControls: React.FC<TimeTravelControlsProps> = ({
  totalTurns,
  currentTurnSequence,
  isLive,
  onJumpToTurn,
  onRollbackToCurrent,
  canRollback,
  isRollingBack = false,
}) => {
  if (totalTurns === 0) return null;

  const handlePrev = () => {
    soundFx.playTimeTravel();
    const target = Math.max(1, currentTurnSequence - 1);
    onJumpToTurn(target);
  };

  const handleNext = () => {
    soundFx.playTimeTravel();
    if (currentTurnSequence >= totalTurns - 1) {
      onJumpToTurn(null); // Jump to live
    } else {
      onJumpToTurn(currentTurnSequence + 1);
    }
  };

  const handleStart = () => {
    soundFx.playTimeTravel();
    onJumpToTurn(1);
  };

  const handleLive = () => {
    soundFx.playClick();
    onJumpToTurn(null);
  };

  return (
    <div className="mx-auto w-full max-w-[360px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
      <div className="flex items-center justify-between gap-1.5">
        {/* Left status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              isLive
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800 animate-pulse'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {isLive ? 'LIVE' : `PREVIEW #${currentTurnSequence}/${totalTurns}`}
          </span>
        </div>

        {/* Step controls */}
        <div className="flex items-center gap-0.5">
          <button
            id="btn-timeline-first"
            onClick={handleStart}
            disabled={currentTurnSequence <= 1 && !isLive}
            title="First Turn"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:opacity-40"
          >
            <SkipBack className="h-3 w-3" />
          </button>

          <button
            id="btn-timeline-prev"
            onClick={handlePrev}
            disabled={currentTurnSequence <= 1 && !isLive}
            title="Previous Turn"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <button
            id="btn-timeline-next"
            onClick={handleNext}
            disabled={isLive}
            title="Next Turn"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            id="btn-timeline-live"
            onClick={handleLive}
            disabled={isLive}
            title="Jump to Live Game"
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition active:scale-95 ${
              isLive
                ? 'bg-slate-100 text-slate-400 cursor-default'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
            }`}
          >
            <Play className="h-2.5 w-2.5 fill-current" />
            <span>Live</span>
          </button>
        </div>
      </div>

      {/* Scrubber slider bar */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-400">Start</span>
        <input
          id="timeline-range-slider"
          type="range"
          min="1"
          max={totalTurns}
          value={isLive ? totalTurns : currentTurnSequence}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (val === totalTurns) {
              onJumpToTurn(null);
            } else {
              onJumpToTurn(val);
            }
          }}
          className="h-1.5 w-full cursor-pointer appearance-none rounded bg-slate-200 accent-indigo-600"
        />
        <span className="text-[10px] font-mono text-slate-400">Turn {totalTurns}</span>
      </div>

      {/* Restore Button when in historical preview */}
      {!isLive && canRollback && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/90 p-2">
          <div className="text-left">
            <p className="text-[11px] font-bold text-amber-900">
              Restore match to Turn #{currentTurnSequence}?
            </p>
            <p className="text-[10px] text-amber-700">
              Resumes playing from this exact state.
            </p>
          </div>

          <button
            id="btn-restore-previewed-state"
            onClick={() => {
              soundFx.playTimeTravel();
              onRollbackToCurrent();
            }}
            disabled={isRollingBack}
            className="flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-amber-700 active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{isRollingBack ? 'Restoring...' : 'Restore'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
