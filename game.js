'use strict';

const settings = {
    autoStartNewGame: false,
    aiPlayerTurnDelay: 800,
    defaultGameBoardSize: 5,
    showDebugInfo: false,
}

const game = (function(gameBoardSize) {
    let _gamesPlayed = 0;
    let _gameLoopTimeStamp = 0;
    
    const numSquaresInARowToWin = () => (gameBoard.size === 3) ? 3 : 4;

    let _firstPlayerID = 1;
    let _currentPlayerID;
    let _winnerInfo = null;
    
    const _player1 = Player(1, 'Player 1', MarkType.x, PlayerType.Human);
    const _player2 = Player(2, 'Player 2', MarkType.o, PlayerType.AIMedium);
    
    const getPlayerById = (id) => (id === 1 ? _player1 : _player2);
    const getPlayerByMark = (mark) => (mark === _player1.mark ? _player1 : _player2);
    const getCurrentPlayer = () => getPlayerById(_currentPlayerID);
    const getPlayerOpponentID = (playerID) => (playerID === 1 ? 2 : 1);
    
    let _aiTimerTimeStart;
    let _aiPlayerDelayTimeElapsed = 0;
    let _aiPlayerIsThinking = false;
    let _iddfsData = {
        // iterative deepening depth-first search data
        depth: 1, 
        bestScore: -Infinity,
        bestMove: {},
    }

    const soundEffects = {
        player1go: document.querySelector('.audio--player1-go'),
        player2go: document.querySelector('.audio--player2-go'),
        win: document.querySelector('.audio--win'), // human wins
        lose: document.querySelector('.audio--lose'), // human loses to AI
        tie: document.querySelector('.audio--tie'), // tie game, or AI vs AI game over
    }

    let aiWorkers = []; // array to keep track of workers and terminate them if necessary

    const gameBoard = (function(size) {
        let _squares = []; // size * size square grid

        const squareIsBlank = (row, col) => _squares[row][col].mark === '';
        const squareSetMark = (row, col, mark) => _squares[row][col].mark = mark;
        const squareGetMark = (row, col) => _squares[row][col].mark;
        const squareGetScore = (row, col) => _squares[row][col].score;
        const isFull = () => _squares.filter(row => row.filter(square => square.mark == '').length === 0).length == size;
        const isEmpty = () => _squares.filter(row => row.filter(square => square.mark == '').length === size).length == size;
        
        function reset() {
            // create gameboard array with all elements empty
            _squares = [];
            
            for (let i = 0; i < size; i++) {
                _squares.push([]);
                
                for (let j = 0; j < size; j++) {
                    _squares[i].push(Square(i, j, ''));
                }
            }
        }
        
        function getEmptySquareCount() {
            return _squares.reduce((prev, cur) => prev + cur.filter(el => el.mark === '').length, 0);
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
            squareGetScore,
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
        const _divGameboard = document.querySelector('.gameboard');
        
        const _init = function() {
            if (settings.showDebugInfo) {
                for (let i = 1; i <= 2; i++) {
                    const divPlayer = document.querySelector(`.dashboard .players #player${i}`);

                    let divDepth = document.createElement('div');
                    divDepth.classList.add('depth');
                    divDepth.textContent = 'Depth: ';
                    let spanDepth = document.createElement('span');
                    divDepth.appendChild(spanDepth);
                    divPlayer.appendChild(divDepth);

                    let divWorkers = document.createElement('div');
                    divWorkers.classList.add('workers');
                    divWorkers.textContent = 'Workers: ';
                    let spanWorkers = document.createElement('span');
                    divWorkers.appendChild(spanWorkers);
                    divPlayer.appendChild(divWorkers); 
                }               
            }

            _createGameBoard();
            _setupEventListeners();
        }();

        function _setupEventListeners() {
            document.querySelector('.game-controls__new-game').addEventListener('click', _newGame);
            document.querySelector('.game-controls__reset-scores').addEventListener('click', _resetScores);
            
            document.querySelector('#player1-name').addEventListener('click', () => _showPlayerNameForm(1));
            document.querySelector('#player2-name').addEventListener('click', () => _showPlayerNameForm(2));
            
            document.querySelector('#player1 .player__type select').value = _player1.playerType;
            document.querySelector('#player2 .player__type select').value = _player2.playerType;
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

            if (player.playerType !== PlayerType.Human) {
                // Terminate any existing workers since they were
                // working at a different AI level, and also, player 
                // type may be changing to human.
                _terminateAIWorkers();
                _aiPlayerIsThinking = false;
            }

            player.playerType = parseInt(e.target.value);
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
            if (getCurrentPlayer().playerType) {
                return;
            }

            // const row = e.currentTarget.dataset['row'];
            // const col = e.currentTarget.dataset['col'];
            const row = e.target.dataset['row'];
            const col = e.target.dataset['col'];

            humanPlayerTakeTurn(row, col);
        }
    
        function _createGameboardSquareDiv(i, j, width) {
            const size = gameBoard.size;
            const cssFontPercent = parseInt((80 / size).toString());
            const cssFontSize = `min(${cssFontPercent}vw, ${cssFontPercent * 0.66}vh)`;

            let divSquare = document.createElement('div');
            divSquare.classList.add('gameboard__square');
            divSquare.setAttribute('data-row', i);
            divSquare.setAttribute('data-col', j);
            divSquare.style.width = width;
            divSquare.style.fontSize = cssFontSize;

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

            return divSquare;
        }

        function _createGameBoard() {
            const size = gameBoard.size;
            const cssSquareSizeAsPercentage = (100 / size).toString() + '%';

            for (let i = 0; i < size; i++) {
                let divRow = document.createElement('div');
                divRow.classList.add('gameboard__row');
                divRow.style.height = cssSquareSizeAsPercentage;

                for (let j = 0; j < size; j++) {
                    let divSquare = _createGameboardSquareDiv(i, j, cssSquareSizeAsPercentage);
    
                    let divMark = document.createElement('div');
                    divMark.classList.add('mark');
                    divSquare.appendChild(divMark);

                    if (settings.showDebugInfo) {
                        let divScore = document.createElement('div');
                        divScore.classList.add('score');
                        divScore.style.fontSize = '10pt';
                        divSquare.appendChild(divScore);
                    }

                    divRow.appendChild(divSquare);
                }
    
                _divGameboard.appendChild(divRow);
            }
    
            _divGameboard.addEventListener('click', _playerTakeTurn);
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
            
            if (settings.showDebugInfo) {
                document.querySelector('#player1 .depth span').textContent = getPlayerById(1).maxRecursionDepth;
                document.querySelector('#player2 .depth span').textContent = getPlayerById(2).maxRecursionDepth;

                document.querySelector('#player1 .workers span').textContent = _player1.numWorkers;
                document.querySelector('#player2 .workers span').textContent = _player2.numWorkers;
            }

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
                _hilightCurrentPlayer();
            }
        }
    
        function _getGameStateMessage() {
            if (_winnerInfo) {
                return getPlayerByMark(_winnerInfo.markType).name + ' WINS!'
            }
            else if (isGameOver()) {
                return 'Tie Game!';
            } 
            else {
                return getCurrentPlayer().name + "'s Turn"
            }
        }

        function _hilightCurrentPlayer() {
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

                    if (settings.showDebugInfo) {
                        let score = gameBoard.squareGetScore(i, j);
                        div.querySelector('.score').textContent = score.max.toFixed(1);
                    }

                    switch(mark) {
                        case MarkType.x:
                            div.classList.add('gameboard__square--x');
                            div.querySelector('.mark').textContent = 'X';
                            break;
                        case MarkType.o:
                            div.classList.add('gameboard__square--o');
                            div.querySelector('.mark').textContent = 'O';
                            break;
                        default:
                            div.classList.remove('gameboard__square--x', 'gameboard__square--o');
                            div.querySelector('.mark').textContent = '';
                    }
                    
                    div.classList.remove('gameboard__square--winner');
                }
            );

            _hilightWinningSquares();
        }
    
        function _hilightWinningSquares() {
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
            else if (settings.showDebugInfo) {
                const locations = getPlayableLocations(gameBoard.squares, true);
                for (let i = 0; i < locations.length; i++) {
                    let row = locations[i].row;
                    let col = locations[i].col;
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
       
        _gameLoopTimeStamp = 0;
        _aiPlayerDelayTimeElapsed = 0;
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
        // Adjust the max recursion depth for the minimax algorithm
        // based on the number of empty squares on the gameboard.
        // The greater the number of empty squares, the longer minimax
        // will take to search the game tree to a given depth.

        let maxRecursionDepth;

        if (aiLevel === 1) {
            maxRecursionDepth = 2;
        }
        else if (aiLevel === 2) {
            maxRecursionDepth = Math.min(6, emptySquares - 1);
        }
        else {
            if (emptySquares <= 13) {
                maxRecursionDepth = 13;
            }
            else if (emptySquares <= 16) {
                maxRecursionDepth = 10;
            }
            else if (emptySquares <= 20) {
                maxRecursionDepth = 9;
            } 
            else {
                maxRecursionDepth = 8;
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

    function _aiPlayerGetFirstMove(aiLevel) {
        // first move by first player
        if (getCurrentPlayer().playerType > PlayerType.AIEasy && gameBoard.size === 3) {
            // speed up the very first move, just choose a random corner square:
            const i = Math.floor(Math.random() * 2) === 0 ? 0 : gameBoard.size - 1;
            const j = Math.floor(Math.random() * 2) === 0 ? 0 : gameBoard.size - 1;
            return { row: i, col: j };
        }
        else if (getCurrentPlayer().playerType === PlayerType.AIHard && gameBoard.size >= 5) {
            const mid = Math.floor(gameBoard.size / 2);
            return { row: mid, col: mid };
        }
        else {
            // choose a random square
            return gameBoard.getRandomEmptySquare();
        }
    }

    function _createWorker(squares, loc, mark, depth) {
        // Mark the specified square:
        squares[loc.row][loc.col].mark = mark;
        
        squares[loc.row][loc.col].score.min = 0;
        squares[loc.row][loc.col].score.max = 0;        

        let worker = new Worker('worker.js');
        const numWorkers = aiWorkers.push(worker);

        if (settings.showDebugInfo) {
            getCurrentPlayer().numWorkers = numWorkers;
            displayController.updateDashBoard();
        }

        worker.onerror = function(event) {
            console.log('Error in worker!');
            console.log(event);
        }

        // Start the worker:
        worker.postMessage({ 
            maxDepth: depth,
            minWinSquares: numSquaresInARowToWin(),
            currentPlayerID: getCurrentPlayer().id,
            currentPlayerMark: mark,
            squares: squares 
        });

        // Return the square to its original state:
        squares[loc.row][loc.col].mark = '';

        return worker;
    }

    function _aiPlayerMakeNextMove(aiLevel, mark, _iddfsData) {
        // Use minimax to choose the next move

        _aiPlayerIsThinking = true;
        
        let squares = gameBoard.squares;
        let locations = getPlayableLocations(squares, true);
        let maxRecursionDepth = _getMaxRecursionDepth(aiLevel, gameBoard.getEmptySquareCount());

        if (settings.showDebugInfo) {
            getCurrentPlayer().maxRecursionDepth = _iddfsData.depth;
            displayController.update();
        }

        _terminateAIWorkers();

        _iddfsData.bestScore = -Infinity;
        _iddfsData.bestMove = {};
        let numWorkersResponded = 0;

        for (let i = 0; i < locations.length; i++) {
            let loc = locations[i];

            // Deploy a worker to evaluate the current move:
            let worker = _createWorker(squares, loc, mark, _iddfsData.depth);

            worker.onmessage = function(e) {
                worker.terminate(); // we're finished with this worker

                getCurrentPlayer().numWorkers -= 1;
                displayController.updateDashBoard();

                let score = e.data.score;
                if (score > _iddfsData.bestScore) {
                    _iddfsData.bestScore = score;
                    _iddfsData.bestMove = Object.assign({}, locations[i]);
                }
                
                squares[loc.row][loc.col].score.max = score;

                numWorkersResponded += 1;
                if (numWorkersResponded === aiWorkers.length) {
                    // All workers are finished, increase depth or play the best move if arrived at max depth:
                    _aiPlayerNextDepth(aiLevel, mark, _iddfsData, maxRecursionDepth);
                }
            }
        }
    }

    function _aiPlayerTakeTurn(aiLevel) {       
        const mark = getCurrentPlayer().mark;

        if (gameBoard.isEmpty()) {
            _playerMakeMove(_aiPlayerGetFirstMove(aiLevel), mark);
        }
        else {
            if (settings.showDebugInfo) {
                _aiTimerTimeStart = performance.now();
            }
            
            _iddfsData.depth = 1;
            _aiPlayerMakeNextMove(aiLevel, mark, _iddfsData);
        }
    }

    function _aiPlayerNextDepth(aiLevel, mark, _iddfsData, maxRecursionDepth) {
        if (_iddfsData.depth < maxRecursionDepth) {
            _iddfsData.depth++;
            _aiPlayerMakeNextMove(aiLevel, mark, _iddfsData);
        } 
        else {
            _playerMakeMove(_iddfsData.bestMove, mark);
        }
    }

    function humanPlayerTakeTurn(row, col) {
        if (isGameOver()) {
            return;
        }               
        else if (!gameBoard.squareIsBlank(row, col)) {
            return;
        }
        
        _playerMakeMove({ row, col }, getCurrentPlayer().mark);
    }

    function _playerMakeMove(move, mark) {
        gameBoard.squareSetMark(move.row, move.col, mark);

        _turnFinished();
    }

    function _turnFinished() {
        if (settings.showDebugInfo && _aiPlayerIsThinking) {
            let timeEnd = performance.now();
            console.log('Time elapsed: ' + Math.floor(timeEnd - _aiTimerTimeStart).toString() + 'ms');
        }
        _aiPlayerIsThinking = false;

        _winnerInfo = getWinnerN(gameBoard.squares, numSquaresInARowToWin());
        
        _playTurnSoundEffect(_winnerInfo);

        if (_winnerInfo) {
            getPlayerByMark(_winnerInfo.mark).win();
        }

        _currentPlayerID = (_currentPlayerID % 2) + 1;
        _aiPlayerDelayTimeElapsed = 0;

        if (_winnerInfo || isGameOver()) {
            _gamesPlayed += 1;
        }

        displayController.update();
    }

    function _playTurnSoundEffect(_winnerInfo) {
        if (_winnerInfo) {
            const winner = getPlayerByMark(_winnerInfo.mark);
            const loser = getPlayerById(getPlayerOpponentID(winner.id));
        
            if (winner.playerType === PlayerType.Human) {
                _playSoundEffect(soundEffects.win);
            } 
            else if (loser.playerType === PlayerType.Human) {
                _playSoundEffect(soundEffects.lose);
            }
            else {
                _playSoundEffect(soundEffects.tie);
            }
        }
        else if (isGameOver()) {
            _playSoundEffect(soundEffects.tie);
        }
        else if (_currentPlayerID === 1) {
            _playSoundEffect(soundEffects.player1go);
        }
        else if (_currentPlayerID === 2) {
            _playSoundEffect(soundEffects.player2go);
        }
    }

    function _playSoundEffect(sound) {
        if (!sound) return;

        sound.currentTime = 0;
        sound.play();
    }

    function _gameLoop(timeStamp) {
        document.body.style.cursor = _aiPlayerIsThinking ? 'progress' : 'default';

        if (isGameOver()) {
            _firstPlayerID = getPlayerOpponentID(_firstPlayerID); // swap who gets to go first next game

            if (settings.autoStartNewGame) {
                newGame();
            }

            return;
        }

        const elapsed = (_gameLoopTimeStamp === 0) ? 0 : (timeStamp - _gameLoopTimeStamp);
        _gameLoopTimeStamp = timeStamp;

        _aiPlayerDelayTimeElapsed += elapsed;

        if (_aiPlayerDelayTimeElapsed >= settings.aiPlayerTurnDelay) {
            _aiPlayerDelayTimeElapsed = 0;

            if (!_aiPlayerIsThinking) {
                const aiLevel = getCurrentPlayer().playerType;
                if (aiLevel !== PlayerType.Human) {
                    _aiPlayerTakeTurn(aiLevel);
                }
            }
        }

        window.requestAnimationFrame(_gameLoop);
    }

    return {
        newGame,
        gameBoard,
    }

})(settings.defaultGameBoardSize);

game.newGame();