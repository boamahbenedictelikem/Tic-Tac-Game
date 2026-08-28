import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundFx } from '../lib/audio';
import { Copy, Check, Share2, Users, Loader2, X } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  roomCode: string;
  gameId: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  roomCode,
  gameId,
  onClose,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?code=${roomCode}`
    : '';

  const handleCopyCode = async () => {
    try {
      soundFx.playClick();
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      soundFx.playClick();
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="relative w-full max-w-sm rounded-xl bg-white p-4 shadow-xl border border-slate-200"
        >
          {/* Close button */}
          <button
            id="btn-close-share-modal"
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-2 text-sm font-bold text-slate-900">
              Invite a Friend to Play
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Share the 6-character room code or direct link to start.
            </p>
          </div>

          {/* 6-Character Game Code Display */}
          <div className="mt-3.5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Game Room Code
            </span>
            <div className="mt-0.5 flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-black tracking-widest text-slate-900">
                {roomCode}
              </span>
              <button
                id="btn-copy-room-code"
                onClick={handleCopyCode}
                className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-700 active:scale-95"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Share Link */}
          <div className="mt-3">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Direct Invite Link
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="input-share-link"
                type="text"
                readOnly
                value={joinUrl}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-600 outline-hidden"
              />
              <button
                id="btn-copy-share-link"
                onClick={handleCopyLink}
                className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Waiting animation */}
          <div className="mt-3.5 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 py-2 text-[11px] font-medium text-slate-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
            <span>Waiting for Opponent to join...</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
