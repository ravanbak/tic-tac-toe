"use strict";

const GAME_BOARD_SIZE = 3;

const markTypes = {
    x: Symbol('x'),
    o: Symbol('o'),
}

const winnerType = {
    row: Symbol('row'),
    col: Symbol('col'),
    diag: Symbol('diag'),
}

const Player = (id, markType, gameBoard) => {
    let _score = 0;
    let _markType = markType;

    const reset = () => _score = 0;
    const win = () => _score++;
    const getScore = () => _score;

    return {
        id,
        reset,
        /**
         * @param {markTypes} value
         */
        set markType(value) {
            _markType = value;
        },
        get markType() {
            return _markType;
        },
        getScore,
        win,
    }
}

const game = (function(gameBoardSize) {
    'use strict';
    
    let _winner = null;

    const WinnerInfo = (markType, winType, winLocation) => {
        const getPlayer = () => {
            switch (markType) {
                case _player1.markType:
                    return _player1;
                case _player2.markType:
                    return _player2;
            } 
        }

        return { getPlayer,
                 winType, 
                 winLocation };
    }

    const gameBoard = (function(size) {
        'use strict';
    
        let _squares = []; // size * size square grid

        const getSize = () => size;
        const squareIsBlank = (row, col) => _squares[row][col] === '';
        const squareSetMark = (row, col, markType) => _squares[row][col] = markType;
        const squareGetMark = (row, col) => _squares[row][col];

        function reset() {
            // create gameboard array with all elements empty
            _squares = [];
            for (let i = 0; i < size; i++) {
                const row = [];
                _squares.push(row);
                for (let j = 0; j < size; j++) {
                    _squares[i].push('');
                }
            }
        }
        reset();

        function gameBoardIsFull() {
            return _squares.filter(row => row.filter(square => square == '').length === 0).length == size;
        }
        
        function getWinner() {
            // check for 'size' squares with the same mark 
            // in a line horizontally, vertically, or diagonally.
            //
            // return WinnerInfo object or null

            // check for diagonal winner
            let winnerDiag1 = true; // diagonal containing square (0, 0)
            let winnerDiag2 = true; // diagonal containing square (size - 1, 0)
            let markDiag1 = _squares[0][0];
            let markDiag2 = _squares[size - 1][0];
            for (let i = 1; i < size; i++) {
                if (!markDiag1 || _squares[i][i] !== markDiag1) {
                    winnerDiag1 = false;
                }
                if (!markDiag2 || _squares[size - 1 - i][i] !== markDiag2) {
                    winnerDiag2 = false;
                }
                if (!(winnerDiag1 || winnerDiag2)) {
                    break;
                }
            }

            if (winnerDiag1) {
                return WinnerInfo(markDiag1, winnerType.diag, 0);
            } else if (winnerDiag2) {
                return WinnerInfo(markDiag2, winnerType.diag, 1);
            }

            // check for vertical or horizontal line of the same mark
            for (let i = 0; i < size; i++) {
                let j = 0;
                let markRowHeader = _squares[i][j];
                let markColHeader = _squares[j][i];
                
                let winnerRow = true;
                let winnerCol = true;
                for (j = 1; j < size; j++) {
                    if (!markRowHeader || _squares[i][j] !== markRowHeader) {
                        winnerRow = false;
                    }
                    if (!markColHeader || _squares[j][i] !== markColHeader) {
                        winnerCol = false;
                    }
                    if (!(winnerRow || winnerCol)) {
                        break;
                    }
                }

                if (winnerRow) {
                    return WinnerInfo(markRowHeader, winnerType.row, i);
                } else if (winnerCol) {
                    return WinnerInfo(markColHeader, winnerType.col, i);
                }
            }
            
            return null;
        }

        return {
            reset,
            getSize,
            squareIsBlank,
            squareSetMark,
            squareGetMark,
            gameBoardIsFull,
            getWinner,
        }
    })(gameBoardSize);    

    const isGameOver = () => (!!_winner);
    const _player1 = Player(1, markTypes.x, gameBoard);
    const _player2 = Player(2, markTypes.o, gameBoard);
    let _currentPlayerID = 1;
    const getPlayerById = (id) => (id === 1 ? _player1 : _player2);
    const getCurrentPlayer = () => getPlayerById(_currentPlayerID);

    function newGame() {
        gameBoard.reset();
        _winner = null;
    }

    function playerTakeTurn(e) {
        if (isGameOver()) {
            return;
        }
        
        const row = e.target.dataset['row'];
        const col = e.target.dataset['col'];
        
        if (gameBoard.squareIsBlank(row, col)) {
            gameBoard.squareSetMark(row, col, getCurrentPlayer().markType);

            _currentPlayerID = (_currentPlayerID % 2) + 1;
        }

        _winner = gameBoard.getWinner();
        if (_winner) {
            console.log('Winner is player ' + _winner.getPlayer().id);
            console.log(_winner);
        }
    }

    return {
        newGame,
        get gameBoard() {
            return gameBoard;
        },
        getPlayerById,
        playerTakeTurn,
        get winner() {
            return _winner;
        },
        isGameOver,
    }

})(GAME_BOARD_SIZE);

