import express from 'express';
import {
  getCategories,
  createRoom,
  findOrCreate1v1Room,
  findRandomMatch,
  getPublicRooms,
  getRoomByPin,
  getQuestions,
  completeQuiz,
  getLeaderboard
} from '../controllers/quizooController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// Optional authentication middleware that tries to set req.user if token is present
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization || req.cookies?.token;
  if (!token) return next();
  return authenticateJWT(req, res, next);
};

router.get('/categories', getCategories);
router.get('/questions', getQuestions);
router.get('/rooms/public', getPublicRooms);
router.get('/rooms/:pin', getRoomByPin);
router.get('/leaderboard', getLeaderboard);

router.post('/rooms/create', optionalAuth, createRoom);
router.post('/rooms/1v1', optionalAuth, findOrCreate1v1Room);
router.post('/rooms/random', optionalAuth, findRandomMatch);
router.post('/complete', optionalAuth, completeQuiz);

export default router;

