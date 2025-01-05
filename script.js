class ChessGame {
    constructor() {
        this.board = this.createBoard();
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.gameMode = 'pvp';
        this.gameActive = true;
        this.computerThinking = false;
        this.moveHistory = [];

        // Initialize event listeners
        document.getElementById('pvp-btn').addEventListener('click', () => {
            this.gameMode = 'pvp';
            this.startGame();
        });

        document.getElementById('pvc-btn').addEventListener('click', () => {
            this.gameMode = 'pvc';
            this.startGame();
        });

        document.getElementById('change-mode-btn').addEventListener('click', () => {
            this.changeMode();
        });

        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undoMove();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    startGame() {
        document.getElementById('mode-selection').style.display = 'none';
        document.getElementById('game-content').style.display = 'block';
        
        this.board = this.createBoard();
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.gameActive = true;
        this.computerThinking = false;
        this.moveHistory = [];

        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';
        
        chessboard.addEventListener('click', (event) => {
            if (this.computerThinking) return;
            
            const square = event.target.closest('.square');
            if (!square) return;

            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            this.handleSquareClick(row, col);
        });

        this.renderBoard();
        this.updateGameStatus();
    }

    resetGame() {
        this.board = this.createBoard();
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.gameActive = true;
        this.computerThinking = false;
        this.moveHistory = [];
        this.renderBoard();
        this.updateGameStatus();
        document.getElementById('white-captured').innerHTML = '';
        document.getElementById('black-captured').innerHTML = '';
    }

    undoMove() {
        if (!this.gameActive || this.computerThinking || this.moveHistory.length === 0) return;

        const lastMove = this.moveHistory.pop();
        if (!lastMove) return;

        // Restore the board state
        this.board = JSON.parse(JSON.stringify(lastMove.board));
        this.currentPlayer = lastMove.currentPlayer;
        this.gameActive = true;

        // Update captured pieces display
        this.updateCapturedPieces();
        
        // Render the updated board
        this.renderBoard();
        this.updateGameStatus();

        // If in PvC mode and it's computer's turn after undo, make computer move
        if (this.gameMode === 'pvc' && this.currentPlayer === 'black' && this.gameActive) {
            this.computerThinking = true;
            setTimeout(() => this.makeComputerMove(), 500);
        }
    }

    tryMove(toRow, toCol) {
        if (!this.selectedPiece) return;

        const fromRow = this.selectedPiece.row;
        const fromCol = this.selectedPiece.col;
        const validMoves = this.getValidMoves(fromRow, fromCol);

        if (validMoves.some(([r, c]) => r === toRow && c === toCol)) {
            // Save current state before making the move
            const previousState = {
                board: JSON.parse(JSON.stringify(this.board)),
                currentPlayer: this.currentPlayer,
                capturedPiece: this.board[toRow][toCol]
            };

            // Make the move
            this.board[toRow][toCol] = this.board[fromRow][fromCol];
            this.board[fromRow][fromCol] = null;

            // Check if the move puts/leaves own king in check
            if (this.isKingInCheck(this.currentPlayer)) {
                // Restore the board and don't allow the move
                this.board = previousState.board;
                this.clearHighlights();
                this.selectedPiece = null;
                return;
            }

            // Save the move to history
            this.moveHistory.push(previousState);

            // Check for pawn promotion
            if (this.board[toRow][toCol].type === 'pawn' && (toRow === 0 || toRow === 7)) {
                this.board[toRow][toCol].type = 'queen';
            }

            // Update captured pieces display
            this.updateCapturedPieces();

            // Switch turns
            this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
            
            // Update game status
            this.updateGameStatus();

            // Handle computer move if in PvC mode
            if (this.gameMode === 'pvc' && this.currentPlayer === 'black' && this.gameActive) {
                this.computerThinking = true;
                setTimeout(() => this.makeComputerMove(), 500);
            }

            this.renderBoard();
        }

        this.clearHighlights();
        this.selectedPiece = null;
    }

    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('white-captured');
        const blackCaptured = document.getElementById('black-captured');
        
        if (!whiteCaptured || !blackCaptured) return;

        // Clear current display
        whiteCaptured.innerHTML = '';
        blackCaptured.innerHTML = '';

        // Get all pieces on the board
        const piecesOnBoard = new Map();
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const key = `${piece.color}-${piece.type}`;
                    piecesOnBoard.set(key, (piecesOnBoard.get(key) || 0) + 1);
                }
            }
        }

        // Initial piece counts
        const initialPieces = {
            'white-pawn': 8, 'white-rook': 2, 'white-knight': 2, 'white-bishop': 2, 'white-queen': 1, 'white-king': 1,
            'black-pawn': 8, 'black-rook': 2, 'black-knight': 2, 'black-bishop': 2, 'black-queen': 1, 'black-king': 1
        };

        // Calculate captured pieces
        for (const [piece, count] of Object.entries(initialPieces)) {
            const remaining = piecesOnBoard.get(piece) || 0;
            const captured = count - remaining;
            if (captured > 0) {
                const [color, type] = piece.split('-');
                const container = color === 'white' ? blackCaptured : whiteCaptured;
                for (let i = 0; i < captured; i++) {
                    const pieceDiv = document.createElement('div');
                    pieceDiv.className = `piece ${color}`;
                    pieceDiv.innerHTML = this.getPieceSymbol({ type, color });
                    container.appendChild(pieceDiv);
                }
            }
        }
    }

    createBoard() {
        const board = new Array(8).fill(null).map(() => new Array(8).fill(null));
        
        // Set up pawns
        for (let i = 0; i < 8; i++) {
            board[1][i] = { type: 'pawn', color: 'black' };
            board[6][i] = { type: 'pawn', color: 'white' };
        }

        // Set up other pieces
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        backRow.forEach((piece, i) => {
            board[0][i] = { type: piece, color: 'black' };
            board[7][i] = { type: piece, color: 'white' };
        });

        return board;
    }

    setupEventListeners() {
        // Mode selection buttons
        document.getElementById('pvp-btn').addEventListener('click', () => this.startGame('pvp'));
        document.getElementById('pvc-btn').addEventListener('click', () => this.startGame('pvc'));
        document.getElementById('change-mode-btn').addEventListener('click', () => this.changeMode());

        // Chessboard click events will be set up when the game starts
    }

    changeMode() {
        this.gameActive = false;
        this.selectedPiece = null;
        this.currentPlayer = 'white';
        document.getElementById('game-content').style.display = 'none';
        document.getElementById('mode-selection').style.display = 'block';
    }

    renderBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = 'square';
                square.dataset.row = row;
                square.dataset.col = col;

                if ((row + col) % 2 === 0) {
                    square.style.backgroundColor = '#E8EDF9';
                } else {
                    square.style.backgroundColor = '#B7C0D8';
                }

                const piece = this.board[row][col];
                if (piece) {
                    const pieceDiv = document.createElement('div');
                    pieceDiv.className = `piece ${piece.color}`;
                    pieceDiv.innerHTML = this.getPieceSymbol(piece);
                    square.appendChild(pieceDiv);

                    // Highlight king if in check
                    if (piece.type === 'king' && piece.color === this.currentPlayer && this.isKingInCheck(this.currentPlayer)) {
                        square.classList.add('check');
                    }
                }

                chessboard.appendChild(square);
            }
        }
    }

    handleSquareClick(row, col) {
        if (!this.gameActive) return;
        if (this.gameMode === 'pvc' && this.currentPlayer === 'black') return;
        if (this.computerThinking) return;

        const piece = this.board[row][col];

        if (this.selectedPiece) {
            if (piece && piece.color === this.currentPlayer) {
                this.selectPiece(row, col);
            } else {
                this.tryMove(row, col);
            }
        } else if (piece && piece.color === this.currentPlayer) {
            this.selectPiece(row, col);
        }
    }

    selectPiece(row, col) {
        this.clearHighlights();
        this.selectedPiece = { row, col };
        
        // Highlight selected piece
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.add('selected');
        }

        // Highlight valid moves
        const validMoves = this.getValidMoves(row, col);
        validMoves.forEach(([r, c]) => {
            const moveSquare = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (moveSquare) {
                moveSquare.classList.add('valid-move');
            }
        });
    }

    clearHighlights() {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            square.classList.remove('selected', 'valid-move');
        });
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = this.getPieceMoves(row, col, this.board);
        
        // Filter out moves that would put or leave own king in check
        return moves.filter(([toRow, toCol]) => {
            const testBoard = JSON.parse(JSON.stringify(this.board));
            testBoard[toRow][toCol] = testBoard[row][col];
            testBoard[row][col] = null;
            return !this.isKingInCheck(piece.color, testBoard);
        });
    }

    isKingInCheck(color, testBoard = null) {
        const board = testBoard || this.board;
        
        // Find the king's position
        let kingPosition = null;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    kingPosition = { row, col };
                    break;
                }
            }
            if (kingPosition) break;
        }

        if (!kingPosition) return false; // Should never happen in a valid game

        // Check if any opponent's piece can capture the king
        const opponentColor = color === 'white' ? 'black' : 'white';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.color === opponentColor) {
                    const moves = this.getPieceMoves(row, col, board);
                    if (moves.some(([r, c]) => r === kingPosition.row && c === kingPosition.col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isCheckmate(color) {
        if (!this.isKingInCheck(color)) return false;

        // Try all possible moves for all pieces of the current color
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col);
                    for (const [toRow, toCol] of moves) {
                        // Try the move on a copy of the board
                        const testBoard = JSON.parse(JSON.stringify(this.board));
                        testBoard[toRow][toCol] = testBoard[row][col];
                        testBoard[row][col] = null;

                        // If this move gets us out of check, it's not checkmate
                        if (!this.isKingInCheck(color, testBoard)) {
                            return false;
                        }
                    }
                }
            }
        }
        // If we've tried all moves and none get us out of check, it's checkmate
        return true;
    }

    isStalemate(color) {
        if (this.isKingInCheck(color)) return false;

        // Check if the player has any legal moves
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) {
                        return false;
                    }
                }
            }
        }
        // If no legal moves are available and not in check, it's stalemate
        return true;
    }

    getPieceMoves(row, col, board) {
        const piece = board[row][col];
        if (!piece) return [];

        const moves = [];
        const color = piece.color;

        switch (piece.type) {
            case 'pawn':
                const direction = color === 'white' ? -1 : 1;
                const startRow = color === 'white' ? 6 : 1;

                // Forward move
                if (row + direction >= 0 && row + direction < 8) {
                    if (!board[row + direction][col]) {
                        moves.push([row + direction, col]);
                        // Double move from starting position
                        if (row === startRow && !board[row + 2 * direction][col]) {
                            moves.push([row + 2 * direction, col]);
                        }
                    }
                }

                // Captures
                for (const dcol of [-1, 1]) {
                    const newCol = col + dcol;
                    if (newCol >= 0 && newCol < 8 && row + direction >= 0 && row + direction < 8) {
                        const target = board[row + direction][newCol];
                        if (target && target.color !== color) {
                            moves.push([row + direction, newCol]);
                        }
                    }
                }
                break;

            case 'knight':
                const knightMoves = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                for (const [dr, dc] of knightMoves) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        const target = board[newRow][newCol];
                        if (!target || target.color !== color) {
                            moves.push([newRow, newCol]);
                        }
                    }
                }
                break;

            case 'bishop':
            case 'rook':
            case 'queen':
                const directions = piece.type === 'rook' 
                    ? [[0, 1], [0, -1], [1, 0], [-1, 0]]
                    : piece.type === 'bishop'
                        ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
                        : [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

                for (const [dr, dc] of directions) {
                    let newRow = row + dr;
                    let newCol = col + dc;
                    while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        const target = board[newRow][newCol];
                        if (!target) {
                            moves.push([newRow, newCol]);
                        } else {
                            if (target.color !== color) {
                                moves.push([newRow, newCol]);
                            }
                            break;
                        }
                        newRow += dr;
                        newCol += dc;
                    }
                }
                break;

            case 'king':
                const kingMoves = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1], [0, 1],
                    [1, -1], [1, 0], [1, 1]
                ];
                for (const [dr, dc] of kingMoves) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        const target = board[newRow][newCol];
                        if (!target || target.color !== color) {
                            moves.push([newRow, newCol]);
                        }
                    }
                }
                break;
        }

        return moves;
    }

    updateGameStatus() {
        const statusElement = document.getElementById('status-message');
        const checkStatusElement = document.getElementById('check-status');
        
        if (!statusElement || !checkStatusElement) return;

        // Clear previous check status
        checkStatusElement.textContent = '';
        
        if (this.gameActive) {
            if (this.isCheckmate(this.currentPlayer)) {
                const winner = this.currentPlayer === 'white' ? 'BLACK' : 'WHITE';
                statusElement.textContent = `Checkmate! ${winner} wins!`;
                checkStatusElement.textContent = 'Game Over';
                this.gameActive = false;
            } else if (this.isStalemate(this.currentPlayer)) {
                statusElement.textContent = 'Stalemate! Game is a draw.';
                checkStatusElement.textContent = 'Game Over';
                this.gameActive = false;
            } else if (this.isKingInCheck(this.currentPlayer)) {
                statusElement.textContent = `${this.currentPlayer.toUpperCase()}'s turn`;
                checkStatusElement.textContent = 'Check!';
            } else {
                statusElement.textContent = `${this.currentPlayer.toUpperCase()}'s turn`;
            }
        }
    }

    getPieceSymbol(piece) {
        const symbols = {
            white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
            black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
        };
        return symbols[piece.color][piece.type];
    }

    makeComputerMove() {
        if (!this.gameActive) return;

        // Get all possible moves for black pieces
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === 'black') {
                    const validMoves = this.getValidMoves(row, col);
                    validMoves.forEach(([toRow, toCol]) => {
                        moves.push({
                            from: { row, col },
                            to: { row: toRow, col: toCol },
                            piece: piece,
                            captured: this.board[toRow][toCol]
                        });
                    });
                }
            }
        }

        if (moves.length > 0) {
            // Add simple scoring for moves
            moves.forEach(move => {
                move.score = 0;
                if (move.captured) {
                    move.score += this.getPieceValue(move.captured.type);
                }
                // Prefer center control
                const centerDistance = Math.abs(3.5 - move.to.row) + Math.abs(3.5 - move.to.col);
                move.score += (7 - centerDistance) / 10;
            });

            // Sort moves by score and pick the best one
            moves.sort((a, b) => b.score - a.score);
            const bestMove = moves[0];

            // Make the move
            this.board[bestMove.to.row][bestMove.to.col] = this.board[bestMove.from.row][bestMove.from.col];
            this.board[bestMove.from.row][bestMove.from.col] = null;

            // Check for pawn promotion
            if (this.board[bestMove.to.row][bestMove.to.col].type === 'pawn' && bestMove.to.row === 7) {
                this.board[bestMove.to.row][bestMove.to.col].type = 'queen';
            }

            // Check for win condition
            if (this.checkWinCondition()) {
                this.gameActive = false;
                this.announceWinner();
            } else {
                this.currentPlayer = 'white';
                this.updateGameStatus();
            }

            this.renderBoard();
        }

        this.computerThinking = false;
    }

    getPieceValue(type) {
        const values = {
            pawn: 1,
            knight: 3,
            bishop: 3,
            rook: 5,
            queen: 9,
            king: 100
        };
        return values[type] || 0;
    }

    checkWinCondition() {
        // Check if opponent's king is still on the board
        const opponentColor = this.currentPlayer === 'white' ? 'black' : 'white';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === opponentColor) {
                    return false;
                }
            }
        }
        return true;
    }

    announceWinner() {
        const winner = this.currentPlayer.toUpperCase();
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = `Game Over! ${winner} wins!`;
            statusElement.style.color = '#e74c3c';
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});