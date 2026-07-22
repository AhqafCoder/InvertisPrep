import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuizStats } from '../models/Quizoo.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const questionsPath = path.join(__dirname, '../data/quizooQuestions.json');

// Load questions from JSON data file
const SAMPLE_QUESTIONS = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

// Memory room cache
const ACTIVE_ROOMS = new Map();

// Helper to generate PIN
const generateRoomPin = () => Math.floor(100000 + Math.random() * 900000).toString();

// Get All Categories (Dynamically populated from Database Departments + Custom Subjects)
export const getCategories = async (req, res) => {
  try {
    // 1. Static base categories
    const staticCategories = [
      {
        id: 'cs',
        title: 'Computer Science & Coding',
        description: 'Data Structures, Algorithms, Web Dev, OS & DBMS',
        icon: 'Code2',
        color: 'from-indigo-600 to-purple-600',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'cs').length
      },
      {
        id: 'management',
        title: 'Management & Commerce',
        description: 'BBA, MBA, Principles of Management, Marketing & Finance',
        icon: 'Briefcase',
        color: 'from-blue-600 to-indigo-700',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'management').length
      },
      {
        id: 'biotech',
        title: 'Biotechnology & Life Sciences',
        description: 'Genetics, Recombinant DNA, Molecular Biology & Micro',
        icon: 'Dna',
        color: 'from-emerald-600 to-teal-700',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'biotech').length
      },
      {
        id: 'law',
        title: 'Law & Legal Studies',
        description: 'Constitutional Law, Jurisprudence & Criminal Law',
        icon: 'Scale',
        color: 'from-amber-600 to-orange-700',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'law').length
      },
      {
        id: 'pharmacy',
        title: 'Pharmacy & Health Sciences',
        description: 'Pharmacology, Pharmaceutics & Medical Dosage',
        icon: 'Pill',
        color: 'from-rose-600 to-pink-700',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'pharmacy').length
      },
      {
        id: 'agriculture',
        title: 'Agriculture Sciences',
        description: 'Agronomy, Soil Science & Crop Diseases',
        icon: 'Sprout',
        color: 'from-green-600 to-emerald-700',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'agriculture').length
      },
      {
        id: 'pyq',
        title: 'Invertis PYQ Special',
        description: 'Actual exam questions from previous year papers',
        icon: 'GraduationCap',
        color: 'from-purple-600 to-indigo-700',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'pyq').length
      },
      {
        id: 'aptitude',
        title: 'Aptitude & Logical Reasoning',
        description: 'Quant, Speed Math, Sequences & Logical Puzzles',
        icon: 'BrainCircuit',
        color: 'from-indigo-500 via-purple-500 to-indigo-800',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'aptitude').length
      },
      {
        id: 'tech',
        title: 'AI, Tech & Innovation',
        description: 'Machine Learning, Web3, Cloud Computing & Latest Tech',
        icon: 'Cpu',
        color: 'from-purple-700 to-pink-600',
        questionCount: SAMPLE_QUESTIONS.filter(q => q.category === 'tech').length
      }
    ];

    // 2. Fetch active Departments from MongoDB
    const dbDepartments = await Department.find({ isActive: true }).lean();

    // 3. Merge DB departments if not already present
    const categoryMap = new Map();
    staticCategories.forEach(cat => categoryMap.set(cat.id, cat));

    dbDepartments.forEach(dept => {
      if (!categoryMap.has(dept.id)) {
        categoryMap.set(dept.id, {
          id: dept.id,
          title: dept.displayName || dept.name,
          description: dept.description || `Official Quiz & Trivia for ${dept.name}`,
          icon: dept.icon || '🎓',
          color: 'from-indigo-600 to-purple-600',
          questionCount: SAMPLE_QUESTIONS.filter(q => q.category === dept.id).length || 30
        });
      }
    });

    const finalCategories = Array.from(categoryMap.values());

    return res.status(200).json({ success: true, data: finalCategories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create Room
export const createRoom = async (req, res) => {
  try {
    const { category = 'cs', isPublic = true, timePerQuestion = 15, totalQuestions = 5, addBots = false, mode = 'group' } = req.body;
    const pin = generateRoomPin();

    let questions = SAMPLE_QUESTIONS.filter(q => category === 'all' || q.category === category);
    if (questions.length === 0) questions = SAMPLE_QUESTIONS;

    let questionPool = [...questions];
    while (questionPool.length < Number(totalQuestions)) {
      questionPool = questionPool.concat(questions);
    }
    const selectedQuestions = questionPool.sort(() => 0.5 - Math.random()).slice(0, Number(totalQuestions));

    const room = {
      pin,
      hostId: req.user?._id?.toString() || 'host-' + Date.now(),
      hostName: req.user?.name || req.user?.email?.split('@')[0] || 'Host',
      category,
      mode: mode === '1v1' ? '1v1' : 'group',
      maxPlayers: mode === '1v1' ? 2 : 10,
      timePerQuestion: Number(timePerQuestion),
      totalQuestions: selectedQuestions.length,
      questions: selectedQuestions,
      isPublic: Boolean(isPublic),
      status: 'waiting',
      currentQuestionIndex: 0,
      players: [],
      addBots: Boolean(addBots),
      createdAt: new Date()
    };

    ACTIVE_ROOMS.set(pin, room);

    return res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Find existing 1v1 room waiting for an opponent OR create a new 1v1 room
export const findOrCreate1v1Room = async (req, res) => {
  try {
    const { category = 'cs', timePerQuestion = 15, totalQuestions = 5, addBots = false } = req.body;

    // Check if there is an active 1v1 waiting room with 1 player matching the syllabus category
    const existing1v1Room = Array.from(ACTIVE_ROOMS.values()).find(
      r => r.mode === '1v1' && r.status === 'waiting' && r.players.length === 1 && (category === 'all' || r.category === category)
    );

    if (existing1v1Room) {
      return res.status(200).json({
        success: true,
        data: existing1v1Room,
        isExisting: true
      });
    }

    // Otherwise create a new 1v1 room
    const pin = generateRoomPin();
    let questions = SAMPLE_QUESTIONS.filter(q => category === 'all' || q.category === category);
    if (questions.length === 0) questions = SAMPLE_QUESTIONS;

    let questionPool = [...questions];
    while (questionPool.length < Number(totalQuestions)) {
      questionPool = questionPool.concat(questions);
    }
    const selectedQuestions = questionPool.sort(() => 0.5 - Math.random()).slice(0, Number(totalQuestions));

    const room = {
      pin,
      hostId: req.user?._id?.toString() || 'host-' + Date.now(),
      hostName: req.user?.name || req.user?.email?.split('@')[0] || 'Host',
      category,
      mode: '1v1',
      maxPlayers: 2,
      timePerQuestion: Number(timePerQuestion),
      totalQuestions: selectedQuestions.length,
      questions: selectedQuestions,
      isPublic: true,
      status: 'waiting',
      currentQuestionIndex: 0,
      players: [],
      addBots: Boolean(addBots),
      createdAt: new Date()
    };

    ACTIVE_ROOMS.set(pin, room);

    return res.status(201).json({
      success: true,
      data: room,
      isExisting: false
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Match with ANY available public waiting room or create a new public room
export const findRandomMatch = async (req, res) => {
  try {
    // 1. Find any active waiting public room with space available
    const openRoom = Array.from(ACTIVE_ROOMS.values()).find(
      r => r.isPublic && r.status === 'waiting' && r.players.length < (r.maxPlayers || 10)
    );

    if (openRoom) {
      return res.status(200).json({
        success: true,
        data: openRoom,
        isExisting: true
      });
    }

    // 2. If no open room exists, pick a random category and create a new public room
    const categories = ['cs', 'management', 'aptitude', 'tech'];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const pin = generateRoomPin();

    let questions = SAMPLE_QUESTIONS.filter(q => q.category === randomCat);
    if (questions.length === 0) questions = SAMPLE_QUESTIONS;
    const selectedQuestions = [...questions].sort(() => 0.5 - Math.random()).slice(0, 5);

    const room = {
      pin,
      hostId: req.user?._id?.toString() || 'host-' + Date.now(),
      hostName: req.user?.name || req.user?.email?.split('@')[0] || 'Host',
      category: randomCat,
      mode: 'group',
      maxPlayers: 10,
      timePerQuestion: 15,
      totalQuestions: selectedQuestions.length,
      questions: selectedQuestions,
      isPublic: true,
      status: 'waiting',
      currentQuestionIndex: 0,
      players: [],
      addBots: false,
      createdAt: new Date()
    };

    ACTIVE_ROOMS.set(pin, room);

    return res.status(201).json({
      success: true,
      data: room,
      isExisting: false
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Public Rooms
export const getPublicRooms = async (req, res) => {
  try {
    const rooms = Array.from(ACTIVE_ROOMS.values())
      .filter(r => r.isPublic && r.status === 'waiting')
      .map(r => ({
        pin: r.pin,
        hostName: r.hostName,
        category: r.category,
        playerCount: r.players.length,
        timePerQuestion: r.timePerQuestion,
        totalQuestions: r.totalQuestions
      }));

    return res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Room by PIN
export const getRoomByPin = async (req, res) => {
  try {
    const { pin } = req.params;
    const room = ACTIVE_ROOMS.get(pin);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found or expired' });
    }

    return res.status(200).json({ success: true, data: room });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Questions for Quick Match
export const getQuestions = async (req, res) => {
  try {
    const { category = 'cs', count = 5 } = req.query;
    let questions = SAMPLE_QUESTIONS.filter(q => category === 'all' || q.category === category);
    if (questions.length === 0) questions = SAMPLE_QUESTIONS;

    const shuffled = [...questions].sort(() => 0.5 - Math.random()).slice(0, Number(count));

    return res.status(200).json({ success: true, data: shuffled });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Complete Quiz & Award QCoins (10 QCoins for Winner, 1 QCoin for Loser)
export const completeQuiz = async (req, res) => {
  try {
    const { score = 0, totalQuestions = 5, correctAnswers = 0, bestStreak = 0, isWinner = false, earnedCoins } = req.body;
    
    // 10 QCoins for Winner, 1 QCoin for Loser
    const rewardCoins = earnedCoins !== undefined ? Number(earnedCoins) : (isWinner ? 10 : 1);

    if (req.user) {
      const user = await User.findById(req.user._id || req.user.id);
      if (user) {
        user.qcoins = (user.qcoins || 0) + rewardCoins;
        await user.save();
      }

      let stats = await QuizStats.findOne({ user: req.user._id || req.user.id });
      if (!stats) {
        stats = new QuizStats({ user: req.user._id || req.user.id });
      }
      stats.totalQuizzesPlayed += 1;
      stats.totalPoints += score;
      stats.correctAnswersCount += correctAnswers;
      stats.totalQuestionsAnswered += totalQuestions;
      if (bestStreak > stats.bestStreak) stats.bestStreak = bestStreak;
      if (isWinner) stats.quizzesWon += 1;
      await stats.save();
    }

    return res.status(200).json({
      success: true,
      rewardCoins,
      message: isWinner ? `🏆 Winner! You earned 10 QCoins!` : `🎖️ Match Finished! You earned 1 QCoin.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Global Leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const topStats = await QuizStats.find()
      .populate('user', 'name email picture avatar')
      .sort({ totalPoints: -1 })
      .limit(10);

    const formattedLeaderboard = topStats.map((item, idx) => ({
      rank: idx + 1,
      name: item.user?.name || item.user?.email?.split('@')[0] || 'Anonymous Quizzer',
      picture: item.user?.picture,
      points: item.totalPoints,
      quizzesWon: item.quizzesWon,
      bestStreak: item.bestStreak
    }));

    return res.status(200).json({ success: true, data: formattedLeaderboard });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { ACTIVE_ROOMS };
