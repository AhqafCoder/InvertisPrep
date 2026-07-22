import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  category: { type: String, required: true, index: true },
  title: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true },
  explanation: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  points: { type: Number, default: 100 },
}, { timestamps: true });

const quizStatsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalQuizzesPlayed: { type: Number, default: 0 },
  quizzesWon: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  correctAnswersCount: { type: Number, default: 0 },
  totalQuestionsAnswered: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
}, { timestamps: true });

export const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
export const QuizStats = mongoose.models.QuizStats || mongoose.model('QuizStats', quizStatsSchema);
