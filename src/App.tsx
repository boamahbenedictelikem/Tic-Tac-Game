/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle } from './firebase/config';
import {
  GameDocument,
  GameEvent,
  PlayerSymbol,
  AiDifficulty,
  UserProfileData
} from './types/game';
import {
  syncUserProfile,
  subscribeToUserProfile,
  subscribeToGame,
  subscribeToGameEvents,
  subscribeToUserMatches,
  createGameMatch,
  joinGameByRoomCode
} from './lib/gameService';
import { Navbar } from './components/Navbar';
import { GameLobby } from './components/GameLobby';
import { ActiveMatch } from './components/ActiveMatch';
import { soundFx } from './lib/audio';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Active Game state
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<GameDocument | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [recentGames, setRecentGames] = useState<GameDocument[]>([]);

  // Auto-join from URL parameter on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('join');
    if (codeParam) {
      // Auto attempt join after auth is initialized
      const attemptAutoJoin = async (user: User | null) => {
        try {
          const player = {
            uid: user?.uid || `guest_${Math.random().toString(36).substring(2, 8)}`,
            displayName: user?.displayName || 'Player 2',
            photoURL: user?.photoURL || null,
          };
          const result = await joinGameByRoomCode(player, codeParam);
          if (result.success && result.game) {
            setActiveGameId(result.game.id);
            // clean url without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error('Auto join failed:', err);
        }
      };

      const unsub = onAuthStateChanged(auth, (user) => {
        attemptAutoJoin(user);
        unsub();
      });
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (user) {
        await syncUserProfile(user);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to User Profile doc
  useEffect(() => {
    if (!currentUser?.uid) {
      setUserProfile(null);
      return;
    }

    const unsubscribe = subscribeToUserProfile(currentUser.uid, (profile) => {
      setUserProfile(profile);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Listen to User Recent Matches
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToUserMatches(currentUser.uid, (games) => {
      setRecentGames(games);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Listen to Active Game Document & Subcollection Events
  useEffect(() => {
    if (!activeGameId) {
      setActiveGame(null);
      setGameEvents([]);
      return;
    }

    const unsubGame = subscribeToGame(activeGameId, (gameDoc) => {
      setActiveGame(gameDoc);
    });

    const unsubEvents = subscribeToGameEvents(activeGameId, (events) => {
      setGameEvents(events);
    });

    return () => {
      unsubGame();
      unsubEvents();
    };
  }, [activeGameId]);

  // Start AI Match Handler
  const handleStartAiGame = async (symbol: PlayerSymbol, difficulty: AiDifficulty) => {
    const player = {
      uid: currentUser?.uid || `guest_${Math.random().toString(36).substring(2, 8)}`,
      displayName: currentUser?.displayName || 'Player',
      photoURL: currentUser?.photoURL || null,
    };

    const newGame = await createGameMatch({
      creator: player,
      mode: 'ai',
      playerSymbol: symbol,
      aiDifficulty: difficulty,
    });

    setActiveGameId(newGame.id);
  };

  // Create Multiplayer Match Handler
  const handleCreateMultiplayerGame = async (symbol: PlayerSymbol) => {
    const player = {
      uid: currentUser?.uid || `guest_${Math.random().toString(36).substring(2, 8)}`,
      displayName: currentUser?.displayName || 'Host Player',
      photoURL: currentUser?.photoURL || null,
    };

    const newGame = await createGameMatch({
      creator: player,
      mode: 'multiplayer',
      playerSymbol: symbol,
    });

    setActiveGameId(newGame.id);
  };

  // Join Multiplayer Match by Code
  const handleJoinGameByCode = async (code: string) => {
    const player = {
      uid: currentUser?.uid || `guest_${Math.random().toString(36).substring(2, 8)}`,
      displayName: currentUser?.displayName || 'Challenger',
      photoURL: currentUser?.photoURL || null,
    };

    const result = await joinGameByRoomCode(player, code);
    if (result.success && result.game) {
      setActiveGameId(result.game.id);
    } else {
      throw new Error(result.error || 'Failed to join game');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">Connecting to Tic-Tac-Toe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation Bar */}
      <Navbar
        user={currentUser}
        profile={userProfile}
        isInGame={!!activeGameId}
        onLeaveGame={() => setActiveGameId(null)}
      />

      {/* Main Container */}
      <main className="pb-16">
        {activeGameId && activeGame ? (
          <ActiveMatch
            game={activeGame}
            events={gameEvents}
            currentUser={currentUser}
            userProfile={userProfile}
            onLeaveMatch={() => setActiveGameId(null)}
            onRematchStart={(newGame) => setActiveGameId(newGame.id)}
          />
        ) : (
          <GameLobby
            user={currentUser}
            profile={userProfile}
            recentGames={recentGames}
            onStartAiGame={handleStartAiGame}
            onCreateMultiplayerGame={handleCreateMultiplayerGame}
            onJoinGameByCode={handleJoinGameByCode}
            onInspectGame={(gameId) => setActiveGameId(gameId)}
          />
        )}
      </main>
    </div>
  );
}
