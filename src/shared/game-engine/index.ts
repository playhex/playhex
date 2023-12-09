import Board, { BOARD_DEFAULT_SIZE } from './Board';
import Game from './Game';
import PlayerInterface, { PlayerEvents } from './PlayerInterface';
import Player from './Player';
import PlayerGameInput from './PlayerGameInput';
import IllegalMove from './IllegalMove';
import Move from './Move';
import RandomAIPlayer from './RandomAIPlayer';
import DeterministRandomAIPlayer from './DeterministRandomAIPlayer';
import { PlayerIndex } from './Types';

export {
    Board,
    BOARD_DEFAULT_SIZE,
    Game,
    Player,
    PlayerGameInput,
    IllegalMove,
    Move,
    RandomAIPlayer,
    DeterministRandomAIPlayer,
};

export type {
    PlayerIndex,
    PlayerInterface,
    PlayerEvents,
};
