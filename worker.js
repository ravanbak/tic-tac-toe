'use strict';

self.importScripts('types.js');

let squares = [];
let gameBoardSize;
let maxRecursionDepth;
let currentPlayerMark;
let opposingPlayerMark;
let minWinSquares;
let alpha;
let beta;

onmessage = function(e) {
    squares = e.data['squares'];
    gameBoardSize = squares.length;
    maxRecursionDepth = e.data['maxDepth'];
    minWinSquares = e.data['minWinSquares'];
    currentPlayerMark = e.data['currentPlayerMark'];
    opposingPlayerMark = (currentPlayerMark === 'x') ? 'o' : 'x';
    alpha = e.data.alpha;
    beta = e.data.beta;

    const score = minimax(squares, 1, alpha, beta, false);
    
    postMessage({ score, alpha, beta });
}

const gameboardIsFull = () => squares.filter(row => row.filter(square => square == '').length === 0).length == gameBoardSize;

function adjacentSquareHasMark(loc) {
    const rowFirst = Math.max(0, loc.row - 1);
    const rowLast = Math.min(gameBoardSize - 1, loc.row + 1);

    const colFirst = Math.max(0, loc.col - 1);
    const colLast = Math.min(gameBoardSize - 1, loc.col + 1);

    for (let i = rowFirst; i <= rowLast; i++) {
        for (let j = colFirst; j <= colLast; j++) {
            if (i !== loc.row || j !== loc.col) {
                if (squares[i][j] !== '') {
                    return true;
                }
            }
        }
    }

    return false;
}

function _getSymmetry() {
    // Returns flags for each axis (vertical, horizontal, diag up, diag down)
    // indicating if the marks on the gameboard are symmetric about the axis.

    let symmetricRow = true;
    let symmetricCol = true;

    const halfSize = Math.floor(gameBoardSize / 2);
    for (let i = 0; i < gameBoardSize; i++) {
        for (let j = 0; j < halfSize; j++) {
            if (squares[i][j] !== squares[i][gameBoardSize - 1 - j]) {
                symmetricRow = false;
            }
            if (squares[j][i] !== squares[gameBoardSize - 1 - j][i]) {
                symmetricCol = false;
            }
        }
    }

    let symmetricDiagUp = false;
    let symmetricDiagDown = false;

    if (!symmetricRow && !symmetricCol) {
        symmetricDiagUp = true;
        symmetricDiagDown = true;

        for (let i = 0; i < gameBoardSize; i++) {
            for (let j = 0; j < gameBoardSize; j++) {
                if (i !== j) {
                    if (squares[i][j] !== squares[j][i]) {
                        symmetricDiagDown = false;
                    }
                }
                if (i !== gameBoardSize - 1 - j) {
                    if (squares[i][j] !== squares[gameBoardSize - 1 - j][gameBoardSize - 1 - i]) {
                        symmetricDiagUp = false;
                    }
                }
            }
        }
    }

    return {
        row: symmetricRow,
        col: symmetricCol,
        diagUp: symmetricDiagUp,
        diagDown: symmetricDiagDown
    }
}

function getPlayableLocations() {
    // Return an array of available locations, prioritizing
    // locations that are adjacent to non-empty squares.
    //
    // If marks on the gameboard are symmetric about a center
    // axis, only return the squares on one side of the axis
    // plus the squares on the axis (if gameBoardSize is odd, or diagonal axis).

    let iEnd = gameBoardSize;
    let jEnd = gameBoardSize;
    
    const halfSize = Math.ceil(gameBoardSize / 2);
    const symmetry = _getSymmetry();
    if (symmetry.row) {
        jEnd = halfSize;
    }
    if (symmetry.col) {
        iEnd = halfSize;
    }

    let squaresPriority1 = [];
    let squaresPriority2 = [];

    for (let i = 0; i < iEnd; i++) {
        for (let j = 0; j < jEnd; j++) {
            if (squares[i][j] !== '') {
                continue;
            }
            
            if (symmetry.diagUp) {
                if (i + j > gameBoardSize - 1) {
                    // this square is equivalent to an
                    // earlier square since the marks
                    // are diagonally symmetric
                    continue;
                }
            }
            if (symmetry.diagDown) {
                if (i - j > 0) {
                    // this square is equivalent to an
                    // earlier square since the marks
                    // are diagonally symmetric
                    continue;
                }
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

function getAdjacentLocation(loc, direction, factor) {
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

function matchNextNSquares(n, loc, direction) {
    // Starting at square 'loc', check the next 'n' adjacent 
    // squares and return all locations if they match.

    if (squares[loc.row][loc.col] === '') {
        return null;
    }

    let winningLocations = [ { row:loc.row, col:loc.col } ]; // save a copy of 'loc'

    const markType = squares[loc.row][loc.col];

    for (let i = 0; i < n; i++) {
        let nextSquare = getAdjacentLocation(loc, direction, 1);
        if (squares[nextSquare.row][nextSquare.col] === markType) {
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
    const lastIndex = gameBoardSize - numSquaresToWin + 1;

    let direction;
    let matchingSquares;

    // check for row or column winner
    for (let i = 0; i < gameBoardSize; i++) {
        for (let j = 0; j < lastIndex; j++) {
            direction = directionType.row;

            matchingSquares = matchNextNSquares(n, {row:i, col:j}, direction);
            if (matchingSquares) {
                return squares[i][j];
            }
            
            direction = directionType.col;
            matchingSquares = matchNextNSquares(n, {row:j, col:i}, direction);
            if (matchingSquares) {
                return squares[j][i];
            }

            if (i < lastIndex && j < lastIndex) {
                direction = directionType.diagDown;
                matchingSquares = matchNextNSquares(n, {row:i, col:j}, direction);
                if (matchingSquares) {
                    return squares[i][j];
                } 
                
                let row = gameBoardSize - 1 - i;
                direction = directionType.diagUp;
                matchingSquares = matchNextNSquares(n, {row:row, col:j}, direction);
                if (matchingSquares) {
                    return squares[row][j];
                }   
            }
        }
    }

    return null;
}

function minimax(squares, depth, a, b, isMaximizing) {
    // Returns a score for the specified gameboard state ('squares').

    const winnerMarkType = getWinnerN(minWinSquares);
    if (winnerMarkType) {
        return (winnerMarkType === currentPlayerMark) ? 1000 : -1000;
    } 
    else if (gameboardIsFull()) {
        return 0;
    }
    else if (depth > maxRecursionDepth) {
        return 0;
    }

    let bestScore = isMaximizing ? -Infinity : Infinity;
    const markType = isMaximizing ? currentPlayerMark : opposingPlayerMark;

    let locations = getPlayableLocations(squares);
    for (let i = 0; i < locations.length; i++) {
        let loc = locations[i];
                
        squares[loc.row][loc.col] = markType;
        let score = minimax(squares, depth + 1, a, b, !isMaximizing);
        squares[loc.row][loc.col] = '';

        if (isMaximizing) {
            bestScore = Math.max(bestScore, score);
            
            if (bestScore >= b) {
                break; // beta cutoff
            }
            a = Math.max(a, bestScore);
        } else {
            bestScore = Math.min(bestScore, score);
            
            if (bestScore <= a) {
                break; // alpha cutoff
            }
            b = Math.min(b, bestScore);
        }
    }

    return bestScore / depth;
}