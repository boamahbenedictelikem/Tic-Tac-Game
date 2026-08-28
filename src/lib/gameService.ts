import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  runTransaction,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import {
  GameDocument,
  GameEvent,
  GameMode,
  AiDifficulty,
  PlayerInfo,
  PlayerSymbol,
  GameResult,
  UserProfileData,
  UserStats
} from '../types/game';
import { reconstructGameState } from './eventSourcing';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generate clean, readable 6-character alphanumeric room code (no confusing 0/O, 1/I)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// User profile & stats management
export async function syncUserProfile(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): Promise<void> {
  if (!user.uid) return;
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const initialProfile: UserProfileData = {
        uid: user.uid,
        displayName: user.displayName || 'Player',
        email: user.email || '',
        photoURL: user.photoURL || null,
        stats: {
          wins: 0,
          losses: 0,
          draws: 0,
          totalGames: 0,
          aiWins: 0,
          aiLosses: 0,
          multiplayerWins: 0,
          multiplayerLosses: 0,
        },
        updatedAt: Date.now(),
      };
      await setDoc(userRef, initialProfile);
    } else {
      await updateDoc(userRef, {
        displayName: user.displayName || snap.data().displayName || 'Player',
        photoURL: user.photoURL || snap.data().photoURL || null,
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: UserProfileData | null) => void
) {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as UserProfileData);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, userPath);
    }
  );
}

export async function recordGameStats(
  userId: string,
  result: 'win' | 'loss' | 'draw',
  isAi: boolean
) {
  if (!userId || userId.startsWith('ai_') || userId.startsWith('guest_')) return;
  const userPath = `users/${userId}`;
  const userRef = doc(db, 'users', userId);

  try {
    const updates: any = {
      'stats.totalGames': increment(1),
      updatedAt: Date.now(),
    };

    if (result === 'win') {
      updates['stats.wins'] = increment(1);
      if (isAi) updates['stats.aiWins'] = increment(1);
      else updates['stats.multiplayerWins'] = increment(1);
    } else if (result === 'loss') {
      updates['stats.losses'] = increment(1);
      if (isAi) updates['stats.aiLosses'] = increment(1);
      else updates['stats.multiplayerLosses'] = increment(1);
    } else {
      updates['stats.draws'] = increment(1);
    }

    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

// Create new game match
export async function createGameMatch({
  creator,
  mode,
  playerSymbol = 'X',
  aiDifficulty = 'hard',
}: {
  creator: PlayerInfo;
  mode: GameMode;
  playerSymbol?: PlayerSymbol;
  aiDifficulty?: AiDifficulty;
}): Promise<GameDocument> {
  const gamesColl = collection(db, 'games');
  const newGameRef = doc(gamesColl);
  const code = generateRoomCode();

  const isPlayerX = playerSymbol === 'X';
  let playerX: PlayerInfo;
  let playerO: PlayerInfo | null = null;

  if (mode === 'ai') {
    const aiPlayer: PlayerInfo = {
      uid: 'ai_minimax',
      displayName: `AI (${aiDifficulty.toUpperCase()})`,
      photoURL: null,
      isAi: true,
    };

    if (isPlayerX) {
      playerX = creator;
      playerO = aiPlayer;
    } else {
      playerX = aiPlayer;
      playerO = creator;
    }
  } else {
    // Multiplayer match waiting for opponent
    if (isPlayerX) {
      playerX = creator;
      playerO = null;
    } else {
      playerX = {
        uid: 'waiting',
        displayName: 'Waiting for player...',
        photoURL: null,
      };
      playerO = creator;
    }
  }

  const gameData: GameDocument = {
    id: newGameRef.id,
    code,
    mode,
    aiDifficulty: mode === 'ai' ? aiDifficulty : undefined,
    status: mode === 'ai' ? 'in_progress' : 'waiting',
    playerX,
    playerO,
    currentTurn: 'X',
    winner: null,
    winningLine: null,
    eventCount: 0,
    activeSequence: 0,
    lastMoveTimestamp: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await setDoc(newGameRef, gameData);
    return gameData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `games/${newGameRef.id}`);
  }
}

// Join existing multiplayer game by 6-char code
export async function joinGameByRoomCode(
  user: PlayerInfo,
  code: string
): Promise<{ success: boolean; game?: GameDocument; error?: string }> {
  const normalizedCode = code.trim().toUpperCase();
  const q = query(
    collection(db, 'games'),
    where('code', '==', normalizedCode),
    limit(1)
  );

  let snapshot;
  try {
    snapshot = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'games');
  }

  if (snapshot.empty) {
    return { success: false, error: 'No game found with this room code.' };
  }

  const gameDoc = snapshot.docs[0];
  const data = gameDoc.data() as GameDocument;

  if (data.status === 'completed') {
    return { success: false, error: 'This game has already ended.' };
  }

  // If player is already in this game, let them re-join
  if (data.playerX.uid === user.uid || data.playerO?.uid === user.uid) {
    return { success: true, game: data };
  }

  // Join as Player O if slot is empty or waiting
  if (!data.playerO || data.playerO.uid === 'waiting') {
    const updatedGame: Partial<GameDocument> = {
      playerO: user,
      status: 'in_progress',
      updatedAt: Date.now(),
    };
    try {
      await updateDoc(gameDoc.ref, updatedGame);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `games/${gameDoc.id}`);
    }
    return { success: true, game: { ...data, ...updatedGame } as GameDocument };
  }

  // Or if playerX is waiting
  if (data.playerX.uid === 'waiting') {
    const updatedGame: Partial<GameDocument> = {
      playerX: user,
      status: 'in_progress',
      updatedAt: Date.now(),
    };
    try {
      await updateDoc(gameDoc.ref, updatedGame);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `games/${gameDoc.id}`);
    }
    return { success: true, game: { ...data, ...updatedGame } as GameDocument };
  }

  return { success: false, error: 'This game is already full with 2 players.' };
}

