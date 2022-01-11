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

    const _size = size;
    let _squares = []; // size * size square grid
    
    const getSize = () => _size;

    function reset() {
        // reset all squares to blank
        _squares = [];
        for (let i = 0; i < _size; i++) {
            const row = [];
            _squares.push(row);
            for (let j = 0; j < _size; j++) {
                _squares[i].push(markTypes.blank);
            }
        }
    }

    return {
        getSize,
        reset,
    }
})(GAME_BOARD_SIZE);

gameBoard.reset();