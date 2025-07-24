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
import Tournament from './Tournament.js';
import TournamentBannedPlayer from './TournamentBannedPlayer.js';
import TournamentMatch from './TournamentMatch.js';
import TournamentHistory from './TournamentHistory.js';
import TournamentSubscription from './TournamentSubscription.js';
import TournamentParticipant from './TournamentParticipant.js';

export {
    HostedGame,
    AIConfig,
    ChatMessage,
    ConditionalMoves,
    Game,
    GameAnalyze,
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
    Tournament,
    TournamentBannedPlayer,
    TournamentMatch,
    TournamentHistory,
    TournamentSubscription,
    TournamentParticipant,
};

export const entities = {
    HostedGame,
    AIConfig,
    ChatMessage,
    ConditionalMoves,
    Game,
    GameAnalyze,
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
    Tournament,
    TournamentBannedPlayer,
    TournamentMatch,
    TournamentHistory,
    TournamentSubscription,
    TournamentParticipant,
};

const errored = Object.keys(entities).filter(name => !entities[name as keyof typeof entities]);

if (errored.length > 0) {
    /*
     * Occurs not sure why, but i.e when adding both lines, in this order:
     * import HostedGame from '../shared/app/models/HostedGame.js';
     * import { HostedGameOptions, Player, ChatMessage, OnlinePlayers, PlayerSettings, AIConfig, GameAnalyze } from '../shared/app/models/index.js';
     *
     * Also, 'ReferenceError: Cannot access 'X' before initialization' is related,
     * we must use 'index.js' import to prevent error.
     */
    throw new Error(`Error while generating entities list: ${errored.join(', ')}`);
}
