'use strict';

function getGameBoardSymmetry(squares) {
    // Returns flags for each axis (vertical, horizontal, diag up, diag down)
    // indicating if the marks on the gameboard are symmetric about the axis.

    const size = squares.length;
    const halfSize = Math.floor(size / 2);

    let symmetricRow = true;
    let symmetricCol = true;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < halfSize; j++) {
            if (squares[i][j] !== squares[i][size - 1 - j]) {
                symmetricRow = false;
            }
            if (squares[j][i] !== squares[size - 1 - j][i]) {
                symmetricCol = false;
            }
        }
    }

    let symmetricDiagUp = false;
    let symmetricDiagDown = false;

    if (!symmetricRow && !symmetricCol) {
        symmetricDiagUp = true;
        symmetricDiagDown = true;

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (i !== j) {
                    if (squares[i][j] !== squares[j][i]) {
                        symmetricDiagDown = false;
                    }
                }
                if (i !== size - 1 - j) {
                    if (squares[i][j] !== squares[size - 1 - j][size - 1 - i]) {
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

function adjacentSquareHasMark(squares, loc) {
    const size = squares.length;

    const rowFirst = Math.max(0, loc.row - 1);
    const rowLast = Math.min(size - 1, loc.row + 1);

    const colFirst = Math.max(0, loc.col - 1);
    const colLast = Math.min(size - 1, loc.col + 1);

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

function getPlayableLocations(squares) {
    // Return an array of available locations, prioritizing
    // locations that are adjacent to non-empty squares.
    //
    // If marks on the gameboard are symmetric about a center
    // axis, only return the squares on one side of the axis
    // plus the squares on the axis (if size is odd, or diagonal axis).

    const size = squares.length;

    let iEnd = size;
    let jEnd = size;
    
    const halfSize = Math.ceil(size / 2);
    const symmetry = getGameBoardSymmetry(squares);
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
                if (i + j > size - 1) {
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

            if (adjacentSquareHasMark(squares, loc)) {
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

function matchNextNSquares(squares, n, loc, direction) {
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

function getWinnerN(squares, numSquaresToWin) {
    // Check for 'numSquaresToWin' matching marks in a row
    // in all directions (up, down, diagonal) starting from
    // the top rows and left columns of the gameboard.

    const size = squares.length;
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

            matchingSquares = matchNextNSquares(squares, n, {row:i, col:j}, direction);
            if (matchingSquares) {
                return WinnerInfo(squares[i][j], matchingSquares);
            }
            
            direction = directionType.col;
            matchingSquares = matchNextNSquares(squares, n, {row:j, col:i}, direction);
            if (matchingSquares) {
                return WinnerInfo(squares[j][i], matchingSquares);
            }

            if (i < lastIndex && j < lastIndex) {
                direction = directionType.diagDown;
                matchingSquares = matchNextNSquares(squares, n, {row:i, col:j}, direction);
                if (matchingSquares) {
                    return WinnerInfo(squares[i][j], matchingSquares);
                } 
                
                let row = size - 1 - i;
                direction = directionType.diagUp;
                matchingSquares = matchNextNSquares(squares, n, {row:row, col:j}, direction);
                if (matchingSquares) {
                    return WinnerInfo(squares[row][j], matchingSquares);
                }   
            }
        }
    }

    return null;
}