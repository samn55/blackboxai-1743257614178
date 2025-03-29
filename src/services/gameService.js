class BingoGame {
    constructor(gameId, stake) {
        this.gameId = gameId;
        this.stake = stake;
        this.players = new Map(); // Map of player IDs to their boards
        this.calledNumbers = [];
        this.status = 'waiting';
        this.currentCall = null;
        this.bonus = 0;
        this.derash = 0;
        this.winner = null;
        this.lastCallTime = null;
        this.callInterval = 3000; // 3 seconds between calls
    }

    addPlayer(playerId, board) {
        if (this.status !== 'waiting') {
            throw new Error('Cannot join game in progress');
        }
        if (this.players.has(playerId)) {
            throw new Error('Player already in game');
        }
        this.players.set(playerId, {
            board: board,
            markedNumbers: new Set()
        });
        return true;
    }

    removePlayer(playerId) {
        return this.players.delete(playerId);
    }

    startGame() {
        if (this.players.size < 1) {
            throw new Error('Not enough players to start game');
        }
        this.status = 'started';
        this.lastCallTime = Date.now();
        return true;
    }

    callNumber() {
        if (this.status !== 'started') {
            throw new Error('Game not in progress');
        }

        // Check if enough time has passed since last call
        const now = Date.now();
        if (this.lastCallTime && (now - this.lastCallTime) < this.callInterval) {
            throw new Error('Too soon for next call');
        }

        // Generate numbers 1-75 if not already called
        const availableNumbers = Array.from({length: 75}, (_, i) => i + 1)
            .filter(num => !this.calledNumbers.includes(num));

        if (availableNumbers.length === 0) {
            throw new Error('All numbers have been called');
        }

        // Randomly select a number
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const calledNumber = availableNumbers[randomIndex];

        this.currentCall = calledNumber;
        this.calledNumbers.push(calledNumber);
        this.lastCallTime = now;

        return calledNumber;
    }

    markNumber(playerId, number) {
        const player = this.players.get(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        if (!this.calledNumbers.includes(number)) {
            throw new Error('Number has not been called');
        }

        if (player.board.includes(number)) {
            player.markedNumbers.add(number);
            return true;
        }

        return false;
    }

    checkBingo(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        // Convert marked numbers to array and sort
        const markedNumbers = Array.from(player.markedNumbers).sort((a, b) => a - b);

        // Check rows
        for (let i = 0; i < 5; i++) {
            const row = player.board.slice(i * 5, (i + 1) * 5);
            if (row.every(num => player.markedNumbers.has(num))) {
                return true;
            }
        }

        // Check columns
        for (let i = 0; i < 5; i++) {
            const column = [
                player.board[i],
                player.board[i + 5],
                player.board[i + 10],
                player.board[i + 15],
                player.board[i + 20]
            ];
            if (column.every(num => player.markedNumbers.has(num))) {
                return true;
            }
        }

        // Check diagonals
        const diagonal1 = [
            player.board[0],
            player.board[6],
            player.board[12],
            player.board[18],
            player.board[24]
        ];
        const diagonal2 = [
            player.board[4],
            player.board[8],
            player.board[12],
            player.board[16],
            player.board[20]
        ];

        if (diagonal1.every(num => player.markedNumbers.has(num)) ||
            diagonal2.every(num => player.markedNumbers.has(num))) {
            return true;
        }

        return false;
    }

    endGame(winnerId) {
        this.status = 'finished';
        this.winner = winnerId;
        return {
            winner: winnerId,
            stake: this.stake,
            bonus: this.bonus,
            derash: this.derash
        };
    }

    getGameState() {
        return {
            gameId: this.gameId,
            status: this.status,
            players: this.players.size,
            calledNumbers: this.calledNumbers,
            currentCall: this.currentCall,
            bonus: this.bonus,
            derash: this.derash,
            winner: this.winner
        };
    }
}

class GameManager {
    constructor() {
        this.games = new Map();
        this.playerGames = new Map(); // Track which game each player is in
    }

    createGame(stake = 10) {
        const gameId = 'H' + Math.random().toString(36).substr(2, 5).toUpperCase();
        const game = new BingoGame(gameId, stake);
        this.games.set(gameId, game);
        return gameId;
    }

    joinGame(gameId, playerId, board) {
        const game = this.games.get(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        // Remove player from any existing game
        this.leaveCurrentGame(playerId);

        // Add player to new game
        game.addPlayer(playerId, board);
        this.playerGames.set(playerId, gameId);
        return true;
    }

    leaveCurrentGame(playerId) {
        const currentGameId = this.playerGames.get(playerId);
        if (currentGameId) {
            const game = this.games.get(currentGameId);
            if (game) {
                game.removePlayer(playerId);
                if (game.players.size === 0) {
                    this.games.delete(currentGameId);
                }
            }
            this.playerGames.delete(playerId);
        }
    }

    getGame(gameId) {
        return this.games.get(gameId);
    }

    getPlayerGame(playerId) {
        const gameId = this.playerGames.get(playerId);
        if (gameId) {
            return this.games.get(gameId);
        }
        return null;
    }

    generateBoard() {
        // Generate a valid bingo board with random numbers
        const board = [];
        
        // B (1-15)
        const b = this.generateRandomNumbers(1, 15, 5);
        // I (16-30)
        const i = this.generateRandomNumbers(16, 30, 5);
        // N (31-45)
        const n = this.generateRandomNumbers(31, 45, 5);
        // G (46-60)
        const g = this.generateRandomNumbers(46, 60, 5);
        // O (61-75)
        const o = this.generateRandomNumbers(61, 75, 5);

        // Combine all columns
        for (let row = 0; row < 5; row++) {
            board.push(b[row], i[row], n[row], g[row], o[row]);
        }

        return board;
    }

    generateRandomNumbers(min, max, count) {
        const numbers = [];
        while (numbers.length < count) {
            const num = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        }
        return numbers;
    }
}

module.exports = {
    BingoGame,
    GameManager
};