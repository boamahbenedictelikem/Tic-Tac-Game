import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';
import {
  AiDifficulty,
  PlayerSymbol,
  GameDocument,
  UserProfileData
} from '../types/game';
import { soundFx } from '../lib/audio';
import { loginWithGoogle } from '../firebase/config';
import {
  Bot,
  Users,
  Swords,
  Sparkles,
  Trophy,
  ArrowRight,
  LogIn,
  History,
  Play,
  ShieldAlert,
  Zap,
  Code
} from 'lucide-react';

interface GameLobbyProps {
  user: User | null;
  profile: UserProfileData | null;
  recentGames: GameDocument[];
  onStartAiGame: (symbol: PlayerSymbol, difficulty: AiDifficulty) => Promise<void>;
  onCreateMultiplayerGame: (symbol: PlayerSymbol) => Promise<void>;
  onJoinGameByCode: (code: string) => Promise<void>;
  onInspectGame: (gameId: string) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  user,
  profile,
  recentGames,
  onStartAiGame,
  onCreateMultiplayerGame,
  onJoinGameByCode,
  onInspectGame,
}) => {
  // AI Config state
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('hard');
  const [aiSymbol, setAiSymbol] = useState<PlayerSymbol>('X');
  const [isStartingAi, setIsStartingAi] = useState(false);

  // Multiplayer state
  const [multiplayerSymbol, setMultiplayerSymbol] = useState<PlayerSymbol>('X');
  const [joinCode, setJoinCode] = useState('');
  const [isCreatingMultiplayer, setIsCreatingMultiplayer] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleStartAi = async () => {
    try {
      setIsStartingAi(true);
      soundFx.playClick();
      await onStartAiGame(aiSymbol, aiDifficulty);
    } catch (err) {
      console.error('Error starting AI match:', err);
    } finally {
      setIsStartingAi(false);
    }
  };

  const handleCreateMultiplayer = async () => {
    try {
      setIsCreatingMultiplayer(true);
      soundFx.playClick();
      await onCreateMultiplayerGame(multiplayerSymbol);
    } catch (err) {
      console.error('Error creating multiplayer match:', err);
    } finally {
      setIsCreatingMultiplayer(false);
    }
  };

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setIsJoining(true);
      setJoinError(null);
      soundFx.playClick();
      await onJoinGameByCode(joinCode.trim().toUpperCase());
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join game. Check your code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-5">
      {/* Hero Welcome & Quick Stats */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
              <Sparkles className="h-3 w-3" />
              <span>Event-Sourced Architecture</span>
            </div>
            <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Turn-Based Tic-Tac-Toe
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-normal text-slate-600">
              Challenge an unbeatable Minimax AI or battle friends with short 6-character room codes. Replay any turn and roll back game state on demand.
            </p>
          </div>

          {/* User Quick Stats Card */}
          {user && profile?.stats ? (
            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="text-center px-1">
                <span className="block text-lg font-black text-slate-900 leading-tight">
                  {profile.stats.totalGames}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Matches
                </span>
              </div>
              <div className="h-6 w-[1px] bg-slate-200" />
              <div className="text-center px-1">
                <span className="block text-lg font-black text-emerald-600 leading-tight">
                  {profile.stats.wins}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Wins
                </span>
              </div>
              <div className="h-6 w-[1px] bg-slate-200" />
              <div className="text-center px-1">
                <span className="block text-lg font-black text-rose-500 leading-tight">
                  {profile.stats.losses}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Losses
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <LogIn className="h-3.5 w-3.5 text-indigo-600" />
                <span>Save Your Win/Loss Stats</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-tight">
                Sign in with Google to preserve match records and review historical game replays.
              </p>
              <button
                id="btn-lobby-google-signin"
                onClick={() => loginWithGoogle()}
                className="mt-0.5 flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition active:scale-98"
              >
                Sign In with Google
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Game Modes Grid */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Mode 1: Play vs AI */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Single Player vs AI</h3>
                  <p className="text-[11px] text-slate-500">Minimax algorithmic opponent</p>
                </div>
              </div>
              <span className="rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                Instant
              </span>
            </div>

            {/* Difficulty Selector */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                AI Intelligence Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['easy', 'medium', 'hard'] as AiDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    id={`btn-diff-${diff}`}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setAiDifficulty(diff);
                    }}
                    className={`rounded-lg border py-1.5 text-xs font-bold capitalize transition active:scale-98 ${
                      aiDifficulty === diff
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {diff === 'hard' ? 'Unbeatable' : diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Play as Symbol Selector */}
            <div className="mt-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Symbol
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="btn-ai-play-x"
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setAiSymbol('X');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-bold transition active:scale-98 ${
                    aiSymbol === 'X'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-blue-100 font-black text-[10px] text-blue-700">
                    X
                  </span>
                  <span>Play 1st (X)</span>
                </button>

                <button
                  id="btn-ai-play-o"
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setAiSymbol('O');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-bold transition active:scale-98 ${
                    aiSymbol === 'O'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-rose-100 font-black text-[10px] text-rose-700">
                    O
                  </span>
                  <span>Play 2nd (O)</span>
                </button>
              </div>
            </div>
          </div>

          <button
            id="btn-start-ai-game"
            onClick={handleStartAi}
            disabled={isStartingAi}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-98 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isStartingAi ? 'Starting Match...' : 'Start AI Match'}</span>
          </button>
        </div>

        {/* Mode 2: Multiplayer Match */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Multiplayer Match</h3>
                  <p className="text-[11px] text-slate-500">Live 1v1 with Game Codes</p>
                </div>
              </div>
              <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                Firestore Realtime
              </span>
            </div>

            {/* Create Room Options */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Create Match & Invite Friend
              </label>
              <button
                id="btn-create-multiplayer-x"
                onClick={() => {
                  setMultiplayerSymbol('X');
                  handleCreateMultiplayer();
                }}
                disabled={isCreatingMultiplayer}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 py-2 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition active:scale-98 disabled:opacity-50"
              >
                <Swords className="h-3.5 w-3.5" />
                <span>{isCreatingMultiplayer ? 'Creating Match...' : 'Create New Game Room'}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-3.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-white px-2 text-slate-400">Or join existing match</span>
              </div>
            </div>

            {/* Join with 6-character Code Form */}
            <form onSubmit={handleJoinCode}>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Enter 6-Character Room Code
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="input-game-code"
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TK9X2P"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold tracking-widest text-slate-900 uppercase placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden"
                />
                <button
                  id="btn-join-match"
                  type="submit"
                  disabled={isJoining || joinCode.length < 4}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 active:scale-98 disabled:opacity-40"
                >
                  <span>{isJoining ? 'Joining...' : 'Join'}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {joinError && (
                <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{joinError}</p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Match History & Replay Section */}
      {recentGames.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <History className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Matches & Replays</h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Click any match to replay event timeline
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {recentGames.map((game) => {
              const isUserX = game.playerX?.uid === user?.uid;
              const mySymbol = isUserX ? 'X' : 'O';
              const isWon = game.winner === mySymbol;
              const isLost = game.winner && game.winner !== 'draw' && game.winner !== mySymbol;
              const isDraw = game.winner === 'draw';

              const opponentName = isUserX
                ? game.playerO?.displayName || (game.mode === 'ai' ? 'AI Player' : 'Waiting...')
                : game.playerX?.displayName || 'Host';

              return (
                <div
                  key={game.id}
                  id={`match-card-${game.id}`}
                  onClick={() => {
                    soundFx.playClick();
                    onInspectGame(game.id);
                  }}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition hover:border-indigo-300 hover:shadow-xs cursor-pointer active:scale-99"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                        {game.code}
                      </span>

                      {game.status === 'completed' ? (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            isWon
                              ? 'bg-emerald-100 text-emerald-800'
                              : isLost
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isWon ? 'WON' : isLost ? 'LOST' : isDraw ? 'DRAW' : 'FINISHED'}
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          {game.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        vs. {opponentName}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {game.mode === 'ai' ? `AI (${game.aiDifficulty || 'Minimax'})` : 'Multiplayer Room'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                    <span>{game.eventCount || 0} moves recorded</span>
                    <span className="flex items-center gap-0.5 font-bold text-indigo-600 group-hover:text-indigo-800">
                      <span>Replay</span>
                      <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
