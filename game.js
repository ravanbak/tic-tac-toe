"use strict";

const GAME_BOARD_SIZE = 3;

const markTypes = {
    // each gameboard square must contain one of the following:
    x: Symbol('x'),
    o: Symbol('o'),
    blank: null,
}

const Player = (id, markType, gameBoard) => {
    let _score = 0;
    let _markType = markType;

    const reset = () => _score = 0;
    const win = () => _score++;
    const getScore = () => _score;

    return {
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
    
    const gameBoard = (function(size) {
        'use strict';
    
        let _squares = []; // size * size square grid
        
        function reset() {
            // reset all squares to blank
            _squares = [];
            for (let i = 0; i < size; i++) {
                const row = [];
                _squares.push(row);
                for (let j = 0; j < size; j++) {
                    _squares[i].push(markTypes.blank);
                }
            }
        }
        reset();
    
        const getSize = () => size;

        function squareIsBlank(row, col) {
            return _squares[row][col] === markTypes.blank;
        }
    
        function markSquare(row, col, markType) {
            _squares[row][col] = markType;
        }
    
        const getSquareMark = (row, col) => _squares[row][col];

        const showSquares = () => console.table(_squares);
    
        return {
            getSize,
            reset,
            squareIsBlank,
            markSquare,
            getSquareMark,
            showSquares,
        }
    })(gameBoardSize);    

    const _player1 = Player(1, markTypes.x, gameBoard);
    const _player2 = Player(2, markTypes.o, gameBoard);
    let _currentPlayerID = 1;
    const getPlayer = (id) => (id === 1 ? _player1 : _player2);
    const getCurrentPlayer = () => getPlayer(_currentPlayerID);

    function playerTakeTurn(e) {
        const row = e.target.dataset['row'];
        const col = e.target.dataset['col'];
        
        if (gameBoard.squareIsBlank(row, col)) {
            gameBoard.markSquare(row, col, getCurrentPlayer().markType);

            _currentPlayerID = (_currentPlayerID % 2) + 1;
        }
    }

    return {
        get gameBoard() {
            return gameBoard;
        },
        getPlayer,
        playerTakeTurn,
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
                //divSquare.textContent = `${i}, ${j}`;
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

        // prevent highlighting 'x' or 'o' text:
        _divGameboard.addEventListener('mousedown', (e) => { e.preventDefault() });
    }
    _createGameBoard();

    function updateGameBoard() {
        const squares = document.querySelectorAll('.gameboard__square');
        squares.forEach(
            function(div) {
                let i = div.dataset.row;
                let j = div.dataset.col;
                let mark = gameBoard.getSquareMark(i, j);

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
            }
        );
    }

    return {
        updateGameBoard,
    }

})(game.gameBoard);

displayController.updateGameBoard();