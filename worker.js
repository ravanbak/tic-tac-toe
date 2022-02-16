'use strict';

self.importScripts('types.js');
self.importScripts('util.js');

let squares = [];
let gameBoardSize;
let maxRecursionDepth;
let currentPlayerMark;
let opposingPlayerMark;
let minWinSquares;

onmessage = function(e) {
    squares = e.data['squares'];
    gameBoardSize = squares.length;
    maxRecursionDepth = e.data['maxDepth'];
    minWinSquares = e.data['minWinSquares'];
    currentPlayerMark = e.data['currentPlayerMark'];
    opposingPlayerMark = (currentPlayerMark === 'x') ? 'o' : 'x';

    const score = minimax(squares, 1, -Infinity, Infinity, false);
    
    postMessage({ score });
}

const gameboardIsFull = () => squares.filter(row => row.filter(square => square == '').length === 0).length == gameBoardSize;

function minimax(squares, depth, a, b, isMaximizing) {
    // Returns a score for the specified gameboard state ('squares').

    const winnerMarkType = getWinnerN(squares, minWinSquares);
    if (winnerMarkType) {
        return (winnerMarkType === currentPlayerMark) ? 100 : -100;
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

    return bestScore - depth;
}