import AIConfig from './AIConfig.js';
import BannedIp from './BannedIp.js';
import Channel from './Channel.js';
import ChannelChatMessage from './ChannelChatMessage.js';
import ChatMessage from './ChatMessage.js';
import ConditionalMoves from './ConditionalMoves.js';
import GameAnalyze from './GameAnalyze.js';
import Game from './Game.js';
import GameOptions from './GameOptions.js';
import {
    GameOptionsTimeControl,
    OptionsFischer,
    GameOptionsTimeControlFischer,
    OptionsByoYomi,
    GameOptionsTimeControlByoYomi,
} from './GameOptionsTimeControl.js';
import GameToPlayer from './GameToPlayer.js';
import ModerationSetting from './ModerationSetting.js';
import OnlinePlayers, { OnlinePlayer } from './OnlinePlayers.js';
import Player from './Player.js';
import PlayerAccountPassword from './PlayerAccountPassword.js';
import PlayerModerationAction from './PlayerModerationAction.js';
import PlayerNotification from './PlayerNotification.js';
import PlayerPushSubscription from './PlayerPushSubscription.js';
import PlayerIp from './PlayerIp.js';
import PlayerFavoriteTimeControl from './PlayerFavoriteTimeControl.js';
import PlayerSettings, { MoveSettings } from './PlayerSettings.js';
import PlayerStats from './PlayerStats.js';
import PlayerHeadToHeadStats from './PlayerHeadToHeadStats.js';
import Premove from './Premove.js';
import Rating from './Rating.js';
import Tournament from './Tournament.js';
import TournamentAdmin from './TournamentAdmin.js';
import TournamentBannedPlayer from './TournamentBannedPlayer.js';
import TournamentMatch from './TournamentMatch.js';
import TournamentHistory from './TournamentHistory.js';
import TournamentSubscription from './TournamentSubscription.js';
import TournamentParticipant from './TournamentParticipant.js';

export {
    Game,
    AIConfig,
    BannedIp,
    Channel,
    ChannelChatMessage,
    ChatMessage,
    ConditionalMoves,
    GameAnalyze,
    GameOptions,
    GameOptionsTimeControl,
    OptionsFischer,
    GameOptionsTimeControlFischer,
    OptionsByoYomi,
    GameOptionsTimeControlByoYomi,
    GameToPlayer,
    ModerationSetting,
    MoveSettings,
    OnlinePlayers,
    OnlinePlayer,
    Player,
    PlayerAccountPassword,
    PlayerFavoriteTimeControl,
    PlayerIp,
    PlayerModerationAction,
    PlayerNotification,
    PlayerSettings,
    PlayerStats,
    PlayerHeadToHeadStats,
    PlayerPushSubscription,
    Premove,
    Rating,
    Tournament,
    TournamentAdmin,
    TournamentBannedPlayer,
    TournamentMatch,
    TournamentHistory,
    TournamentSubscription,
    TournamentParticipant,
};

export const entities = {
    Game,
    AIConfig,
    BannedIp,
    Channel,
    ChannelChatMessage,
    ChatMessage,
    ConditionalMoves,
    GameAnalyze,
    GameOptions,
    GameOptionsTimeControl,
    OptionsFischer,
    GameOptionsTimeControlFischer,
    OptionsByoYomi,
    GameOptionsTimeControlByoYomi,
    GameToPlayer,
    ModerationSetting,
    OnlinePlayers,
    Player,
    PlayerAccountPassword,
    PlayerFavoriteTimeControl,
    PlayerIp,
    PlayerModerationAction,
    PlayerNotification,
    PlayerPushSubscription,
    PlayerSettings,
    PlayerStats,
    Rating,
    Tournament,
    TournamentAdmin,
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
     * import Game from '../shared/app/models/Game.js';
     * import { GameOptions, Player, ChatMessage, OnlinePlayers, PlayerSettings, AIConfig, GameAnalyze } from '../shared/app/models/index.js';
     *
     * Also, 'ReferenceError: Cannot access 'X' before initialization' is related,
     * we must use 'index.js' import to prevent error.
     */
    throw new Error(`Error while generating entities list: ${errored.join(', ')}`);
}
