import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import quizooRoutes from './routes/quizoo.js';
import { initQuizooSocket } from './services/quizooSocket.js';
import dns from 'dns';

dns.setServers(["1.1.1.1", "8.8.8.8"]);

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT) || 5001;

const initApp = async () => {
  // Connect to MongoDB
  await connectDB();

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Quizoo Standalone Server is running' });
  });

  // Quizoo API Routes
  app.use('/api/quizoo', quizooRoutes);

  // Initialize Socket.io real-time server
  initQuizooSocket(httpServer);

  // Error handling
  app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'Resource not found' });
  });

  app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Quizoo Standalone Server running on port ${PORT}`);
  });
};

initApp().catch((error) => {
  console.error('Failed to start Quizoo server:', error);
  process.exit(1);
});

export default app;
