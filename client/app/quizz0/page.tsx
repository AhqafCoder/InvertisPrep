'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import {
  Brain,
  Trophy,
  Users,
  Play,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Flame,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Code2,
  GraduationCap,
  BrainCircuit,
  Cpu,
  Briefcase,
  Dna,
  Scale,
  Pill,
  Sprout,
  Calculator,
  Award,
  ChevronRight,
  ChevronDown,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { quizooApi, QuizCategory, QuizRoom, QuizPlayer, LeaderboardEntry, QuizQuestion } from '@/lib/quizooApi';
import { quizooSound } from '@/lib/quizooSound';
import { toast } from 'sonner';

const AVATARS = ['⚡', '🚀', '🧙‍♂️', '👑', '🎯', '🔥', '🏆', '💎', '👾', '🦊'];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cs: <Code2 className="h-6 w-6 text-indigo-400" />,
  management: <Briefcase className="h-6 w-6 text-blue-400" />,
  biotech: <Dna className="h-6 w-6 text-emerald-400" />,
  law: <Scale className="h-6 w-6 text-amber-400" />,
  pharmacy: <Pill className="h-6 w-6 text-rose-400" />,
  agriculture: <Sprout className="h-6 w-6 text-green-400" />,
  math: <Calculator className="h-6 w-6 text-purple-400" />,
  pyq: <GraduationCap className="h-6 w-6 text-purple-400" />,
  aptitude: <BrainCircuit className="h-6 w-6 text-pink-400" />,
  tech: <Cpu className="h-6 w-6 text-cyan-400" />
};

