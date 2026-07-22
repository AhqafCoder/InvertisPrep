import apiClient from './api';

export interface QuizCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  questionCount: number;
}

export interface QuizQuestion {
  id: string;
  category: string;
  title: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points?: number;
}

export interface QuizPlayer {
  id: string;
  socketId?: string | null;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  isReady: boolean;
  isHost: boolean;
  isBot?: boolean;
  answers?: Record<number, {
    selectedOptionIndex: number;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
}

export interface QuizRoom {
  pin: string;
  hostId: string;
  hostName: string;
  category: string;
  mode?: 'group' | '1v1';
  maxPlayers?: number;
  timePerQuestion: number;
  totalQuestions: number;
  questions: QuizQuestion[];
  isPublic: boolean;
  status: 'waiting' | 'playing' | 'finished';
  currentQuestionIndex: number;
  players: QuizPlayer[];
  addBots?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  picture?: string;
  points: number;
  quizzesWon: number;
  bestStreak: number;
}

export const quizooApi = {
  getCategories: async (): Promise<QuizCategory[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: QuizCategory[] }>('/quizoo/categories');
    return data.data;
  },

  getQuestions: async (category: string = 'cs', count: number = 5): Promise<QuizQuestion[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: QuizQuestion[] }>(
      `/quizoo/questions?category=${category}&count=${count}`
    );
    return data.data;
  },

  createRoom: async (payload: {
    category?: string;
    isPublic?: boolean;
    timePerQuestion?: number;
    totalQuestions?: number;
    addBots?: boolean;
    mode?: 'group' | '1v1';
    maxPlayers?: number;
  }): Promise<QuizRoom> => {
    const { data } = await apiClient.post<{ success: boolean; data: QuizRoom }>('/quizoo/rooms/create', payload);
    return data.data;
  },

  find1v1Room: async (category: string = 'cs', addBots: boolean = false, totalQuestions: number = 5): Promise<{ room: QuizRoom; isExisting: boolean }> => {
    const { data } = await apiClient.post<{ success: boolean; data: QuizRoom; isExisting: boolean }>('/quizoo/rooms/1v1', { category, addBots, totalQuestions });
    return { room: data.data, isExisting: data.isExisting };
  },

  findRandomMatch: async (): Promise<{ room: QuizRoom; isExisting: boolean }> => {
    const { data } = await apiClient.post<{ success: boolean; data: QuizRoom; isExisting: boolean }>('/quizoo/rooms/random');
    return { room: data.data, isExisting: data.isExisting };
  },

  getRoomByPin: async (pin: string): Promise<QuizRoom> => {
    const { data } = await apiClient.get<{ success: boolean; data: QuizRoom }>(`/quizoo/rooms/${pin}`);
    return data.data;
  },

  getPublicRooms: async (): Promise<Partial<QuizRoom>[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: Partial<QuizRoom>[] }>('/quizoo/rooms/public');
    return data.data;
  },

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: LeaderboardEntry[] }>('/quizoo/leaderboard');
    return data.data;
  },

  completeQuiz: async (stats: {
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    bestStreak: number;
    isWinner?: boolean;
    earnedCoins?: number;
  }): Promise<{ rewardCoins: number; message: string }> => {
    const { data } = await apiClient.post<{ success: boolean; rewardCoins: number; message: string }>('/quizoo/complete', stats);
    return { rewardCoins: data.rewardCoins, message: data.message };
  }
};
