class BingoGame {
    constructor() {
        this.socket = io();
        this.gameState = {
            board: [],
            calledNumbers: [],
            currentCall: null,
            gameId: null,
            status: 'waiting'
        };
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        // Generate the bingo board
        this.generateBoard();
        // Set up WebSocket listeners
        this.setupSocketListeners();
        // Initialize UI elements
        this.updateGameInfo();
    }

    generateBoard() {
        const board = document.getElementById('bingo-board');
        board.innerHTML = '';
        
        // Generate 5x5 grid with random numbers for each column
        const columns = {
            B: this.generateRandomNumbers(1, 15, 5),
            I: this.generateRandomNumbers(16, 30, 5),
            N: this.generateRandomNumbers(31, 45, 5),
            G: this.generateRandomNumbers(46, 60, 5),
            O: this.generateRandomNumbers(61, 75, 5)
        };

        // Create the board in the UI
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const number = columns[Object.keys(columns)[col]][row];
                const cell = document.createElement('div');
                cell.className = 'board-number';
                cell.textContent = number;
                cell.dataset.number = number;
                cell.addEventListener('click', () => this.toggleNumber(cell));
                board.appendChild(cell);
            }
        }
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

    toggleNumber(cell) {
        if (this.gameState.calledNumbers.includes(parseInt(cell.dataset.number))) {
            cell.classList.toggle('called');
        }
    }

    setupSocketListeners() {
        this.socket.on('numberCalled', (number) => {
            this.handleNumberCalled(number);
        });

        this.socket.on('gameStarted', (gameData) => {
            this.handleGameStart(gameData);
        });

        this.socket.on('gameWon', (winner) => {
            this.handleGameWon(winner);
        });

        this.socket.on('updateGameState', (state) => {
            this.updateGameState(state);
        });
    }

    setupEventListeners() {
        // Bingo button
        document.getElementById('bingo-button').addEventListener('click', () => {
            this.claimBingo();
        });

        // Refresh button
        document.getElementById('refresh-button').addEventListener('click', () => {
            this.refreshGame();
        });

        // Leave button
        document.getElementById('leave-button').addEventListener('click', () => {
            this.leaveGame();
        });
    }

    handleNumberCalled(number) {
        // Update current call display
        document.getElementById('current-number').textContent = number;

        // Add to called numbers
        this.gameState.calledNumbers.push(number);
        this.updateCalledNumbers();

        // Check if number is on player's board
        const numberCell = document.querySelector(`.board-number[data-number="${number}"]`);
        if (numberCell) {
            numberCell.classList.add('called');
        }
    }

    updateCalledNumbers() {
        const container = document.getElementById('called-numbers');
        container.innerHTML = '';
        
        this.gameState.calledNumbers.forEach(number => {
            const numberElement = document.createElement('div');
            numberElement.className = 'called-number';
            numberElement.textContent = number;
            container.appendChild(numberElement);
        });
    }

    handleGameStart(gameData) {
        this.gameState.gameId = gameData.gameId;
        this.gameState.status = 'started';
        document.getElementById('game-status').textContent = 'Started';
        this.updateGameInfo();
    }

    handleGameWon(winner) {
        if (winner.id === this.socket.id) {
            alert('Congratulations! You won!');
        } else {
            alert('Game Over! Another player has won.');
        }
        this.gameState.status = 'finished';
        this.updateGameInfo();
    }

    updateGameState(state) {
        Object.assign(this.gameState, state);
        this.updateGameInfo();
    }

    updateGameInfo() {
        // Update game ID
        document.getElementById('game-id').textContent = this.gameState.gameId || 'H19718';
        
        // Update player count
        document.getElementById('player-count').textContent = this.gameState.players || '2';
        
        // Update other game info
        document.getElementById('wallet-amount').textContent = this.gameState.wallet || '0.00';
        document.getElementById('game-number').textContent = this.gameState.activeGame || '15';
        document.getElementById('stake-amount').textContent = this.gameState.stake || '10';
    }

    claimBingo() {
        // Get all marked numbers
        const markedNumbers = Array.from(document.querySelectorAll('.board-number.called'))
            .map(cell => parseInt(cell.dataset.number));
        
        // Send bingo claim to server
        this.socket.emit('bingoClaim', {
            numbers: markedNumbers,
            gameId: this.gameState.gameId
        });
    }

    refreshGame() {
        window.location.reload();
    }

    leaveGame() {
        this.socket.emit('leaveGame', {
            gameId: this.gameState.gameId
        });
        window.close();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new BingoGame();
    
    // Initialize Telegram WebApp
    window.Telegram.WebApp.ready();
    
    // Set the header color
    window.Telegram.WebApp.setHeaderColor('#8B5CF6');
    
    // Expand the WebApp to full height
    window.Telegram.WebApp.expand();
});