export default function QuizooPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'lobby' | 'waiting' | 'playing' | 'results'>('lobby');
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Player Form State
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('⚡');
  const [joinPinInput, setJoinPinInput] = useState('');

  // Host Settings State
  const [selectedCategory, setSelectedCategory] = useState('cs');
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(5);
  const [addBots, setAddBots] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Active Game State
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [myStreak, setMyStreak] = useState(0);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const [roomTab, setRoomTab] = useState<'join' | 'create'>('join');
  const [include1v1Bot, setInclude1v1Bot] = useState(true);
  const [isMatching1v1, setIsMatching1v1] = useState(false);
  const [selected1v1Category, setSelected1v1Category] = useState<string>('all');
  const [selected1v1QCount, setSelected1v1QCount] = useState<number>(5);
  const [is1v1CategoryOpen, setIs1v1CategoryOpen] = useState(false);
  const [isHostCategoryOpen, setIsHostCategoryOpen] = useState(false);

  // Socket reference
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync user info when logged in
  useEffect(() => {
    if (user) {
      setPlayerName(user.name?.split(' ')[0] || user.email?.split('@')[0] || 'Quizzer');
    } else if (!playerName) {
      setPlayerName(`Student${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [user]);

  // Load Categories & Leaderboard on mount
  useEffect(() => {
    quizooApi.getCategories().then(setCategories).catch(() => { });
    quizooApi.getLeaderboard().then(setLeaderboard).catch(() => { });
  }, []);

  // Initialize Socket.io Connection
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(backendUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('room_updated', (updatedRoom: QuizRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('game_started', (startedRoom: QuizRoom) => {
      setRoom(startedRoom);
      setView('playing');
      setCurrentQIndex(0);
      setTimeLeft(startedRoom.timePerQuestion);
      setSelectedOption(null);
      setIsAnswerLocked(false);
      setShowExplanation(false);
      quizooSound.playCountdown(true);
    });

    socket.on('player_answered', (data: { playerId?: string; score?: number; streak?: number; room?: QuizRoom }) => {
      if (data?.room) {
        setRoom(data.room);
      } else if (data?.playerId && data?.score !== undefined) {
        setRoom((prev) => {
          if (!prev) return prev;
          const updatedPlayers = prev.players.map((p) =>
            p.id === data.playerId ? { ...p, score: data.score!, streak: data.streak || 0 } : p
          );
          return { ...prev, players: updatedPlayers };
        });
      }
    });

    socket.on('question_changed', (updatedRoom: QuizRoom) => {
      setRoom(updatedRoom);
      setCurrentQIndex(updatedRoom.currentQuestionIndex);
      setTimeLeft(updatedRoom.timePerQuestion);
      setSelectedOption(null);
      setIsAnswerLocked(false);
      setShowExplanation(false);
      quizooSound.playCountdown(false);
    });

    socket.on('game_finished', (finalRoom: QuizRoom) => {
      setRoom(finalRoom);
      setView('results');
      quizooSound.playVictory();

      // Launch Confetti
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Submit results to server to earn QCoins (10 QC for winner, 1 QC for loser)
      const sorted = [...finalRoom.players].sort((a, b) => b.score - a.score);
      const me = finalRoom.players.find(p => p.name === playerName) || finalRoom.players[0];
      const isWinner = sorted[0]?.name === me?.name;
      const earnedCoins = isWinner ? 10 : 1;
      const correctCount = me?.answers ? Object.values(me.answers).filter(a => a.isCorrect).length : 0;

      quizooApi.completeQuiz({
        score: me?.score || 0,
        totalQuestions: finalRoom.totalQuestions,
        correctAnswers: correctCount,
        bestStreak: me?.streak || 0,
        isWinner,
        earnedCoins
      }).then((res) => {
        setRewardMessage(res.message || (isWinner ? `🏆 Victory! You earned 10 QCoins.` : `🎖️ Completed! You earned 1 QCoin.`));
      }).catch(() => {
        setRewardMessage(isWinner ? `🏆 Victory! You earned 10 QCoins.` : `🎖️ Completed! You earned 1 QCoin.`);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [playerName]);

  // Question countdown timer tick
  useEffect(() => {
    if (view === 'playing' && room && !isAnswerLocked) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsAnswerLocked(true);
            setShowExplanation(true);
            quizooSound.playWrong();
            setTimeout(() => {
              if (socketRef.current) {
                socketRef.current.emit('next_question');
              }
            }, 1400);
            return 0;
          }
          if (prev <= 5) quizooSound.playTick();
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, currentQIndex, isAnswerLocked, room]);

  // Sound Toggle
  const handleToggleSound = () => {
    const newState = quizooSound.toggleSound();
    setSoundEnabled(newState);
  };

  // Host Create Room
  const handleCreateRoom = async () => {
    try {
      setIsCreatingRoom(true);
      const newRoom = await quizooApi.createRoom({
        category: selectedCategory,
        timePerQuestion,
        totalQuestions: totalQuestionsCount,
        addBots,
        isPublic: true
      });

      setRoom(newRoom);
      setView('waiting');

      // Join socket room as Host
      if (socketRef.current) {
        socketRef.current.emit('join_room', {
          pin: newRoom.pin,
          player: {
            id: user?.id || 'player-' + Date.now(),
            name: playerName,
            avatar: playerAvatar,
            isHost: true
          }
        });
      }
      quizooSound.playClick();
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join Room by PIN
  const handleJoinRoom = async () => {
    if (!joinPinInput.trim()) return;
    try {
      const targetRoom = await quizooApi.getRoomByPin(joinPinInput.trim());
      setRoom(targetRoom);
      setView('waiting');

      if (socketRef.current) {
        socketRef.current.emit('join_room', {
          pin: targetRoom.pin,
          player: {
            id: user?.id || 'player-' + Date.now(),
            name: playerName,
            avatar: playerAvatar,
            isHost: false
          }
        });
      }
      quizooSound.playClick();
    } catch {
      alert('Invalid PIN code or room expired!');
    }
  };

  // 1v1 Head-to-Head Duel Matchmaking with Matching Animation
  const handle1v1Duel = async (catId: string = selectedCategory, qCount: number = selected1v1QCount) => {
    try {
      setIsCreatingRoom(true);
      setIsMatching1v1(true);
      quizooSound.playClick();

      // Simulate smooth matching animation
      await new Promise(res => setTimeout(res, 1600));

      const { room: duelRoom, isExisting } = await quizooApi.find1v1Room(catId || 'cs', include1v1Bot, qCount);

      setRoom(duelRoom);

      if (socketRef.current) {
        socketRef.current.emit('join_room', {
          pin: duelRoom.pin,
          player: {
            id: user?.id || 'duel-' + Date.now(),
            name: playerName,
            avatar: playerAvatar,
            isHost: !isExisting
          }
        });
      }

      setIsMatching1v1(false);

      if (isExisting || (duelRoom.addBots && duelRoom.players.some(p => p.isBot))) {
        setView('playing');
        toast.success('Opponent Matched! 1v1 Duel Match Started ⚔️');
      } else {
        setView('waiting');
        toast.info('Created 1v1 Duel Room! Waiting for an opponent to join...');
      }
    } catch (err) {
      console.error('Failed to start 1v1 duel:', err);
      toast.error('Failed to start 1v1 duel match.');
      setIsMatching1v1(false);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Match with a random online opponent or public waiting room
  const handleRandomMatch = async () => {
    try {
      setIsCreatingRoom(true);
      const { room: randomRoom, isExisting } = await quizooApi.findRandomMatch();

      setRoom(randomRoom);

      if (socketRef.current) {
        socketRef.current.emit('join_room', {
          pin: randomRoom.pin,
          player: {
            id: user?.id || 'random-' + Date.now(),
            name: playerName,
            avatar: playerAvatar,
            isHost: !isExisting
          }
        });
      }

      if (isExisting) {
        setView('waiting');
        toast.success(`Matched with active public room (${randomRoom.pin})!`);
      } else {
        setView('waiting');
        toast.info('Created new random match lobby! Waiting for players to join...');
      }
      quizooSound.playClick();
    } catch (err) {
      console.error('Random match failed:', err);
      toast.error('Failed to find random match.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Quick Practice Solo Match (Auto Host + Start with AI Bots)
  const handleQuickMatch = async (catId: string = 'cs') => {
    try {
      const quickRoom = await quizooApi.createRoom({
        category: catId,
        timePerQuestion: 15,
        totalQuestions: 5,
        addBots: true,
        isPublic: true
      });

      setRoom(quickRoom);
      setView('playing');

      if (socketRef.current) {
        socketRef.current.emit('join_room', {
          pin: quickRoom.pin,
          player: {
            id: user?.id || 'solo-' + Date.now(),
            name: playerName,
            avatar: playerAvatar,
            isHost: true
          }
        });
        setTimeout(() => {
          socketRef.current?.emit('start_game');
        }, 500);
      }
      quizooSound.playClick();
    } catch (err) {
      console.error(err);
    }
  };

  // Host Starts Game
  const handleStartGame = () => {
    if (socketRef.current && room) {
      socketRef.current.emit('start_game');
      quizooSound.playClick();
    }
  };

  // Player Answer Select
  const handleSelectOption = (index: number) => {
    if (isAnswerLocked || !room) return;

    setSelectedOption(index);
    setIsAnswerLocked(true);
    setShowExplanation(true);

    const currentQ = room.questions[currentQIndex];
    const isCorrect = index === currentQ.correctAnswerIndex;

    if (isCorrect) {
      quizooSound.playCorrect();
      setMyStreak((prev) => prev + 1);
      setMyScore((prev) => prev + 10);
    } else {
      quizooSound.playWrong();
      setMyStreak(0);
      setMyScore((prev) => prev - 2.5);
    }

    if (socketRef.current) {
      socketRef.current.emit('submit_answer', {
        questionIndex: currentQIndex,
        selectedOptionIndex: index,
        timeTakenSeconds: room.timePerQuestion - timeLeft
      });
    }

    // Auto-advance to next question after 1.4 seconds
    setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('next_question');
      }
    }, 1400);
  };

  // Host / Next Question Trigger
  const handleNextQuestion = () => {
    if (socketRef.current && room) {
      socketRef.current.emit('next_question');
      quizooSound.playClick();
    }
  };

  // Copy PIN
  const handleCopyPin = () => {
    if (room?.pin) {
      navigator.clipboard.writeText(room.pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const currentQ: QuizQuestion | undefined = room?.questions[currentQIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/40 to-slate-100 text-slate-900 font-sans selection:bg-purple-500 selection:text-white pb-16">
      {/* Sound & Header Toolbar */}
      <div className="max-w-7xl mx-auto px-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Quizoo <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">Multiplayer</span>
            </h1>
            <p className="text-xs text-slate-500">Real-Time Academic Trivia & Battle Arena</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSound}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-xs transition-all"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5 text-indigo-600" /> : <VolumeX className="h-5 w-5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: MAIN LOBBY */}
      {/* ========================================================================= */}
      {view === 'lobby' && (
        <div className="max-w-7xl mx-auto px-4 mt-8 space-y-10">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 border border-white/20 p-8 sm:p-12 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-semibold backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-pink-200" /> Live Multiplayer Arena
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                Test Your Knowledge, <br />
                <span className="text-white underline decoration-white/40">
                  Challenge Classmates!
                </span>
              </h2>
              <p className="text-white/95 text-sm sm:text-base leading-relaxed font-medium">
                Host private room battles, join live quizzes with a PIN code, or practice against smart AI bots. Win quizzes to earn QCoins!
              </p>
            </div>
          </div>

          {/* 1v1 Duel Mode Highlight Card */}
          <Card className="bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-pink-900/90 border border-indigo-500/40 text-white shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-2.5 text-center md:text-left">
              <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black text-xs px-3 py-1 rounded-full border-none">
                ⚔️ 1v1 RANDOM MATCHMAKING
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Head-to-Head 1v1 Academic Battle
              </h3>
              <p className="text-xs sm:text-sm text-indigo-100/90 max-w-xl">
                Match 1-on-1 with a random online student! 5 rapid trivia questions, speed bonus multipliers, and live head-to-head score clash bar!
              </p>

              {/* Syllabus Category Filter - Custom Mobile-Responsive Dropdown */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 pt-1 w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1 shrink-0">
                  📚 Syllabus:
                </span>
                <div className="relative w-full sm:w-64">
                  <button
                    type="button"
                    onClick={() => setIs1v1CategoryOpen(!is1v1CategoryOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-amber-400/50 bg-indigo-950/90 text-white font-bold text-xs shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all text-left"
                  >
                    <span className="truncate pr-2">
                      {selected1v1Category === 'all'
                        ? '⚡ All Courses (Random Syllabus)'
                        : (categories.find(c => c.id === selected1v1Category)?.title || 'Custom Subject') + ' (30 Qs)'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-amber-400 shrink-0 transition-transform ${is1v1CategoryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu Popup */}
                  {is1v1CategoryOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIs1v1CategoryOpen(false)} />
                      <div className="absolute left-0 top-full mt-1.5 z-40 w-full max-h-56 overflow-y-auto rounded-2xl border border-amber-400/40 bg-slate-900/95 text-white shadow-2xl backdrop-blur-md p-1 space-y-0.5 divide-y divide-slate-800/50">
                        <button
                          type="button"
                          onClick={() => {
                            setSelected1v1Category('all');
                            setIs1v1CategoryOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${selected1v1Category === 'all' ? 'bg-amber-400 text-slate-950 font-black' : 'hover:bg-indigo-800/60 text-amber-200'
                            }`}
                        >
                          <span> All Courses (Random Syllabus)</span>
                          {selected1v1Category === 'all' && <Check className="h-3.5 w-3.5" />}
                        </button>
                        {categories.map((cat) => {
                          const isSelected = selected1v1Category === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelected1v1Category(cat.id);
                                setIs1v1CategoryOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'hover:bg-indigo-800/60 text-slate-200'
                                }`}
                            >
                              <span className="truncate pr-2">{cat.title} (30 Qs)</span>
                              {isSelected && <Check className="h-3.5 w-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Question Count Selector (5, 10, 20, 30) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center md:justify-start gap-1.5 pt-1 w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1 shrink-0">
                  🎯 Questions:
                </span>
                <div className="grid grid-cols-4 sm:flex items-center gap-1.5 w-full sm:w-auto">
                  {[5, 10, 20, 30].map((qCount) => (
                    <button
                      key={qCount}
                      type="button"
                      onClick={() => setSelected1v1QCount(qCount)}
                      className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition-all text-center ${selected1v1QCount === qCount
                        ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                        : 'bg-indigo-950/80 text-indigo-100 border border-amber-400/30 hover:border-amber-400'
                        }`}
                    >
                      {qCount} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot Tick Checkbox */}
              <div className="flex items-center justify-center md:justify-start gap-2 pt-0.5 w-full">
                <input
                  type="checkbox"
                  id="include1v1BotCheck"
                  checked={include1v1Bot}
                  onChange={(e) => setInclude1v1Bot(e.target.checked)}
                  className="h-4 w-4 accent-amber-400 rounded cursor-pointer"
                />
                <label htmlFor="include1v1BotCheck" className="text-xs font-semibold text-amber-200 cursor-pointer select-none">
                  Include AI Bot Opponent if no real user online 🤖
                </label>
              </div>
            </div>

            <Button
              onClick={() => handle1v1Duel(selected1v1Category)}
              disabled={isCreatingRoom || isMatching1v1}
              className="relative z-10 w-full md:w-auto px-8 py-5 sm:py-6 text-sm sm:text-base font-black bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:opacity-95 text-slate-950 rounded-2xl shadow-xl shadow-amber-500/20 shrink-0 transform hover:scale-105 transition-all mt-2 md:mt-0"
            >
              {isMatching1v1 ? 'Searching Opponent...' : 'Play 1v1 Duel Now ⚔️'}
            </Button>
          </Card>

          {/* Quick Actions Grid: Create Room / Join Room / Nickname */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Player Profile / Avatar setup */}
            <Card className="bg-white/95 border border-indigo-100 text-slate-900 shadow-xl rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950">
                  <Zap className="h-5 w-5 text-indigo-600" /> Player Profile
                </CardTitle>
                <CardDescription>Customize your identity for the quiz battle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 block">Nickname</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter nickname..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">Choose Avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map((av) => (
                      <button
                        key={av}
                        onClick={() => setPlayerAvatar(av)}
                        className={`h-10 w-10 text-xl rounded-xl border flex items-center justify-center transition-all ${playerAvatar === av
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-transparent text-white scale-110 shadow-md'
                          : 'border-slate-200 bg-slate-100 hover:bg-slate-200'
                          }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unified Room Battle Hub Card (Join + Create Merged) */}
            <Card className="lg:col-span-2 bg-white/95 border border-indigo-100 text-slate-900 shadow-xl rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950">
                      <Users className="h-5 w-5 text-purple-600" /> Multiplayer Battle Hub
                    </CardTitle>
                    <CardDescription>Join a live battle with PIN or host a new quiz room</CardDescription>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
                    <button
                      onClick={() => setRoomTab('join')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${roomTab === 'join' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      🔑 Join Room
                    </button>
                    <button
                      onClick={() => setRoomTab('create')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${roomTab === 'create' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      ➕ Host Room
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {roomTab === 'join' ? (
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 block">Room PIN Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={joinPinInput}
                        onChange={(e) => setJoinPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 849201"
                        className="w-full text-center tracking-widest text-3xl font-black px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <Button
                      onClick={handleJoinRoom}
                      disabled={joinPinInput.length < 6}
                      className="w-full py-6 text-base font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white shadow-lg shadow-purple-500/25 rounded-xl"
                    >
                      Join Battle Room <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium">
                      {/* Custom Responsive Category Dropdown */}
                      <div className="relative w-full">
                        <span className="text-slate-500 block mb-1 font-semibold">Course / Topic</span>
                        <button
                          type="button"
                          onClick={() => setIsHostCategoryOpen(!isHostCategoryOpen)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 text-xs sm:text-sm hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-left"
                        >
                          <span className="truncate pr-2">
                            {categories.find((c) => c.id === selectedCategory)?.title || 'Select Category'}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${isHostCategoryOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isHostCategoryOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsHostCategoryOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-1 space-y-0.5 divide-y divide-slate-100">
                              {categories.map((cat) => {
                                const isSelected = selectedCategory === cat.id;
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCategory(cat.id);
                                      setIsHostCategoryOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${isSelected ? 'bg-purple-100 text-purple-950 font-bold' : 'hover:bg-indigo-50/70 text-slate-700'
                                      }`}
                                  >
                                    <span className="truncate pr-2">{cat.title}</span>
                                    {isSelected && <Check className="h-4 w-4 text-purple-600 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Questions</span>
                        <select
                          value={totalQuestionsCount}
                          onChange={(e) => setTotalQuestionsCount(Number(e.target.value))}
                          className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                        >
                          <option value={5}>5 Questions</option>
                          <option value={10}>10 Questions</option>
                          <option value={20}>20 Questions</option>
                          <option value={30}>30 Questions</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Time / Question</span>
                        <select
                          value={timePerQuestion}
                          onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                          className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                        >
                          <option value={10}>10 Seconds</option>
                          <option value={15}>15 Seconds</option>
                          <option value={30}>30 Seconds</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="addBotsCheck"
                        checked={addBots}
                        onChange={(e) => setAddBots(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                      <label htmlFor="addBotsCheck" className="text-xs font-medium text-slate-700">
                        Include AI Bot Opponents 🤖
                      </label>
                    </div>

                    <Button
                      onClick={handleCreateRoom}
                      disabled={isCreatingRoom}
                      className="w-full py-5 text-base font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white shadow-lg shadow-purple-500/25 rounded-xl"
                    >
                      {isCreatingRoom ? 'Creating Room...' : 'Create Room & PIN'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white/95 rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-indigo-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" /> Quizoo Hall of Fame
                </h3>
                <p className="text-xs text-slate-500">Top quiz champions across InvertisPrep</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {leaderboard.map((player) => (
                <div key={player.rank} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${player.rank === 1 ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                      player.rank === 2 ? 'bg-slate-200 text-slate-700' :
                        player.rank === 3 ? 'bg-amber-900/10 text-amber-800' : 'text-slate-400'
                      }`}>
                      #{player.rank}
                    </span>
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">{player.name}</h5>
                      <span className="text-xs text-slate-400">Wins: {player.quizzesWon} • Best Streak: 🔥 {player.bestStreak}</span>
                    </div>
                  </div>
                  <span className="font-black text-indigo-600 text-base">{player.points.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ROOM LOBBY / WAITING ROOM */}
      {/* ========================================================================= */}
      {view === 'waiting' && room && (
        <div className="max-w-4xl mx-auto px-4 mt-10 space-y-8">
          <div className="bg-white/95 rounded-3xl p-8 text-slate-900 shadow-2xl border border-indigo-100 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
              <Clock className="h-4 w-4" /> Room Waiting Area
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Share this Room PIN with friends</h2>
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl font-black text-indigo-950 tracking-widest bg-slate-100 px-6 py-2 rounded-2xl border border-slate-300">
                  {room.pin}
                </span>
                <Button onClick={handleCopyPin} variant="outline" className="h-14 w-14 rounded-2xl border-indigo-200">
                  {copiedPin ? <Check className="h-6 w-6 text-emerald-600" /> : <Copy className="h-6 w-6 text-indigo-600" />}
                </Button>
              </div>
            </div>

            {/* Players Grid */}
            <div className="pt-4">
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">
                Joined Players ({room.players.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {room.players.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col items-center gap-2 text-center"
                  >
                    <span className="text-3xl">{p.avatar}</span>
                    <span className="font-bold text-slate-900 text-sm truncate w-full">{p.name}</span>
                    {p.isHost && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">HOST 👑</span>}
                    {p.isBot && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">BOT 🤖</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Host Action */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => setView('lobby')}
                variant="outline"
                className="w-full sm:w-auto px-6 py-6 text-slate-600 rounded-xl"
              >
                Leave Lobby
              </Button>

              <Button
                onClick={handleStartGame}
                disabled={room.mode === '1v1' && room.players.length < 2}
                className={`w-full sm:w-auto px-10 py-6 text-lg font-bold rounded-xl shadow-lg transition-all ${room.mode === '1v1' && room.players.length < 2
                  ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-600/30'
                  }`}
              >
                {room.mode === '1v1' && room.players.length < 2 ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5 animate-spin text-slate-500" /> Waiting for 2nd Opponent...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Start Game Arena <Play className="ml-2 h-5 w-5 fill-current" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: LIVE QUIZ ARENA */}
      {/* ========================================================================= */}
      {view === 'playing' && room && currentQ && (
        <div className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
          {/* 1v1 Duel Head-to-Head Clash Bar */}
          {room.mode === '1v1' && (
            <div className="bg-gradient-to-r from-indigo-900/90 via-purple-950 to-pink-900/90 border border-indigo-500/40 rounded-3xl p-4 sm:p-5 text-white shadow-2xl flex items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-full bg-amber-500/10 blur-xl pointer-events-none" />

              {/* Player 1 (You) */}
              <div className="flex items-center gap-3 relative z-10">
                <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 shadow-md">{playerAvatar}</span>
                <div>
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">{playerName} (You)</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-400">{myScore} Marks</span>
                </div>
              </div>

              {/* Center VS Badge */}
              <div className="text-center shrink-0 relative z-10">
                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                  ⚔️ VS ⚔️
                </span>
                <span className="text-[10px] font-bold text-indigo-200 block mt-1">1v1 DUEL</span>
              </div>

              {/* Player 2 (Opponent) */}
              {(() => {
                const opponent = room.players.find((p) => p.name !== playerName) || { name: 'Rival Opponent ⚔️', avatar: '⚔️', score: 0 };
                return (
                  <div className="flex items-center gap-3 text-right relative z-10">
                    <div>
                      <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wider block truncate max-w-[120px] sm:max-w-none">{opponent.name}</span>
                      <span className="text-xl sm:text-2xl font-black text-amber-400">{opponent.score || 0} Marks</span>
                    </div>
                    <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-pink-500/20 border border-pink-400/30 shadow-md">{opponent.avatar}</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Top Progress & Timer Bar */}
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Question {currentQIndex + 1} of {room.totalQuestions}
              </span>
              {myStreak >= 2 && (
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1 animate-pulse">
                  <Flame className="h-4 w-4 fill-amber-400" /> {myStreak}x STREAK
                </span>
              )}
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              <span className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* Question Card */}
          <Card className="bg-white/95 border border-indigo-100 text-slate-900 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 sm:p-8 border-b border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Category: {currentQ.category.toUpperCase()}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {currentQ.difficulty.toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-black text-indigo-950 leading-snug">
                {currentQ.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQ.correctAnswerIndex;

                  let optionStyle = 'border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800';
                  if (isAnswerLocked) {
                    if (isCorrect) {
                      optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400';
                    } else if (isSelected) {
                      optionStyle = 'border-rose-500 bg-rose-50 text-rose-950 font-bold';
                    } else {
                      optionStyle = 'opacity-50 border-slate-200 bg-slate-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswerLocked}
                      onClick={() => handleSelectOption(idx)}
                      className={`p-4 rounded-2xl border-2 text-left font-semibold text-sm transition-all flex items-center justify-between ${optionStyle}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </span>
                      {isAnswerLocked && isCorrect && <Check className="h-5 w-5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Solution Explanation Box */}
              {showExplanation && (
                <div className="mt-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Solution Explanation
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {currentQ.explanation}
                  </p>
                </div>
              )}

              {/* Auto Next Indicator */}
              {isAnswerLocked && (
                <div className="pt-3 flex items-center justify-end gap-2 text-xs font-bold text-indigo-700 animate-pulse">
                  <Sparkles className="h-4 w-4 text-purple-600 animate-spin" /> Auto-advancing to next question...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: VICTORY PODIUM & RESULTS */}
      {/* ========================================================================= */}
      {view === 'results' && room && (
        <div className="max-w-4xl mx-auto px-4 mt-10 space-y-8">
          <div className="bg-white/95 rounded-3xl p-8 text-slate-900 shadow-2xl border border-indigo-100 text-center space-y-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                Battle Results
              </span>
              <h2 className="text-3xl font-black text-indigo-950 mt-2">
                Quiz Battle Finished! 🏆
              </h2>
            </div>

            {/* Podium Display (Sorted by Score) */}
            {(() => {
              const sorted = [...room.players].sort((a, b) => b.score - a.score);

              return (
                <div className="space-y-6">

                  {rewardMessage && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-800 font-bold text-sm border border-amber-300">
                      <Award className="h-5 w-5 text-amber-600" /> {rewardMessage}
                    </div>
                  )}

                  {/* Podium Display (Sorted by Score) */}
                  <div className="flex items-end justify-center gap-4 sm:gap-8 pt-4 pb-4">
                    {/* 2nd Place */}
                    {sorted[1] && (
                      <div className="flex flex-col items-center">
                        <span className="text-3xl mb-1">{sorted[1].avatar}</span>
                        <span className="font-bold text-xs truncate max-w-[80px] text-slate-900">{sorted[1].name}</span>
                        <span className="text-xs font-black text-indigo-600 mb-2">{sorted[1].score} Marks</span>
                        <div className="w-20 sm:w-24 h-24 bg-slate-200 rounded-t-2xl flex items-center justify-center font-black text-slate-500 text-xl border-t-4 border-slate-400">
                          2nd
                        </div>
                      </div>
                    )}

                    {/* 1st Place */}
                    {sorted[0] && (
                      <div className="flex flex-col items-center">
                        <span className="text-4xl mb-1">👑 {sorted[0].avatar}</span>
                        <span className="font-bold text-sm truncate max-w-[100px] text-slate-900">{sorted[0].name}</span>
                        <span className="text-xs font-black text-amber-600 mb-2">{sorted[0].score} Marks</span>
                        <div className="w-24 sm:w-28 h-36 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-2xl flex items-center justify-center font-black text-amber-950 text-2xl border-t-4 border-amber-500 shadow-lg">
                          1st
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {sorted[2] && (
                      <div className="flex flex-col items-center">
                        <span className="text-3xl mb-1">{sorted[2].avatar}</span>
                        <span className="font-bold text-xs truncate max-w-[80px] text-slate-900">{sorted[2].name}</span>
                        <span className="text-xs font-black text-indigo-600 mb-2">{sorted[2].score} Marks</span>
                        <div className="w-20 sm:w-24 h-16 bg-amber-950/20 rounded-t-2xl flex items-center justify-center font-black text-amber-800 text-lg border-t-4 border-amber-700">
                          3rd
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <Button
              onClick={() => setView('lobby')}
              className="px-10 py-6 text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg"
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Return to Quizoo Lobby
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1V1 SEARCHING & MATCHING ANIMATION OVERLAY MODAL */}
      {/* ========================================================================= */}
      {isMatching1v1 && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-indigo-900 via-purple-950 to-slate-900 border border-indigo-500/40 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-400 animate-spin" />
              <div className="absolute inset-6 rounded-full bg-indigo-600/30 border border-indigo-400/40 backdrop-blur-sm" />
              <span className="text-5xl relative z-10 animate-bounce">{playerAvatar}</span>
            </div>

            <div className="space-y-2 relative z-10">
              <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black text-xs px-3.5 py-1 rounded-full border-none shadow-md">
                ⚔️ MATCHMAKING RADAR
              </Badge>
              <h3 className="text-2xl font-black text-white">Searching for 1v1 Opponent</h3>
              <p className="text-xs text-indigo-200/90 leading-relaxed">
                Scanning Invertis campus for live players... Matching avatars for duel!
              </p>
            </div>

            <Button
              onClick={() => {
                setIsMatching1v1(false);
                setIsCreatingRoom(false);
              }}
              variant="outline"
              className="w-full py-4 text-xs font-bold border-indigo-400/40 text-indigo-200 hover:bg-white/10 rounded-xl relative z-10"
            >
              Cancel Matchmaking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
