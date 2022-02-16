'use strict';

const settings = {
    AutoStartNewGame: false,
    AIPlayerTurnLengthMS: 800,
    DefaultGameBoardSize: 3,
}

const game = (function(gameBoardSize) {
    'use strict';

    let timeStart;
    let timeEnd;

    let _gamesPlayed = 0;
    let _gameLoopTimeStamp = 0;
    let _playerTimeElapsed = 0;
    const numSquaresInARowToWin = () => (gameBoard.size === 3) ? 3 : 4;

    let _firstPlayerID = 1;
    let _currentPlayerID;
    let _aiPlayerIsThinking = false;
    const _player1 = Player(1, 'Player 1', markType.x);
    const _player2 = Player(2, 'Player 2', markType.o);
    const getPlayerById = (id) => (id === 1 ? _player1 : _player2);
    const getCurrentPlayer = () => getPlayerById(_currentPlayerID);
    const getOpponentPlayerID = (id) => (id === 1 ? 2 : 1);
    const getOpponentPlayer = () => getPlayerById(getOpponentPlayerID(_currentPlayerID));
    let _winnerInfo = null;

    const soundEffect = {
        player1go: document.querySelector('.player1-go'),
        player2go: document.querySelector('.player2-go'),
        win: document.querySelector('.win'), // human wins
        lose: document.querySelector('.lose'), // human loses to AI
        tie: document.querySelector('.tie'), // tie game, or AI vs AI game over
    }

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
        
        function getEmptySquareCount() {
            return _squares.reduce((prev, cur) => prev + cur.filter(el => el === '').length, 0);
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
            getEmptySquareCount,
            getRandomEmptySquare,
            isFull,
            isEmpty,
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

            // debug info
            document.querySelector('#player1 .workers span').textContent = _player1.numWorkers;
            document.querySelector('#player2 .workers span').textContent = _player2.numWorkers;

            document.querySelector('.message h2').textContent = _getGameStateMessage();
            
            document.querySelector('.games-played span').textContent = _gamesPlayed.toString();

            // current player animation
            document.querySelector('#player1.player').classList.remove('player--current');
            document.querySelector('#player1.player').classList.remove('pulse-color');
    
            document.querySelector('#player2.player').classList.remove('player--current');
            document.querySelector('#player2.player').classList.remove('pulse-color');
    
            // new game button animation
            document.querySelector('.game-controls__new-game').classList.remove('pulse-size');
    
            if (isGameOver()) {
                document.querySelector('.game-controls__new-game').classList.add('pulse-size');
            } else {
                _highlightCurrentPlayer();
            }
        }
    
        function _getGameStateMessage() {
            if (_winnerInfo) {
                return _winnerInfo.getPlayer().name + ' WINS!'
            }
            else if (isGameOver()) {
                return 'Tie Game!';
            } 
            else {
                return getCurrentPlayer().name + "'s Turn"
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
                        case markType.x:
                            div.classList.add('gameboard__square--x');
                            div.textContent = 'X';
                            break;
                        case markType.o:
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

            if (_winnerInfo) {
                const winningLocations = _winnerInfo.winningSquares;
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

    const isGameOver = () => !!_winnerInfo || gameBoard.isFull();

    function newGame() {
        gameBoard.reset();
        _winnerInfo = null;

        _currentPlayerID = _firstPlayerID;
       
        _playerTimeElapsed = 0;
        _gameLoopTimeStamp = 0;

        _aiPlayerIsThinking = false;
        _terminateAIWorkers();

        displayController.update();

        window.requestAnimationFrame(_gameLoop);        
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
            maxRecursionDepth = Math.min(6, emptySquares - 1);
        }
        else {
            if (emptySquares <= 13) {
                maxRecursionDepth = 13; //emptySquares;
            }
            else if (emptySquares <= 16) {
                maxRecursionDepth = 10;
            }
            else if (emptySquares <= 20) {
                maxRecursionDepth = 9;
            } 
            else {
                maxRecursionDepth = 9;
            }
        }
        
        return maxRecursionDepth;
    }

    function _terminateAIWorkers() {
        for (let i = 0; i < aiWorkers.length; i++) {
            aiWorkers[i].terminate();
            aiWorkers[i] = null;
        }

        aiWorkers.length = 0;
    }

    function _aiPlayerTakeTurn(aiLevel) {
        _aiPlayerIsThinking = true;
        const markType = getCurrentPlayer().markType;
        let bestMove = {};

        if (gameBoard.isEmpty()) {
            // first move by first player
            if (getCurrentPlayer().aiLevel > 1 && gameBoard.size === 3) {
                // speed up the very first move, just choose a random corner square:
                const i = Math.floor(Math.random() * 2) === 0 ? 0 : gameBoard.size - 1;
                const j = Math.floor(Math.random() * 2) === 0 ? 0 : gameBoard.size - 1;
                bestMove = { row: i, col: j };
            }
            else if (getCurrentPlayer().aiLevel === 3 && gameBoard.size === 5) {
                const i = Math.floor(Math.random() * 2) === 0 ? 1 : gameBoard.size - 2;
                const j = Math.floor(Math.random() * 2) === 0 ? 1 : gameBoard.size - 2;
                bestMove = { row: i, col: j };
            }
            else {
                // choose a random square
                bestMove = gameBoard.getRandomEmptySquare();
            }

            gameBoard.squareSetMark(bestMove.row, bestMove.col, markType);
            _turnFinished();
        }
        else {
            // use minimax to find best move

            let squares = gameBoard.squares;
            let locations = getPlayableLocations(squares);
            let maxRecursionDepth = _getMaxRecursionDepth(aiLevel, gameBoard.getEmptySquareCount());

            getCurrentPlayer().maxRecursionDepth = maxRecursionDepth;
            displayController.update();

            _terminateAIWorkers();

            let bestScore = -Infinity;
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
                        let timeEnd = performance.now();
                        console.log('Time elapsed: ' + Math.floor(timeEnd - timeStart).toString() + 'ms');
    
                        // All workers are finished, play the best move:
                        gameBoard.squareSetMark(bestMove.row, bestMove.col, markType);
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

        _winnerInfo = getWinnerN(gameBoard.squares, numSquaresInARowToWin());

        if (_winnerInfo) {
            const winner = _winnerInfo.getPlayer();
            const loser = getOpponentPlayer();

            winner.win();
        
            if (winner.aiLevel === 0) {
                _playSoundEffect(soundEffect.win);
            } 
            else if (loser.aiLevel === 0) {
                _playSoundEffect(soundEffect.lose);
            }
            else {
                _playSoundEffect(soundEffect.tie);
            }
        }
        else if (isGameOver()) {
            _playSoundEffect(soundEffect.tie);
        }
        else if (_currentPlayerID === 1) {
            _playSoundEffect(soundEffect.player1go);
        }
        else if (_currentPlayerID === 2) {
            _playSoundEffect(soundEffect.player2go);
        }

        _currentPlayerID = (_currentPlayerID % 2) + 1;
        _playerTimeElapsed = 0;

        if (_winnerInfo || isGameOver()) {
            _gamesPlayed += 1;
        }

        displayController.update();
    }

    function _playSoundEffect(sound) {
        if (!sound) return;

        sound.currentTime = 0;
        sound.play();
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
                    timeStart = performance.now();
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