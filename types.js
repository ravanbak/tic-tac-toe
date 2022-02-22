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

const Square = (row, col, mark, score, playOrder) => {
    return { 
        loc: { row, col},
        mark, 
        score, 
        playOrder, 
    };
}

const Player = (id, name, markType) => {
    let _score = 0;
    let _name = name;
    let _mark = markType;
    let _aiLevel = 0; // 0 = human, > 0 = level of difficulty
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
        /**
         * @param {markType} value
         */
        set mark(value) {
            _mark = value;
        },
        get mark() {
            return _mark;
        },
        set aiLevel(value) {
            _aiLevel = value;
        },
        get aiLevel() {
            return _aiLevel;
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