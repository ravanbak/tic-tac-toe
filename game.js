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

const Player = (id, name, markType) => {
    let _score = 0;
    let _name = name;
    let _markType = markType;

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
        getScore,
        win,
    }
}

const game = (function(gameBoardSize) {
    'use strict';
    
    let _currentPlayerID;
    const _player1 = Player(1, 'Player 1', markTypes.x);
    const _player2 = Player(2, 'Player 2', markTypes.o);
    const getPlayerById = (id) => (id === 1 ? _player1 : _player2);
    const getCurrentPlayer = () => getPlayerById(_currentPlayerID);
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

    const isGameOver = () => !!_winner || gameBoard.gameBoardIsFull();

    function newGame() {
        gameBoard.reset();
        _winner = null;
        _currentPlayerID = 1;
    }

    function resetScores() {
        _player1.reset();
        _player2.reset();
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
            _winner.getPlayer().win();
        }
    }

    return {
        newGame,
        resetScores,
        get gameBoard() {
            return gameBoard;
        },
        getPlayerById,
        getCurrentPlayer,
        playerSetName,
        playerTakeTurn,
        get winner() {
            return _winner;
        },
        isGameOver,
    }

})(GAME_BOARD_SIZE);

const displayController = (function(game) {
    'use strict';

    const _divGameboard = document.querySelector('.gameboard');

    const _setupButtons = (function() {
        document.querySelector('.game-controls__new-game').addEventListener('click', _newGame);
        document.querySelector('.game-controls__reset-scores').addEventListener('click', _resetScores);
        document.querySelector('#player1-name').addEventListener('click', _showPlayerNameForm);
        document.querySelector('#player2-name').addEventListener('click', _showPlayerNameForm);

        document.querySelector('.overlay .name-popup').addEventListener('submit', _submitPlayerName);
        document.querySelector('.overlay .name-popup .overlay__close').addEventListener('click', _hidePlayerNamePopup);

        document.querySelector('.overlay').addEventListener('transitionend', _setPlayerNamePopupVisibility);
    })();
    
    function _showPlayerNameForm(e) {
        const overlay = document.querySelector('.overlay');
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        overlay.dataset.visibility = 1;
                
        const playerID = parseInt(e.currentTarget.dataset.playerid);

        document.querySelector('.name-popup__input label').textContent = `Player ${playerID}, what's your name?`;

        const input = document.querySelector('.name-popup__input input');
        input.value = game.getPlayerById(playerID).name;
        input.focus();
        input.select();

        const popupForm = document.querySelector('.overlay .name-popup');
        popupForm.dataset.playerid = playerID;
    }

    function _submitPlayerName(e) {
        const playerID = parseInt(e.currentTarget.dataset.playerid);

        game.playerSetName(playerID, e.srcElement['player-name'].value);
        
        _updateDashBoard();

        _hidePlayerNamePopup();
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

    const _createGameBoard = (function() {
        const size = game.gameBoard.getSize();

        for (let i = 0; i < size; i++) {
            let divRow = document.createElement('div');
            divRow.classList.add('gameboard__row');

            for (let j = 0; j < size; j++) {
                let divSquare = document.createElement('div');
                divSquare.classList.add('gameboard__square');
                divSquare.setAttribute('data-row', i);
                divSquare.setAttribute('data-col', j);
                divSquare.addEventListener('click', game.playerTakeTurn);
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
    })();

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

    function _newGame() {
        game.newGame();
        update();
    }

    function _resetScores() {
        game.resetScores();
        update();
    }

    function _updateDashBoard() {
        // names:
        document.querySelector('#player1-name').value = game.getPlayerById(1).name;
        document.querySelector('#player2-name').value = game.getPlayerById(2).name;

        // scores:
        document.querySelector('#player1 .player__score span').textContent = game.getPlayerById(1).getScore();
        document.querySelector('#player2 .player__score span').textContent = game.getPlayerById(2).getScore();

        document.querySelector('#player1.player').classList.remove('player--current');
        document.querySelector('#player1.player').classList.remove('pulse-color');

        document.querySelector('#player2.player').classList.remove('player--current');
        document.querySelector('#player2.player').classList.remove('pulse-color');

        document.querySelector('.game-controls__new-game').classList.remove('pulse-size');

        if (game.isGameOver()) {
            document.querySelector('.game-controls__new-game').classList.add('pulse-size');
        } else {
            _highlightCurrentPlayer();
        }
    }

    function _highlightCurrentPlayer() {
        const player = document.querySelector('#player' + game.getCurrentPlayer().id + '.player');
        player.classList.add('player--current');
        player.classList.add('pulse-color');
    }

    function _updateGameBoard() {
        const squares = document.querySelectorAll('.gameboard__square');
        squares.forEach(
            function(div) {
                let i = div.dataset.row;
                let j = div.dataset.col;
                let mark = game.gameBoard.squareGetMark(i, j);

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
                    if (game.winner.getPlayer().markType === markTypes.x) {
                        div.classList.add('gameboard__square--winner-x');
                    } else {
                        div.classList.add('gameboard__square--winner-o');
                    }
                    
                }
                else {
                    div.classList.remove('gameboard__square--winner-x');
                    div.classList.remove('gameboard__square--winner-o');
                }
            }
        );
    }

    function update() {
        _updateGameBoard();
        _updateDashBoard();
    }

    return {
        update,
    }

})(game);

game.newGame();
displayController.update();