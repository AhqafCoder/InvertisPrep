import { Server } from 'socket.io';
import { ACTIVE_ROOMS } from '../controllers/quizooController.js';

export function initQuizooSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Quizoo Socket Connected: ${socket.id}`);

    // Join room event
    socket.on('join_room', ({ pin, player }) => {
      const room = ACTIVE_ROOMS.get(pin);
      if (!room) {
        socket.emit('error_message', { message: 'Room not found or expired.' });
        return;
      }

      socket.join(pin);
      socket.data.pin = pin;
      socket.data.playerId = player.id || socket.id;

      // Check if player already exists
      const existingIdx = room.players.findIndex(p => p.id === socket.data.playerId);
      const newPlayer = {
        id: socket.data.playerId,
        socketId: socket.id,
        name: player.name || 'Quizzer',
        avatar: player.avatar || '⚡',
        score: 0,
        streak: 0,
        isReady: player.isHost ? true : false,
        isHost: Boolean(player.isHost),
        isBot: false,
        lastAnswerTime: null,
        answers: {}
      };

      if (existingIdx >= 0) {
        room.players[existingIdx] = { ...room.players[existingIdx], ...newPlayer };
      } else {
        room.players.push(newPlayer);
      }

      // Add AI Bots if host enabled them and room needs players
      if (room.addBots && room.players.filter(p => !p.isBot).length >= 1 && room.players.filter(p => p.isBot).length === 0) {
        if (room.mode === '1v1') {
          // Add single 1v1 rival bot
          room.players.push({
            id: 'bot-1v1',
            socketId: null,
            name: 'RivalBot ⚔️',
            avatar: '⚔️',
            score: 0,
            streak: 0,
            isReady: true,
            isHost: false,
            isBot: true,
            answers: {}
          });
        } else {
          // Group battle 3 bots
          const botNames = ['ByteBot 🤖', 'LogicWizard 🧙‍♂️', 'CyberNova ⚡'];
          const botAvatars = ['🤖', '🧙‍♂️', '🚀'];
          for (let i = 0; i < 3; i++) {
            room.players.push({
              id: `bot-${i + 1}`,
              socketId: null,
              name: botNames[i],
              avatar: botAvatars[i],
              score: 0,
              streak: 0,
              isReady: true,
              isHost: false,
              isBot: true,
              answers: {}
            });
          }
        }
      }

      io.to(pin).emit('room_updated', room);

      // Auto-start 1v1 duel as soon as 2 players (including bot) are in the room!
      if (room.mode === '1v1' && room.players.length === 2 && room.status === 'waiting') {
        room.status = 'playing';
        room.currentQuestionIndex = 0;
        room.questionStartTime = Date.now();
        setTimeout(() => {
          io.to(pin).emit('game_started', room);
          simulateBotAnswers(io, room);
        }, 500);
      }
    });

    // Toggle player ready status
    socket.on('toggle_ready', () => {
      const pin = socket.data.pin;
      const room = ACTIVE_ROOMS.get(pin);
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(pin).emit('room_updated', room);
      }
    });

    // Start game host event
    socket.on('start_game', () => {
      const pin = socket.data.pin;
      const room = ACTIVE_ROOMS.get(pin);
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player || !player.isHost) return;

      // 1v1 mode safety: game CANNOT start without 2 players!
      if (room.mode === '1v1' && room.players.length < 2) {
        socket.emit('error_message', { message: 'Cannot start 1v1 duel without an opponent! Waiting for real player...' });
        return;
      }

      room.status = 'playing';
      room.currentQuestionIndex = 0;
      room.questionStartTime = Date.now();

      io.to(pin).emit('game_started', room);

      // Trigger bot answer simulation if bots are present
      simulateBotAnswers(io, room);
    });

    // Submit Answer event
    socket.on('submit_answer', ({ questionIndex, selectedOptionIndex, timeTakenSeconds }) => {
      const pin = socket.data.pin;
      const room = ACTIVE_ROOMS.get(pin);
      if (!room || room.status !== 'playing') return;

      const currentQ = room.questions[questionIndex];
      if (!currentQ) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      const isCorrect = selectedOptionIndex === currentQ.correctAnswerIndex;

      // Simple Scoring System: +10 marks for correct, -2.5 marks for incorrect
      let points = 0;
      if (isCorrect) {
        player.streak += 1;
        points = 10;
      } else {
        player.streak = 0;
        points = -2.5;
      }

      player.score += points;
      player.answers[questionIndex] = {
        selectedOptionIndex,
        isCorrect,
        pointsEarned: points
      };

      io.to(pin).emit('player_answered', {
        playerId: player.id,
        score: player.score,
        streak: player.streak,
        isCorrect
      });

      // Check if all players answered
      const activePlayers = room.players.filter(p => !p.isBot);
      const allAnswered = activePlayers.every(p => p.answers[questionIndex] !== undefined);

      if (allAnswered) {
        io.to(pin).emit('all_players_answered', room);
      }
    });

    // Next Question event
    socket.on('next_question', () => {
      const pin = socket.data.pin;
      const room = ACTIVE_ROOMS.get(pin);
      if (!room) return;

      if (room.currentQuestionIndex + 1 < room.questions.length) {
        room.currentQuestionIndex += 1;
        room.questionStartTime = Date.now();
        io.to(pin).emit('question_changed', room);
        simulateBotAnswers(io, room);
      } else {
        room.status = 'finished';
        io.to(pin).emit('game_finished', room);
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      const pin = socket.data.pin;
      if (!pin) return;

      const room = ACTIVE_ROOMS.get(pin);
      if (!room) return;

      room.players = room.players.filter(p => p.socketId !== socket.id);
      if (room.players.length === 0) {
        ACTIVE_ROOMS.delete(pin);
      } else {
        io.to(pin).emit('room_updated', room);
      }
    });
  });

  return io;
}

// Bot automated answer simulation
function simulateBotAnswers(io, room) {
  const bots = room.players.filter(p => p.isBot);
  if (bots.length === 0) return;

  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ) return;

  bots.forEach((bot) => {
    // Random delay between 2 to (timePerQuestion - 2) seconds
    const delayMs = Math.floor(2000 + Math.random() * (room.timePerQuestion * 700));

    setTimeout(() => {
      if (room.status !== 'playing') return;

      // 70% chance bot gets correct answer
      const getsItRight = Math.random() < 0.70;
      const selectedIndex = getsItRight
        ? currentQ.correctAnswerIndex
        : (currentQ.correctAnswerIndex + 1) % currentQ.options.length;

      const isCorrect = selectedIndex === currentQ.correctAnswerIndex;
      let points = 0;
      if (isCorrect) {
        bot.streak += 1;
        points = 10;
      } else {
        bot.streak = 0;
        points = -2.5;
      }

      bot.score += points;
      bot.answers[room.currentQuestionIndex] = {
        selectedOptionIndex: selectedIndex,
        isCorrect,
        pointsEarned: points
      };

      io.to(room.pin).emit('player_answered', {
        playerId: bot.id,
        score: bot.score,
        streak: bot.streak,
        isCorrect,
        room
      });

      io.to(room.pin).emit('room_updated', room);
    }, delayMs);
  });
}
