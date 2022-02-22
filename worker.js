'use strict';

self.importScripts('types.js');
self.importScripts('util.js');

let gameBoardSize;
let maxRecursionDepth;
let currentPlayerMark;
let opposingPlayerMark;
let minWinSquares;

onmessage = function(e) {
    let squares = e.data['squares'];
    
    maxRecursionDepth = e.data.maxDepth;
    minWinSquares = e.data.minWinSquares;
    currentPlayerMark = e.data.currentPlayerMark;
    opposingPlayerMark = (currentPlayerMark === 'x') ? 'o' : 'x';

    gameBoardSize = squares.length;

    const score = minimax(squares, 1, -Infinity, Infinity, false);
    
    postMessage({ score });
}

const gameboardIsFull = (squares) => squares.filter(row => row.filter(square => square.mark === '').length === 0).length === gameBoardSize;

function minimax(squares, depth, a, b, isMaximizing) {
    // Returns a score for the specified gameboard state ('squares').

    const winnerInfo = getWinnerN(squares, minWinSquares);

    if (winnerInfo) {
        return (winnerInfo.mark === currentPlayerMark) ? 1000 : -1000;
    } 
    else if (gameboardIsFull(squares)) {
        return 0;
    }
    else if (depth > maxRecursionDepth) {
        if (gameBoardSize >= 5) {
            const mid = Math.floor(gameBoardSize / 2);
            let score = 0;
            for (let i = mid - 1; i <= mid + 1; i++) {
                for (let j = mid - 1; j <= mid + 1; j++) {
                    if (squares[i][j].mark !== '') {
                        score += (squares[i][j].mark === currentPlayerMark) ? 1 : -1;
                    }
                }
            }
            return score;
        } 
        else {
            return 0;
        }
    }

    let bestScore = isMaximizing ? -Infinity : Infinity;
    const mark = isMaximizing ? currentPlayerMark : opposingPlayerMark;

    let locations = getPlayableLocations(squares);
    for (let i = 0; i < locations.length; i++) {
        let loc = locations[i];
                
        squares[loc.row][loc.col].mark = mark;
        let score = minimax(squares, depth + 1, a, b, !isMaximizing);
        squares[loc.row][loc.col].mark = '';
        
        if (isMaximizing) {
            bestScore = Math.max(bestScore, score);
            
            a = Math.max(a, bestScore);
            if (bestScore >= b) {
                break; // beta cutoff
            }
        } 
        else {
            bestScore = Math.min(bestScore, score);
            
            b = Math.min(b, bestScore);
            if (bestScore <= a) {
                break; // alpha cutoff
            }
        }
    }

    return bestScore / depth;
}