"use strict";

const markTypes = {
    // each gameboard square must contain one of the following:
    x: Symbol('x'),
    o: Symbol('o'),
    blank: null,
}

const GAME_BOARD_SIZE = 3;

const gameBoard = (function(size) {
    'use strict';

    let _squares = []; // size * size square grid
    
    const getSize = () => size;

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

    const squareIsBlank = (i, j) => _squares[i][j] === markTypes.blank;

    function markSquare(i, j, markType) {
        _squares[i][j] = markType;
    }

    const showSquares = () => console.table(_squares);

    return {
        getSize,
        reset,
        squareIsBlank,
        markSquare,
        showSquares,
    }
})(GAME_BOARD_SIZE);

const Player = (id, markType, gameBoard) => {
    let _score = 0;
    let _markType = markType;

    const setMarkType = (markType) => _markType = markType;
    const reset = () => _score = 0;
    const win = () => _score++;

    function takeTurn(i, j) {
        if (gameBoard.squareIsBlank(i, j)) {
            gameBoard.markSquare(i, j, markType);
        }
    }
    return {
        reset,
        setMarkType,
        takeTurn,
        win,
    }
}

const player1 = Player(1, markTypes.x, gameBoard);
const player2 = Player(2, markTypes.o, gameBoard);

gameBoard.reset();