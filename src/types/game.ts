export type PlayerSymbol = 'X' | 'O';
export type GameMode = 'ai' | 'multiplayer';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type GameResult = 'X' | 'O' | 'draw' | null;

export interface PlayerInfo {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  isAi?: boolean;
}

export type EventType = 'MOVE' | 'ROLLBACK' | 'RESIGN';

export interface GameEvent {
  id: string;
  sequence: number; // 1-indexed sequential event number
  type: EventType;
  playerSymbol?: PlayerSymbol;
  cellIndex?: number; // 0 to 8
  targetSequence?: number; // for ROLLBACK
  userId: string;
  userName: string;
  timestamp: number; // epoch ms
  note?: string;
}

export interface GameDocument {
  id: string;
  code: string; // 6-character room code, e.g. "TK9X2P"
  mode: GameMode;
  aiDifficulty?: AiDifficulty;
  status: GameStatus;
  playerX: PlayerInfo;
  playerO: PlayerInfo | null;
  currentTurn: PlayerSymbol;
  winner: GameResult;
  winningLine: number[] | null; // e.g. [0, 1, 2]
  eventCount: number;
  activeSequence: number;
  lastMoveTimestamp: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReconstructedGameState {
  board: (PlayerSymbol | null)[];
  currentTurn: PlayerSymbol;
  winner: GameResult;
  winningLine: number[] | null;
  moveHistory: {
    sequence: number;
    playerSymbol: PlayerSymbol;
    cellIndex: number;
    userId: string;
    userName: string;
    timestamp: number;
    boardSnapshot: (PlayerSymbol | null)[];
  }[];
  activeSequence: number;
  isComplete: boolean;
}

export interface UserStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  aiWins: number;
  aiLosses: number;
  multiplayerWins: number;
  multiplayerLosses: number;
}

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  stats: UserStats;
  updatedAt: number;
}
