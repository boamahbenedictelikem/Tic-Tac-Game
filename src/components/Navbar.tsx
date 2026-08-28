import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { loginWithGoogle, logoutUser } from '../firebase/config';
import { soundFx } from '../lib/audio';
import { Volume2, VolumeX, LogIn, LogOut, Trophy, Gamepad2, Sparkles, ArrowLeft } from 'lucide-react';
import { UserProfileData } from '../types/game';

interface NavbarProps {
  user: User | null;
  profile: UserProfileData | null;
  isInGame: boolean;
  onLeaveGame?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  profile,
  isInGame,
  onLeaveGame,
}) => {
  const [isMuted, setIsMuted] = useState(soundFx.getIsMuted());
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleToggleSound = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
    if (!muted) soundFx.playClick();
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      soundFx.playClick();
      await loginWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    soundFx.playClick();
    await logoutUser();
  };

  const winRate =
    profile?.stats && profile.stats.totalGames > 0
      ? Math.round((profile.stats.wins / profile.stats.totalGames) * 100)
      : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-5">
        {/* Left: Brand / Leave Game */}
        <div className="flex items-center gap-2.5">
          {isInGame && onLeaveGame ? (
            <button
              id="btn-leave-game"
              onClick={() => {
                soundFx.playClick();
                onLeaveGame();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-98"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Lobby</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Gamepad2 className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none">
                  Tic-Tac-Toe
                </h1>
                <p className="hidden text-[11px] font-medium text-slate-500 sm:block leading-tight mt-0.5">
                  Event Sourced • Minimax AI
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sound, Stats, Auth */}
        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Unmute game sounds' : 'Mute game sounds'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            title={isMuted ? 'Sound: Muted' : 'Sound: On'}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5 text-slate-400" /> : <Volume2 className="h-3.5 w-3.5 text-indigo-600" />}
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              {profile?.stats && profile.stats.totalGames > 0 && (
                <div className="hidden items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50/80 px-2 py-1 text-[11px] font-bold text-indigo-700 md:flex">
                  <Trophy className="h-3 w-3 text-indigo-600" />
                  <span>
                    {profile.stats.wins}W - {profile.stats.losses}L ({winRate}%)
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1 pl-1.5 pr-2 shadow-2xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Player'}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-md object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-black text-white">
                    {(user.displayName || 'P').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[110px] truncate text-xs font-semibold text-slate-800">
                  {user.displayName || 'Player'}
                </span>
                <button
                  id="btn-logout"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="ml-1 text-slate-400 transition hover:text-rose-600"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              id="btn-google-login"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98 disabled:opacity-50"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{isLoggingIn ? 'Signing in...' : 'Sign In with Google'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
