const markType = Object.freeze({
    x: 'x',
    o:  'o',
});

const directionType = Object.freeze({
    row: 'row',
    col: 'col',
    diagUp: 'diagUp',
    diagDown: 'diagDown',
});

const Player = (id, name, markType) => {
    let _score = 0;
    let _name = name;
    let _markType = markType;
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
         * @param {markTypes} value
         */
        set markType(value) {
            _markType = value;
        },
        get markType() {
            return _markType;
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

const WinnerInfo = (markType, winningSquares) => {
    return {
        markType,
        winningSquares, 
    };
}