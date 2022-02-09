'use strict';

const settings = {
    AutoStartNewGame: false,
    AIPlayerTurnLengthMS: 1200,
    DefaultGameBoardSize: 3,
}

const markTypes = {
    x: 'x',
    o: 'o',
}

const directionType = {
    row: Symbol('row'),
    col: Symbol('col'),
    diagUp: Symbol('diagUp'),
    diagDown: Symbol('diagDown'),
}

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

const game = (function(gameBoardSize) {
    'use strict';

    let _gamesPlayed = 0;
    let _gameLoopTimeStamp = 0;
    let _playerTimeElapsed = 0;
    const numSquaresInARowToWin = () => (gameBoard.size === 3) ? 3 : 4;

    let _firstPlayerID = 1;
    let _currentPlayerID;
    let _aiPlayerIsThinking = false;
    const _player1 = Player(1, 'Player 1', markTypes.x);
    const _player2 = Player(2, 'Player 2', markTypes.o);
    const getPlayerById = (id) => (id === 1 ? _player1 : _player2);
    const getCurrentPlayer = () => getPlayerById(_currentPlayerID);
    const getOpponentPlayerID = (id) => (id === 1 ? 2 : 1);
    let _winner = null;

    let aiWorkers = [];

    const WinnerInfo = (markType, winningSquares) => {
        const getPlayer = () => {
            switch (markType) {
                case _player1.markType:
                    return _player1;
                case _player2.markType:
                    return _player2;
            } 
        }

        return {
            getPlayer,
            winningSquares, 
        };
    }

    const gameBoard = (function(size) {
        'use strict';
    
        let _squares = []; // size * size square grid

        const squareIsBlank = (row, col) => _squares[row][col] === '';
        const squareSetMark = (row, col, markType) => _squares[row][col] = markType;
        const squareGetMark = (row, col) => _squares[row][col];
        const isFull = () => _squares.filter(row => row.filter(square => square == '').length === 0).length == size;
        const isEmpty = () => _squares.filter(row => row.filter(square => square == '').length === size).length == size;
        
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
        
        function isSymmetric() {
            // If marks on the gameboard are symmetric about an axis,
            // return the axis (directionType), otherwise return null.

            let symmetricDiagUp = true;
            let symmetricDiagDown = true;

            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    if (i !== j) {
                        if (_squares[i][j] !== _squares[j][i]) {
                            symmetricDiagDown = false;
                        }
                    }
                    if (i !== size - 1 - j) {
                        if (_squares[i][j] !== _squares[size - 1 - j][size - 1 - i]) {
                            symmetricDiagUp = false;
                        }
                    }
                }
            }

            if (symmetricDiagDown) {
                return directionType.diagDown;
            }
            else if (symmetricDiagUp) {
                return directionType.diagUp;
            }

            let symmetricRow = true;
            let symmetricCol = true;
            const halfSize = Math.floor(size / 2);
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < halfSize; j++) {
                    if (_squares[i][j] !== _squares[i][size - 1 - j]) {
                        symmetricCol = false;
                    }
                    else if (_squares[j][i] !== _squares[size - 1 - j][i]) {
                        symmetricRow = false;
                    }
                }
            }

            if (symmetricRow) {
                return directionType.row;
            }
            else if (symmetricCol) {
                return directionType.col;
            }

            return null;
        }

        function getRandomEmptySquare() {
            if (isFull()) {
                return null;
            }

            let row = Math.floor(Math.random() * size);
            let col = Math.floor(Math.random() * size);
            while (!squareIsBlank(row, col)) {
                row = Math.floor(Math.random() * size);
                col = Math.floor(Math.random() * size);
            }

            return {row, col};
        }

        function _getAdjacentSquare(loc, direction, factor) {
            const offset = 1 * factor; // offset 1 = next, -1 = previous

            switch (direction) {
                case directionType.row:
                    loc.col += offset;
                    break;
                
                case directionType.col:
                    loc.row += offset;
                    break;

                case directionType.diagUp:
                    loc.row -= offset;
                    loc.col += offset;
                    break;

                case directionType.diagDown:
                    loc.row += offset;
                    loc.col += offset;
                    break;    
            }

            return loc;
        }

        function getPlayableLocations() {
            // Return an array of available locations, prioritizing
            // locations that are adjacent to non-empty squares.
            let squaresPriority1 = [];
            let squaresPriority2 = [];

            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    if (_squares[i][j] !== '') {
                        continue;
                    }
                    let loc = { row: i, col: j };
                    if (adjacentSquareHasMark(loc)) {
                        squaresPriority1.push(loc);
                    }
                    else {
                        squaresPriority2.push(loc);
                    }
                }
            }

            return squaresPriority1.concat(squaresPriority2);
        }

        function adjacentSquareHasMark(loc) {
            const rowFirst = Math.max(0, loc.row - 1);
            const rowLast = Math.min(size - 1, loc.row + 1);

            const colFirst = Math.max(0, loc.col - 1);
            const colLast = Math.min(size - 1, loc.col + 1);

            for (let i = rowFirst; i <= rowLast; i++) {
                for (let j = colFirst; j <= colLast; j++) {
                    if (i !== loc.row || j !== loc.col) {
                        if (_squares[i][j] !== '') {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        function _matchNextNSquares(n, loc, direction) {
            // Starting at square 'loc', check the next 'n' adjacent 
            // squares and return all locations if they match.

            if (squareIsBlank(loc.row, loc.col)) {
                return null;
            }

            let winningLocations = [ { row:loc.row, col:loc.col } ]; // save a copy of 'loc'

            const markType = _squares[loc.row][loc.col];

            for (let i = 0; i < n; i++) {
                let nextSquare = _getAdjacentSquare(loc, direction, 1);
                if (_squares[nextSquare.row][nextSquare.col] === markType) {
                    loc = nextSquare;
                    winningLocations.push({ row:loc.row, col:loc.col } ); // save a copy of next 'loc'
                } 
                else {
                    return null;
                }
            }

            return winningLocations;
        }

        function getWinnerN(numSquaresToWin) {
            // Check for 'numSquaresToWin' matching marks in a row
            // in all directions (up, down, diagonal) starting from
            // the top rows and left columns of the gameboard.

            const n = numSquaresToWin - 1;

            // We only need to check squares where there are 'n' more
            // squares available on the board in the given direction.
            const lastIndex = size - numSquaresToWin + 1;

            let direction;
            let matchingSquares;

            // check for row or column winner
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < lastIndex; j++) {
                    direction = directionType.row;

                    matchingSquares = _matchNextNSquares(n, {row:i, col:j}, direction);
                    if (matchingSquares) {
                        return WinnerInfo(_squares[i][j], matchingSquares);
                    }
                    
                    direction = directionType.col;
                    matchingSquares = _matchNextNSquares(n, {row:j, col:i}, direction);
                    if (matchingSquares) {
                        return WinnerInfo(_squares[j][i], matchingSquares);
                    }

                    if (i < lastIndex && j < lastIndex) {
                        direction = directionType.diagDown;
                        matchingSquares = _matchNextNSquares(n, {row:i, col:j}, direction);
                        if (matchingSquares) {
                            return WinnerInfo(_squares[i][j], matchingSquares);
                        } 
                        
                        let row = size - 1 - i;
                        direction = directionType.diagUp;
                        matchingSquares = _matchNextNSquares(n, {row:row, col:j}, direction);
                        if (matchingSquares) {
                            return WinnerInfo(_squares[row][j], matchingSquares);
                        }   
                    }
                }
            }
        }

        return {
            reset,
            get size() {
                return size;
            },
            set size(value) {
                size = value;
                reset();
            },
            squareIsBlank,
            squareSetMark,
            squareGetMark,
            get squares() {
                return _squares;
            },
            getRandomEmptySquare,
            isFull,
            isEmpty,
            getPlayableLocations,
            getWinnerN,
            isSymmetric,
        }
    })(gameBoardSize);    

    const displayController = (function() {
        'use strict';
    
        const _divGameboard = document.querySelector('.gameboard');
    
        const _init = function() {
            _createGameBoard();
            _setupEventListeners();
        }();

        function _setupEventListeners() {
            document.querySelector('.game-controls__new-game').addEventListener('click', _newGame);
            document.querySelector('.game-controls__reset-scores').addEventListener('click', _resetScores);
            
            document.querySelector('#player1-name').addEventListener('click', () => _showPlayerNameForm(1));
            document.querySelector('#player2-name').addEventListener('click', () => _showPlayerNameForm(2));
            
            document.querySelector('#player1 .player__type select').addEventListener('change', function(e) { _setPlayerType(e, 1); });
            document.querySelector('#player2 .player__type select').addEventListener('change', function(e) { _setPlayerType(e, 2); });
    
            document.querySelector('.board-size select').addEventListener('change', _setGameboardSize);

            document.querySelector('.overlay .name-popup').addEventListener('submit', _submitPlayerName);
            document.querySelector('.overlay .name-popup .overlay__close').addEventListener('click', _hidePlayerNamePopup);
    
            document.querySelector('.overlay').addEventListener('transitionend', _setPlayerNamePopupVisibility);
        }
        
        function _showPlayerNameForm(playerID) {
            const overlay = document.querySelector('.overlay');
            overlay.style.visibility = 'visible';
            overlay.style.opacity = '1';
            overlay.dataset.visibility = 1;
    
            document.querySelector('.name-popup__input label').textContent = `Player ${playerID}'s name:`;
    
            const input = document.querySelector('.name-popup__input input');
            input.value = getPlayerById(playerID).name;
            input.focus();
            input.select();
    
            const popupForm = document.querySelector('.overlay .name-popup');
            popupForm.dataset.playerid = playerID;
        }
    
        function _submitPlayerName(e) {
            const playerID = parseInt(e.currentTarget.dataset.playerid);
    
            playerSetName(playerID, e.srcElement['player-name'].value);
            
            updateDashBoard();
    
            _hidePlayerNamePopup();
        }
    
        function _setGameboardSize(e) {
            _deleteGameBoard();

            const boardSize = parseInt(e.target.value);
            gameBoard.size = boardSize;

            _createGameBoard();            
            
            newGame();
        }

        function _setPlayerType(e, playerID) {
            const player = getPlayerById(playerID);

            if (player.aiLevel > 0) {
                // Terminate any existing workers since they were
                // working at a different AI level, and also, player 
                // type may be changing to human.
                _terminateAIWorkers();
                _aiPlayerIsThinking = false;
            }

            player.aiLevel = parseInt(e.target.value);
        }

        function _hidePlayerNamePopup() {
            const overlay = document.querySelector('.overlay');
            overlay.style.opacity = '0';
            overlay.dataset.visibility = 0;
        }
    
        function _setPlayerNamePopupVisibility() {
            const overlay = document.querySelector('.overlay');
            if (overlay.dataset.visibility == 1) {
                overlay.style.visibility = 'visible';
            } else {
                overlay.style.visibility = 'hidden';
            }
        }
    
        function _playerTakeTurn(e) {
            if (getCurrentPlayer().aiLevel) {
                return;
            }

            const row = e.target.dataset['row'];
            const col = e.target.dataset['col'];

            humanPlayerTakeTurn(row, col);
        }
    
        function _createGameBoard() {
            const size = gameBoard.size;
    
            const cssFontPercent = parseInt((90 / size).toString());
            const cssFontSize = `min(${cssFontPercent}vw, ${cssFontPercent * 0.66}vh)`;
            const cssSquareSizePercent = (100 / size).toString() + '%';

            for (let i = 0; i < size; i++) {
                let divRow = document.createElement('div');
                divRow.classList.add('gameboard__row');
                divRow.style.height = cssSquareSizePercent;

                for (let j = 0; j < size; j++) {
                    let divSquare = document.createElement('div');
                    divSquare.classList.add('gameboard__square');
                    divSquare.setAttribute('data-row', i);
                    divSquare.setAttribute('data-col', j);
                    divSquare.addEventListener('click', _playerTakeTurn);
                    divSquare.style.width = cssSquareSizePercent;
                    divSquare.style.fontSize = cssFontSize;
                    //divSquare.style.border = '3px solid #335577';
    
                    // hide outer edge borders
                    if (i === 0) {
                        divSquare.style.borderTop = 'none';
                        if (j ===0) divSquare.style.borderTopLeftRadius = '10px';
                        else if (j === size - 1) divSquare.style.borderTopRightRadius = '10px';
                    } else if (i === size - 1) {
                        divSquare.style.borderBottom = 'none';
                        if (j ===0) divSquare.style.borderBottomLeftRadius = '10px';
                        else if (j === size - 1) divSquare.style.borderBottomRightRadius = '10px';                    
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
    
            _divGameboard.addEventListener('click', update);
    
            // prevent highlighting 'x' or 'o' text on gameboard:
            _divGameboard.addEventListener('mousedown', (e) => { e.preventDefault() });
        }
   
        function _deleteGameBoard() {
            while (_divGameboard.firstChild) {
                _divGameboard.removeChild(_divGameboard.firstChild);
            }
        }

        function _newGame() {
            newGame();
            update();
        }
    
        function _resetScores() {
            resetScores();
            update();
        }
    
        function updateDashBoard() {
            document.querySelector('.board-size select').value = gameBoard.size;

            // names:
            document.querySelector('#player1-name').value = getPlayerById(1).name;
            document.querySelector('#player2-name').value = getPlayerById(2).name;
    
            // scores:
            document.querySelector('#player1 .player__score span').textContent = getPlayerById(1).getScore();
            document.querySelector('#player2 .player__score span').textContent = getPlayerById(2).getScore();
            
            document.querySelector('#player1 .depth span').textContent = getPlayerById(1).maxRecursionDepth;
            document.querySelector('#player2 .depth span').textContent = getPlayerById(2).maxRecursionDepth;

            const empty = gameBoard.getPlayableLocations().length;
            document.querySelector('#player1 .empty span').textContent = empty;
            document.querySelector('#player2 .empty span').textContent = empty;

            document.querySelector('#player1 .workers span').textContent = _player1.numWorkers;
            document.querySelector('#player2 .workers span').textContent = _player2.numWorkers;

            document.querySelector('.games-played span').textContent = _gamesPlayed.toString();

            document.querySelector('#player1.player').classList.remove('player--current');
            document.querySelector('#player1.player').classList.remove('pulse-color');
    
            document.querySelector('#player2.player').classList.remove('player--current');
            document.querySelector('#player2.player').classList.remove('pulse-color');
    
            document.querySelector('.game-controls__new-game').classList.remove('pulse-size');
    
            if (isGameOver()) {
                document.querySelector('.game-controls__new-game').classList.add('pulse-size');
            } else {
                _highlightCurrentPlayer();
            }
        }
    
        function _highlightCurrentPlayer() {
            const player = document.querySelector('#player' + getCurrentPlayer().id + '.player');
            player.classList.add('player--current');
            player.classList.add('pulse-color');
        }
    
        function _updateGameBoard() {
            const squareDivs = document.querySelectorAll('.gameboard__square');
            squareDivs.forEach(
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
                    
                    div.classList.remove('gameboard__square--winner');
                }
            );

            if (_winner) {
                const winningLocations = _winner.winningSquares;
                for (let i = 0; i < winningLocations.length; i++) {
                    let row = winningLocations[i].row;
                    let col = winningLocations[i].col;
                    let s = '.gameboard__square[data-row=' + "'" + row.toString() + "'" + ']';
                    s += '[data-col=' + "'" + col.toString() + "'" + ']';
                    let div = document.querySelector(s);
                    div.classList.add('gameboard__square--winner');
                }
            }
        }
    
        function update() {
            _updateGameBoard();
            updateDashBoard();
        }
    
        return {
            update,
            updateDashBoard,
        }
    
    })();

    const isGameOver = () => !!_winner || gameBoard.isFull();

    function newGame() {
        gameBoard.reset();
        _winner = null;

        _currentPlayerID = _firstPlayerID;
       
        _playerTimeElapsed = 0;
        _gameLoopTimeStamp = 0;

        _aiPlayerIsThinking = false;

        window.requestAnimationFrame(_gameLoop);

        displayController.update();
    }

    function resetScores() {
        _player1.reset();
        _player2.reset();
        _gamesPlayed = 0;
        _firstPlayerID = 1;
    }

    function playerSetName(id, name) {
        switch (id) {
            case 1:
                _player1.name = name;
                break;
            case 2:
                _player2.name = name;
                break;
        }
    }

    function _getMaxRecursionDepth(aiLevel, emptySquares) {
        let maxRecursionDepth;

        if (aiLevel === 1) {
            maxRecursionDepth = 1;
        }
        else if (aiLevel === 2) {
            maxRecursionDepth = Math.min(4, emptySquares - 1);
        }
        else {
            if (emptySquares <= 13) {
                maxRecursionDepth = 13; //emptySquares;
            }
            else if (emptySquares <= 19) {
                maxRecursionDepth = 20 - emptySquares + 6;
            }
            else {
                maxRecursionDepth = 6;
            } 
        }
        
        return 16; // maxRecursionDepth;
    }

    function _terminateAIWorkers() {
        for (let i = 0; i < aiWorkers.length; i++) {
            aiWorkers[i].terminate();
        }

        aiWorkers = [];
    }

    function _aiPlayerTakeTurn(aiLevel) {
        _aiPlayerIsThinking = true;
        
        let bestMove = {};

        if (gameBoard.isEmpty()) {
            // first move by first player
            if (getCurrentPlayer().aiLevel > 1 && gameBoard.size === 3) {
                // speed up the very first move, just choose a random corner square:
                const i = Math.floor(Math.random() * 2) === 0 ? 0 : gameBoard.size - 1;
                const j = Math.floor(Math.random() * 2) === 0 ? 0 : gameBoard.size - 1;
                bestMove = { row: i, col: j };
            }
            else {
                // choose a random square
                bestMove = gameBoard.getRandomEmptySquare();
            }
            gameBoard.squareSetMark(bestMove.row, bestMove.col, getCurrentPlayer().markType);
            _turnFinished();
        }
        else {
            // use minimax to find best move

            let squares = gameBoard.squares;
            let locations = gameBoard.getPlayableLocations();
            let maxRecursionDepth = _getMaxRecursionDepth(aiLevel, locations.length);

            getCurrentPlayer().maxRecursionDepth = maxRecursionDepth;
            displayController.update();

            _terminateAIWorkers();

            let bestScore = -Infinity;

            const markType = getCurrentPlayer().markType;
            
            let numWorkersResponded = 0;

            for (let i = 0; i < locations.length; i++) {
                let loc = locations[i];
                squares[loc.row][loc.col] = markType;

                // Deploy a worker to evaluate the current move:
                let worker = new Worker('worker.js');
                getCurrentPlayer().numWorkers = aiWorkers.push(worker);
                displayController.updateDashBoard(); // for debugging, show number of workers
    
                worker.postMessage({ maxDepth: maxRecursionDepth,
                                     minWinSquares: numSquaresInARowToWin(),
                                     currentPlayerID: getCurrentPlayer().id,
                                     currentPlayerMark: markType,
                                     squares: squares });
                
                squares[loc.row][loc.col] = '';

                worker.onmessage = function(e) {
                    worker.terminate(); // we're finished with this worker

                    getCurrentPlayer().numWorkers -= 1;
                    displayController.updateDashBoard();

                    let score = e.data.score;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = Object.assign({}, loc);
                    }
                    
                    numWorkersResponded += 1;
                    if (numWorkersResponded === aiWorkers.length) {
                        // All workers are finished, play the best move:
                        gameBoard.squareSetMark(bestMove.row, bestMove.col, getCurrentPlayer().markType);
                        _turnFinished();
                    }
                }
            }
        }
    }

    function humanPlayerTakeTurn(row, col) {
        if (isGameOver()) {
            return;
        }
                
        if (gameBoard.squareIsBlank(row, col)) {
            gameBoard.squareSetMark(row, col, getCurrentPlayer().markType);
            _turnFinished();
        }
    }

    function _turnFinished() {
        _aiPlayerIsThinking = false;

        _winner = gameBoard.getWinnerN(numSquaresInARowToWin());
        if (_winner) {
            _winner.getPlayer().win();
        }

        _currentPlayerID = (_currentPlayerID % 2) + 1;
        _playerTimeElapsed = 0;

        if (_winner || isGameOver()) {
            _gamesPlayed += 1;
        }

        //const sym = gameBoard.isSymmetric();
        //if (sym) console.log(sym);

        displayController.update();
    }

    function _gameLoop(timeStamp) {
        document.body.style.cursor = _aiPlayerIsThinking ? 'progress' : 'default';

        if (isGameOver()) {
            _firstPlayerID = getOpponentPlayerID(_firstPlayerID); // swap who gets to go first next game

            if (settings.AutoStartNewGame) {
                newGame();
            }

            return;
        }

        const elapsed = (_gameLoopTimeStamp === 0) ? 0 : (timeStamp - _gameLoopTimeStamp);
        _gameLoopTimeStamp = timeStamp;

        _playerTimeElapsed += elapsed;

        if (_playerTimeElapsed >= settings.AIPlayerTurnLengthMS) {
            _playerTimeElapsed = 0;

            if (!_aiPlayerIsThinking) {
                const ai = getCurrentPlayer().aiLevel;
                if (ai) {
                    _aiPlayerTakeTurn(ai);
                }
            }
        }

        window.requestAnimationFrame(_gameLoop);
    }

    return {
        newGame,
        gameBoard,
    }

})(settings.DefaultGameBoardSize);

game.newGame();