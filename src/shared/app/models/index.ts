import AIConfig from './AIConfig.js';
import ChatMessage from './ChatMessage.js';
import ConditionalMoves from './ConditionalMoves.js';
import Game from './Game.js';
import GameAnalyze from './GameAnalyze.js';
import HostedGame from './HostedGame.js';
import HostedGameOptions from './HostedGameOptions.js';
import {
    HostedGameOptionsTimeControl,
    OptionsFischer,
    HostedGameOptionsTimeControlFischer,
    OptionsByoYomi,
    HostedGameOptionsTimeControlByoYomi,
} from './HostedGameOptionsTimeControl.js';
import HostedGameToPlayer from './HostedGameToPlayer.js';
import Move from './Move.js';
import OnlinePlayers, { OnlinePlayer } from './OnlinePlayers.js';
import Player from './Player.js';
import PlayerPushSubscription from './PlayerPushSubscription.js';
import PlayerSettings, { MoveSettings } from './PlayerSettings.js';
import PlayerStats from './PlayerStats.js';
import Rating from './Rating.js';

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
    MoveSettings,
    OnlinePlayers,
    OnlinePlayer,
    Player,
    PlayerSettings,
    PlayerStats,
    PlayerPushSubscription,
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
    PlayerPushSubscription,
    PlayerSettings,
    PlayerStats,
    Rating,
};

const errored = Object.keys(entities).filter(name => !entities[name as keyof typeof entities]);

if (errored.length > 0) {
    /*
     * Occurs not sure why, but i.e when adding both lines, in this order:
     * import HostedGame from '../shared/app/models/HostedGame.js';
     * import { HostedGameOptions, Player, ChatMessage, OnlinePlayers, PlayerSettings, AIConfig, GameAnalyze } from '../shared/app/models/index.js';
     */
    throw new Error(`Error while generating entities list: ${errored.join(', ')}`);
}
