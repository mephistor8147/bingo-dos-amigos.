export type BingoSpace = number | 'FREE';

export interface BingoCardData {
  id: string;
  playerName: string;
  grid: BingoSpace[][]; // 5 rows, 5 columns
}

export interface GameState {
  drawnNumbers: number[];
  cards: BingoCardData[];
  isGameActive: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  card: BingoCardData;
}

export type GameMode = 'full_card' | 'line' | 'block_of_4' | 'bot_vs_bot';

export interface Room {
  id: string;
  name: string;
  scheduledTime: number; // timestamp
  entryFee: number;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'finished';
  drawnNumbers: number[];
  players: Player[];
  messages: Message[];
  gameMode?: GameMode;
  prize?: number;
  bgMusicUrl?: string;
  onlineRadioUrl?: string;
  backgroundImageUrl?: string;
  roomIcon?: string;
  botsEnabled?: boolean;
  maxBots?: number;
  isAutoCreated?: boolean;
  theme?: string;
}

export interface User {
  uid: string;
  name: string;
  coins: number;
  photoURL?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  role?: 'player' | 'admin';
}

export interface AppState {
  view: 'home' | 'admin' | 'player_lobby' | 'player_game' | 'profile' | 'settings' | 'admin_users';
  rooms: Room[];
  currentRoomId: string | null;
  currentUser: User | null;
  settings?: {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    darkMode?: boolean;
  };
}
