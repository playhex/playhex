import Board, { BOARD_DEFAULT_SIZE } from './Board';
import Game from './Game';
import PlayerInterface, { PlayerEvents } from './PlayerInterface';
import Player from './Player';
import SimplePlayer from './SimplePlayer';
import PlayerGameInput from './PlayerGameInput';
import IllegalMove from './IllegalMove';
import Move from './Move';
import RandomAIPlayer from './RandomAIPlayer';
import { PlayerIndex } from './Types';

export {
    Board,
    BOARD_DEFAULT_SIZE,
    Game,
    Player,
    SimplePlayer,
    PlayerGameInput,
    IllegalMove,
    Move,
    RandomAIPlayer,
};

export type {
    PlayerIndex,
    PlayerInterface,
    PlayerEvents,
}