// Subscribe to game document
export function subscribeToGame(
  gameId: string,
  onUpdate: (game: GameDocument | null) => void
) {
  const gamePath = `games/${gameId}`;
  const gameRef = doc(db, 'games', gameId);
  return onSnapshot(
    gameRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...snap.data(), id: snap.id } as GameDocument);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, gamePath);
    }
  );
}

// Subscribe to events subcollection (Event Sourcing)
export function subscribeToGameEvents(
  gameId: string,
  onUpdate: (events: GameEvent[]) => void
) {
  const eventsPath = `games/${gameId}/events`;
  const eventsColl = collection(db, 'games', gameId, 'events');
  const q = query(eventsColl, orderBy('sequence', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const events: GameEvent[] = [];
      snapshot.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() } as GameEvent);
      });
      onUpdate(events);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, eventsPath);
    }
  );
}

// Add a MOVE event to the subcollection and update game doc
export async function submitMoveEvent({
  gameId,
  sequence,
  playerSymbol,
  cellIndex,
  userId,
  userName,
  allEvents,
}: {
  gameId: string;
  sequence: number;
  playerSymbol: PlayerSymbol;
  cellIndex: number;
  userId: string;
  userName: string;
  allEvents: GameEvent[];
}): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const eventsColl = collection(db, 'games', gameId, 'events');
  const newEventRef = doc(eventsColl);

  const newEvent: GameEvent = {
    id: newEventRef.id,
    sequence,
    type: 'MOVE',
    playerSymbol,
    cellIndex,
    userId,
    userName,
    timestamp: Date.now(),
  };

  // Calculate reconstructed state after this new move
  const nextEvents = [...allEvents, newEvent];
  const nextState = reconstructGameState(nextEvents);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(newEventRef, newEvent);

      const gameUpdate: Partial<GameDocument> = {
        eventCount: sequence,
        activeSequence: sequence,
        currentTurn: nextState.winner ? playerSymbol : playerSymbol === 'X' ? 'O' : 'X',
        winner: nextState.winner,
        winningLine: nextState.winningLine,
        status: nextState.winner ? 'completed' : 'in_progress',
        lastMoveTimestamp: Date.now(),
        updatedAt: Date.now(),
      };

      transaction.update(gameRef, gameUpdate);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}`);
  }
}

// Add a ROLLBACK event to subcollection and reset game state
export async function submitRollbackEvent({
  gameId,
  currentSequence,
  targetSequence,
  userId,
  userName,
  allEvents,
}: {
  gameId: string;
  currentSequence: number;
  targetSequence: number;
  userId: string;
  userName: string;
  allEvents: GameEvent[];
}): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const eventsColl = collection(db, 'games', gameId, 'events');
  const newEventRef = doc(eventsColl);

  const nextSeq = currentSequence + 1;
  const rollbackEvent: GameEvent = {
    id: newEventRef.id,
    sequence: nextSeq,
    type: 'ROLLBACK',
    targetSequence,
    userId,
    userName,
    timestamp: Date.now(),
    note: `Rolled back to Turn #${targetSequence}`,
  };

  const nextEvents = [...allEvents, rollbackEvent];
  const nextState = reconstructGameState(nextEvents);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(newEventRef, rollbackEvent);

      const gameUpdate: Partial<GameDocument> = {
        eventCount: nextSeq,
        activeSequence: nextSeq,
        currentTurn: nextState.currentTurn,
        winner: nextState.winner,
        winningLine: nextState.winningLine,
        status: nextState.winner ? 'completed' : 'in_progress',
        lastMoveTimestamp: Date.now(),
        updatedAt: Date.now(),
      };

      transaction.update(gameRef, gameUpdate);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}`);
  }
}

// Resign / Concede match
export async function resignMatch({
  gameId,
  currentSequence,
  resigningPlayerSymbol,
  userId,
  userName,
}: {
  gameId: string;
  currentSequence: number;
  resigningPlayerSymbol: PlayerSymbol;
  userId: string;
  userName: string;
}) {
  const winnerSymbol: PlayerSymbol = resigningPlayerSymbol === 'X' ? 'O' : 'X';
  const gameRef = doc(db, 'games', gameId);
  const eventsColl = collection(db, 'games', gameId, 'events');
  const newEventRef = doc(eventsColl);

  const nextSeq = currentSequence + 1;
  const resignEvent: GameEvent = {
    id: newEventRef.id,
    sequence: nextSeq,
    type: 'RESIGN',
    playerSymbol: resigningPlayerSymbol,
    userId,
    userName,
    timestamp: Date.now(),
    note: `${userName} resigned.`,
  };

  try {
    await setDoc(newEventRef, resignEvent);
    await updateDoc(gameRef, {
      winner: winnerSymbol,
      winningLine: null,
      status: 'completed',
      eventCount: nextSeq,
      activeSequence: nextSeq,
      updatedAt: Date.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}`);
  }
}

// Subscribe to user's recent matches
export function subscribeToUserMatches(
  uid: string,
  onUpdate: (games: GameDocument[]) => void
) {
  const gamesColl = collection(db, 'games');
  const q = query(
    gamesColl,
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const games: GameDocument[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as GameDocument;
        if (data.playerX?.uid === uid || data.playerO?.uid === uid) {
          games.push({ ...data, id: d.id });
        }
      });
      onUpdate(games);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'games');
    }
  );
}
