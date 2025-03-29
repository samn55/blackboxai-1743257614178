require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const { GameManager } = require('./services/gameService');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize Game Manager
const gameManager = new GameManager();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const message = `Welcome to Addis Bingo! 🎮\n\nChoose from the options below.`;
    const options = {
        reply_markup: {
            keyboard: [
                ['Play 🎮', 'Register 📝'],
                ['Check Balance 💰', 'Deposit 💳'],
                ['Contact support 📞', 'Instruction 📖'],
                ['Invite 📧']
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(chatId, message, options);
});

bot.onText(/\/play|Play 🎮/, (msg) => {
    const chatId = msg.chat.id;
    const message = 'Best of luck on your gaming adventure! 🎮';
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Play10 🎮', callback_data: 'play_10' },
                    { text: 'Play20 🎮', callback_data: 'play_20' }
                ],
                [
                    { text: 'Play50 🎮', callback_data: 'play_50' },
                    { text: 'Play100 🎮', callback_data: 'play_100' }
                ],
                [{ text: 'Play Demo 🎮', callback_data: 'play_demo' }]
            ]
        }
    };
    bot.sendMessage(chatId, message, options);
});

// Handle callback queries
bot.on('callback_query', (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    switch (action) {
        case 'play_10':
        case 'play_20':
        case 'play_50':
        case 'play_100':
        case 'play_demo':
            const stake = action.split('_')[1];
            const gameId = gameManager.createGame(parseInt(stake));
            bot.sendMessage(chatId, `Starting game with stake ${stake}. Game ID: ${gameId}`);
            break;
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinGame', ({ gameId }) => {
        try {
            const board = gameManager.generateBoard();
            gameManager.joinGame(gameId, socket.id, board);
            
            const game = gameManager.getGame(gameId);
            if (game) {
                socket.join(gameId);
                io.to(gameId).emit('updateGameState', game.getGameState());
                console.log(`Player ${socket.id} joined game ${gameId}`);
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('markNumber', ({ gameId, number }) => {
        try {
            const game = gameManager.getGame(gameId);
            if (game) {
                game.markNumber(socket.id, number);
                socket.emit('numberMarked', { success: true, number });
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('bingoClaim', ({ gameId }) => {
        try {
            const game = gameManager.getGame(gameId);
            if (game && game.checkBingo(socket.id)) {
                const result = game.endGame(socket.id);
                io.to(gameId).emit('gameWon', {
                    winner: socket.id,
                    ...result
                });
            } else {
                socket.emit('error', { message: 'Invalid bingo claim' });
            }
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('leaveGame', () => {
        gameManager.leaveCurrentGame(socket.id);
        console.log(`Player ${socket.id} left their game`);
    });

    socket.on('disconnect', () => {
        gameManager.leaveCurrentGame(socket.id);
        console.log('Client disconnected:', socket.id);
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});