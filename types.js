'use strict';

const MarkType = Object.freeze({
    x: 'x',
    o: 'o',
});

const DirectionType = Object.freeze({
    row: 'row',
    col: 'col',
    diagUp: 'diagUp',
    diagDown: 'diagDown',
});

const PlayerType = Object.freeze({
    Human: 0,
    AIEasy: 1,
    AIMedium: 2,
    AIHard: 3,
})

const Square = (row, col, mark) => {
    return { 
        loc: { row, col},
        mark, 
        score: { min: 0, max: 0 }, 
    };
}

const Player = (id, name, markType, playerType) => {
    let _score = 0;
    let _name = name;
    let _mark = markType;
    let _playerType = playerType; // 0 = human, > 0 = level of difficulty
    let _maxRecursionDepth; // current recursion depth, for debug output
    let _numWorkers = 0; // current number of workers running, for debug output

    const reset = () => _score = 0;
    const win = () => _score++;
    const getScore = () => _score;

    return {
        id,
        reset,
        set name(value) {
            _name = value;
        },
        get name() {
            return _name;
        },
        set mark(value) {
            _mark = value;
        },
        get mark() {
            return _mark;
        },
        set playerType(value) {
            _playerType = value;
        },
        get playerType() {
            return _playerType;
        },
        set maxRecursionDepth(value) {
            _maxRecursionDepth = value;
        },
        get maxRecursionDepth() {
            return _maxRecursionDepth;
        },
        set numWorkers(value) {
            _numWorkers = value;
        },
        get numWorkers() {
            return _numWorkers;
        },        
        getScore,
        win,
    }
}

const WinnerInfo = (mark, winningSquares) => {
    return {
        mark,
        winningSquares, 
    };
}