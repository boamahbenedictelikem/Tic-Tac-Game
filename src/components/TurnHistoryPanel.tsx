import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GameEvent, PlayerSymbol } from '../types/game';
import { getCellCoordinate } from '../lib/eventSourcing';
import { soundFx } from '../lib/audio';
import { History, RotateCcw, Eye, Play, Sparkles, CheckCircle2 } from 'lucide-react';

interface TurnHistoryPanelProps {
  events: GameEvent[];
  viewingSequence: number | null; // null means viewing live
  activeLiveSequence: number;
  onSelectSequence: (seq: number | null) => void;
  onRollback: (targetSequence: number) => Promise<void>;
  isGameComplete: boolean;
  canRollback: boolean;
}

export const TurnHistoryPanel: React.FC<TurnHistoryPanelProps> = ({
  events,
  viewingSequence,
  activeLiveSequence,
  onSelectSequence,
  onRollback,
  isGameComplete,
  canRollback,
}) => {
  const [confirmRollbackSeq, setConfirmRollbackSeq] = useState<number | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Filter only move events for the turn history list
  const moveEvents = events.filter((e) => e.type === 'MOVE');
  const rollbackEvents = events.filter((e) => e.type === 'ROLLBACK');

  const handleRollbackConfirm = async (seq: number) => {
    try {
      setIsRollingBack(true);
      soundFx.playTimeTravel();
      await onRollback(seq);
      setConfirmRollbackSeq(null);
      onSelectSequence(null); // Reset back to live view
    } catch (err) {
      console.error('Failed to rollback:', err);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/80">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Event Stream</h2>
          <span className="rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
            {moveEvents.length} {moveEvents.length === 1 ? 'Turn' : 'Turns'}
          </span>
        </div>

        {viewingSequence !== null && (
          <button
            id="btn-return-to-live"
            onClick={() => {
              soundFx.playClick();
              onSelectSequence(null);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition active:scale-95"
          >
            <Play className="h-2.5 w-2.5 fill-current" />
            <span>Return to Live</span>
          </button>
        )}
      </div>

      {/* Turn list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[380px]">
        {moveEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <History className="h-6 w-6 stroke-[1.5] text-slate-300 mb-1.5" />
            <p className="text-xs font-semibold text-slate-600">No moves made yet.</p>
            <p className="text-[10px] text-slate-400">Moves are appended as immutable events in Firestore.</p>
          </div>
        ) : (
          moveEvents.map((evt) => {
            const coord = evt.cellIndex !== undefined ? getCellCoordinate(evt.cellIndex) : null;
            const isCurrentView = viewingSequence === evt.sequence;
            const isLatest = evt.sequence === activeLiveSequence && viewingSequence === null;

            return (
              <div
                key={evt.id || evt.sequence}
                className={`group relative flex flex-col rounded-lg border p-2 transition-all ${
                  isCurrentView
                    ? 'border-amber-400 bg-amber-50/60 shadow-2xs'
                    : isLatest
                    ? 'border-indigo-200 bg-indigo-50/40'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Left: Sequence & Symbol */}
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-600">
                      #{evt.sequence}
                    </span>

                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-black ${
                        evt.playerSymbol === 'X'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {evt.playerSymbol}
                    </span>

                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-800 leading-tight">
                          {evt.userName}
                        </span>
                        {coord && (
                          <span className="rounded bg-slate-100 px-1 py-0.2 font-mono text-[9px] font-bold text-slate-600">
                            {coord.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Cell #{evt.cellIndex !== undefined ? evt.cellIndex + 1 : ''} (R{coord?.row}, C{coord?.col})
                      </span>
                    </div>
                  </div>

                  {/* Actions: View & Rollback */}
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-view-turn-${evt.sequence}`}
                      onClick={() => {
                        soundFx.playTimeTravel();
                        onSelectSequence(evt.sequence);
                      }}
                      title="Inspect board at this turn"
                      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition active:scale-95 ${
                        isCurrentView
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Eye className="h-2.5 w-2.5" />
                      <span>{isCurrentView ? 'Viewing' : 'View'}</span>
                    </button>

                    {canRollback && evt.sequence < activeLiveSequence && (
                      <button
                        id={`btn-rollback-turn-${evt.sequence}`}
                        onClick={() => {
                          soundFx.playClick();
                          setConfirmRollbackSeq(evt.sequence);
                        }}
                        title="Roll back match to this move"
                        className="flex items-center gap-0.5 rounded-md bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-700 active:scale-95"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Rollback confirmation inline popover */}
                {confirmRollbackSeq === evt.sequence && (
                  <motion.div
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 rounded-md border border-amber-300 bg-amber-50 p-2"
                  >
                    <p className="text-[11px] font-medium text-amber-900 leading-tight">
                      Roll back the live game to Turn #{evt.sequence}? Subsequent moves will be undone.
                    </p>
                    <div className="mt-1.5 flex items-center justify-end gap-1.5">
                      <button
                        id={`btn-cancel-rollback-${evt.sequence}`}
                        onClick={() => setConfirmRollbackSeq(null)}
                        disabled={isRollingBack}
                        className="rounded px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60"
                      >
                        Cancel
                      </button>
                      <button
                        id={`btn-confirm-rollback-${evt.sequence}`}
                        onClick={() => handleRollbackConfirm(evt.sequence)}
                        disabled={isRollingBack}
                        className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs hover:bg-amber-700 active:scale-95 disabled:opacity-50"
                      >
                        {isRollingBack ? 'Restoring...' : 'Confirm Rollback'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })
        )}

        {/* Rollback logs info */}
        {rollbackEvents.length > 0 && (
          <div className="mt-2 rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-1.5 text-center text-[10px] text-slate-500">
            <span>
              ℹ️ {rollbackEvents.length} rollback {rollbackEvents.length === 1 ? 'event' : 'events'} recorded in event stream.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
