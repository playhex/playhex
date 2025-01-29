import AIConfig from './AIConfig';
import ChatMessage from './ChatMessage';
import ConditionalMoves from './ConditionalMoves';
import Game from './Game';
import GameAnalyze from './GameAnalyze';
import HostedGame from './HostedGame';
import HostedGameOptions from './HostedGameOptions';
import {
    HostedGameOptionsTimeControl,
    OptionsFischer,
    HostedGameOptionsTimeControlFischer,
    OptionsByoYomi,
    HostedGameOptionsTimeControlByoYomi,
} from './HostedGameOptionsTimeControl';
import HostedGameToPlayer from './HostedGameToPlayer';
import Move from './Move';
import OnlinePlayers from './OnlinePlayers';
import Player from './Player';
import PlayerSettings from './PlayerSettings';
import PlayerStats from './PlayerStats';
import Rating from './Rating';

export {
    AIConfig,
    ChatMessage,
    ConditionalMoves,
    Game,
    GameAnalyze,
    HostedGame,
    HostedGameOptions,
    HostedGameOptionsTimeControl,
    OptionsFischer,
    HostedGameOptionsTimeControlFischer,
    OptionsByoYomi,
    HostedGameOptionsTimeControlByoYomi,
    HostedGameToPlayer,
    Move,
    OnlinePlayers,
    Player,
    PlayerSettings,
    PlayerStats,
    Rating,
};

export const entities = {
    AIConfig,
    ChatMessage,
    ConditionalMoves,
    Game,
    GameAnalyze,
    HostedGame,
    HostedGameOptions,
    HostedGameOptionsTimeControl,
    OptionsFischer,
    HostedGameOptionsTimeControlFischer,
    OptionsByoYomi,
    HostedGameOptionsTimeControlByoYomi,
    HostedGameToPlayer,
    Move,
    OnlinePlayers,
    Player,
    PlayerSettings,
    PlayerStats,
    Rating,
};

const errored = Object.keys(entities).filter(name => !entities[name as keyof typeof entities]);

if (errored.length > 0) {
    /*
     * Occurs not sure why, but i.e when adding both lines, in this order:
     * import HostedGame from '../shared/app/models/HostedGame';
     * import { HostedGameOptions, Player, ChatMessage, OnlinePlayers, PlayerSettings, AIConfig, GameAnalyze } from '../shared/app/models';
     */
    throw new Error(`Error while generating entities list: ${errored.join(', ')}`);
}