const displayController = (function(gameBoard) {
    'use strict';

    const _divGameboard = document.querySelector('.gameboard');

    function _createGameBoard() {
        const size = gameBoard.getSize();

        for (let i = 0; i < size; i++) {
            let divRow = document.createElement('div');
            divRow.classList.add('gameboard__row');

            for (let j = 0; j < size; j++) {
                let divSquare = document.createElement('div');
                divSquare.classList.add('gameboard__square');
                divSquare.setAttribute('data-row', i);
                divSquare.setAttribute('data-col', j);
                divSquare.addEventListener('click', game.playerTakeTurn);
                divSquare.style.border = '3px solid #335577';

                // hide outer edge borders
                if (i === 0) {
                    divSquare.style.borderTop = 'none';
                } else if (i === size - 1) {
                    divSquare.style.borderBottom = 'none';
                }
                if (j === 0) {
                    divSquare.style.borderLeft = 'none';
                } else if (j === size - 1) {
                    divSquare.style.borderRight = 'none';
                }

                divRow.appendChild(divSquare);
            }

            _divGameboard.appendChild(divRow);
        }

        _divGameboard.addEventListener('click', updateGameBoard);

        // prevent highlighting 'x' or 'o' text on gameboard:
        _divGameboard.addEventListener('mousedown', (e) => { e.preventDefault() });
    }
    _createGameBoard();

    function _isWinningSquare(row, col) {
        if (!game.winner) {
            return false;
        }

        const w = game.winner;

        switch (w.winType) {
            case winnerType.row:
                return (parseInt(row) === parseInt(w.winLocation));
            case winnerType.col:
                return (parseInt(col) === parseInt(w.winLocation));
            case winnerType.diag:
                const size = game.gameBoard.getSize();
                if (parseInt(w.winLocation) === 0) {
                    return (row === col);
                } else {
                    return (parseInt(row) === (size - 1 - parseInt(col)));
                }
            default:
                return false;
        }
    }

    function updateGameBoard() {
        const squares = document.querySelectorAll('.gameboard__square');
        squares.forEach(
            function(div) {
                let i = div.dataset.row;
                let j = div.dataset.col;
                let mark = gameBoard.squareGetMark(i, j);

                switch(mark) {
                    case markTypes.x:
                        div.classList.add('gameboard__square--x');
                        div.textContent = 'X';
                        break;
                    case markTypes.o:
                        div.classList.add('gameboard__square--o');
                        div.textContent = 'O';
                        break;
                    default:
                        div.classList.remove('gameboard__square--x', 'gameboard__square--o');
                        div.textContent = '';
                }

                if (_isWinningSquare(i, j)) {
                    div.classList.add('gameboard__square--winner');
                }
            }
        );
    }

    return {
        updateGameBoard,
    }

})(game.gameBoard);

game.newGame();
displayController.updateGameBoard();