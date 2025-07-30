import { getBestMove } from './getBestMove.js';
import { moveToString, parseMove } from './utils.js';

// const s = [[3,7],[4,5],[5,5],[5,4],[8,3],[9,0],[7,4],[2,6],[4,6],[8,2],[9,2],[10,0],[9,1],[8,1],[6,3],[7,1],[5,2],[6,0],[6,1],[7,0],[4,1],[6,4],[7,3],[6,2],[5,3],[5,1],[4,2],[6,5],[7,6],[7,5],[9,5],[9,4],[0,7]]
//     .map(m => moveToString(m));

let bestMove;

console.time('b11-lv10');
bestMove = getBestMove('red', [
    'd8', 'e6',
    'g6', 'g5',
    'i4', 'j1',
    'j2', 'h5',
    'i5', 'k1',
    'h2', 'i2',
    'h3', 'h7',
    'h6', 'f8',
    'e7', 'c11',
    'c10'
], 10);

console.log(bestMove); // should be "b11"
console.timeEnd('b11-lv10');

console.time('b9-lv10');
bestMove = getBestMove('blue', [
    'd8', 'e6',
    'f6', 'f5',
    'i4', 'j1',
    'h5', 'c7',
    'e7', 'i3',
    'j3', 'k1',
    'j2', 'i2',
    'g4', 'h2',
    'f3', 'g1',
    'g2', 'h1',
    'e2', 'g5',
    'h4', 'g3',
    'f4', 'f2',
    'e3', 'g6',
    'h7', 'h6',
    'j6', 'j5',
    'a8'
], 10);

console.log(bestMove); // winning moves: "b6" or "b9"
console.timeEnd('b9-lv10');

console.time('lv1');
bestMove = getBestMove('blue', [
    'd8', 'e6',
    'f6', 'f5',
    'i4', 'j1',
    'h5', 'c7',
    'e7', 'i3',
    'j3', 'k1',
    'j2', 'i2',
    'g4', 'h2',
    'f3', 'g1',
    'g2', 'h1',
    'e2', 'g5',
    'h4', 'g3',
    'f4', 'f2',
    'e3', 'g6',
    'h7', 'h6',
    'j6', 'j5',
    'a8'
], 1);

console.log(bestMove);
console.timeEnd('lv1');
