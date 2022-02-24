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
            if (squares[i][j].mark !== squares[i][size - 1 - j].mark) {
                symmetricRow = false;
            }
            if (squares[j][i].mark !== squares[size - 1 - j][i].mark) {
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
                    if (squares[i][j].mark !== squares[j][i].mark) {
                        symmetricDiagDown = false;
                    }
                }
                if (i !== size - 1 - j) {
                    if (squares[i][j].mark !== squares[size - 1 - j][size - 1 - i].mark) {
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
                if (squares[i][j].mark !== '') {
                    return true;
                }
            }
        }
    }

    return false;
}

function getPlayableLocations(squares, isMaximizing) {
    // Return an array of available locations.
    //
    // If marks on the gameboard are symmetric about a center
    // axis, only return the squares on one side of the axis
    // plus the squares on the axis (if size is odd, or diagonal axis).

    const size = squares.length;
    const halfSize = Math.ceil(size / 2);
    const symmetry = getGameBoardSymmetry(squares);
    
    const iEnd = symmetry.col ? halfSize : size;
    const jEnd = symmetry.row ? halfSize : size;

    let squaresAvailable1 = [];
    let squaresAvailable2 = [];

    for (let i = 0; i < iEnd; i++) {
        for (let j = 0; j < jEnd; j++) {
            if (squares[i][j].mark !== '') {
                continue;
            }

            if (symmetry.diagUp) {
                if (i + j > size - 1) {
                    // this square is equivalent to an earlier square
                    continue;
                }
            }

            if (symmetry.diagDown) {
                if (i - j > 0) {
                    // this square is equivalent to an earlier square
                    continue;
                }
            }

            // Prioritize inner squares
            if (i > 0 && j > 0 && i < (size - 1) && j < (size - 1)) {
                squaresAvailable1.push(squares[i][j]);
            } else {
                squaresAvailable2.push(squares[i][j]);
            }            
        }
    }

    let squaresAvailable = squaresAvailable1.concat(squaresAvailable2);

    // Sort squares by their minimax scores
    let sortedSquares = squaresAvailable.sort((a, b) => (isMaximizing) ? b.score.max - a.score.max : a.score.min - b.score.min);
    return sortedSquares.map(square => square.loc);
}

function getAdjacentLocation(loc, direction, factor) {
    const offset = 1 * factor; // offset 1 = next, -1 = previous

    switch (direction) {
        case DirectionType.row:
            loc.col += offset;
            break;
        
        case DirectionType.col:
            loc.row += offset;
            break;

        case DirectionType.diagUp:
            loc.row -= offset;
            loc.col += offset;
            break;

        case DirectionType.diagDown:
            loc.row += offset;
            loc.col += offset;
            break;    
    }

    return loc;
}

function matchNextNSquares(squares, n, loc, direction) {
    // Starting at square 'loc', check the next 'n' adjacent 
    // squares and return all locations if they match.

    if (squares[loc.row][loc.col].mark === '') {
        return null;
    }

    let winningLocations = [ { row:loc.row, col:loc.col } ]; // save a copy of 'loc'

    const mark = squares[loc.row][loc.col].mark;

    for (let i = 0; i < n; i++) {
        let nextSquare = getAdjacentLocation(loc, direction, 1);
        if (squares[nextSquare.row][nextSquare.col].mark === mark) {
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
            direction = DirectionType.row;

            matchingSquares = matchNextNSquares(squares, n, {row:i, col:j}, direction);
            if (matchingSquares) {
                return WinnerInfo(squares[i][j].mark, matchingSquares);
            }
            
            direction = DirectionType.col;
            matchingSquares = matchNextNSquares(squares, n, {row:j, col:i}, direction);
            if (matchingSquares) {
                return WinnerInfo(squares[j][i].mark, matchingSquares);
            }

            if (i < lastIndex && j < lastIndex) {
                direction = DirectionType.diagDown;
                matchingSquares = matchNextNSquares(squares, n, {row:i, col:j}, direction);
                if (matchingSquares) {
                    return WinnerInfo(squares[i][j].mark, matchingSquares);
                } 
                
                let row = size - 1 - i;
                direction = DirectionType.diagUp;
                matchingSquares = matchNextNSquares(squares, n, {row:row, col:j}, direction);
                if (matchingSquares) {
                    return WinnerInfo(squares[row][j].mark, matchingSquares);
                }   
            }
        }
    }

    return null;
}