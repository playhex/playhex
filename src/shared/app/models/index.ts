import AIConfig from './AIConfig.js';
import BannedIp from './BannedIp.js';
import Channel from './Channel.js';
import ChannelChatMessage from './ChannelChatMessage.js';
import ChatMessage from './ChatMessage.js';
import ConditionalMoves from './ConditionalMoves.js';
import ExternalGame from './ExternalGame.js';
import ExternalGameAnalyze from './ExternalGameAnalyze.js';
import ExternalGameImportJob from './ExternalGameImportJob.js';
import GameAnalyze from './GameAnalyze.js';
import Game from './Game.js';
import GameChatSubscription from './GameChatSubscription.js';
import GameOptions from './GameOptions.js';
import {
    GameOptionsTimeControl,
    OptionsFischer,
    GameOptionsTimeControlFischer,
    OptionsByoYomi,
    GameOptionsTimeControlByoYomi,
} from './GameOptionsTimeControl.js';
import GameToPlayer from './GameToPlayer.js';
import Ladder from './Ladder.js';
import LadderChallenge from './LadderChallenge.js';
import LadderEvent from './LadderEvent.js';
import LadderPlayer from './LadderPlayer.js';
import LadderReign from './LadderReign.js';
import ModerationSetting from './ModerationSetting.js';
import OnlinePlayers, { OnlinePlayer } from './OnlinePlayers.js';
import Player from './Player.js';
import PlayerAccountPassword from './PlayerAccountPassword.js';
import PlayerModerationAction from './PlayerModerationAction.js';
import PlayerNotification from './PlayerNotification.js';
import PlayerAiWorkerKey from './PlayerAiWorkerKey.js';
import PlayerPushSubscription from './PlayerPushSubscription.js';
import PlayerIp from './PlayerIp.js';
import PlayerLittleGolemAccount from './PlayerLittleGolemAccount.js';
import PlayerFavoriteTimeControl from './PlayerFavoriteTimeControl.js';
import PlayerSettings, { MoveSettings } from './PlayerSettings.js';
import PlayerStats from './PlayerStats.js';
import PlayerHeadToHeadStats from './PlayerHeadToHeadStats.js';
import Premove from './Premove.js';
import Puzzle from './Puzzle.js';
import PuzzleCollection from './PuzzleCollection.js';
import Rating from './Rating.js';
import SimilarPositionFlag from './SimilarPositionFlag.js';
import Tournament from './Tournament.js';
import TournamentAdmin from './TournamentAdmin.js';
import TournamentBannedPlayer from './TournamentBannedPlayer.js';
import TournamentMatch from './TournamentMatch.js';
import TournamentHistory from './TournamentHistory.js';
import TournamentSubscription from './TournamentSubscription.js';
import TournamentParticipant from './TournamentParticipant.js';
import TournamentSeries from './TournamentSeries.js';
import TournamentSeriesAdmin from './TournamentSeriesAdmin.js';
import Video from './Video.js';

export {
    Game,
    AIConfig,
    BannedIp,
    Channel,
    ChannelChatMessage,
    ChatMessage,
    ConditionalMoves,
    ExternalGame,
    ExternalGameAnalyze,
    ExternalGameImportJob,
    GameAnalyze,
    GameChatSubscription,
    GameOptions,
    GameOptionsTimeControl,
    OptionsFischer,
    GameOptionsTimeControlFischer,
    OptionsByoYomi,
    GameOptionsTimeControlByoYomi,
    GameToPlayer,
    Ladder,
    LadderChallenge,
    LadderEvent,
    LadderPlayer,
    LadderReign,
    ModerationSetting,
    MoveSettings,
    OnlinePlayers,
    OnlinePlayer,
    Player,
    PlayerAccountPassword,
    PlayerFavoriteTimeControl,
    PlayerIp,
    PlayerLittleGolemAccount,
    PlayerModerationAction,
    PlayerNotification,
    PlayerSettings,
    PlayerStats,
    PlayerHeadToHeadStats,
    PlayerAiWorkerKey,
    PlayerPushSubscription,
    Premove,
    Puzzle,
    PuzzleCollection,
    Rating,
    SimilarPositionFlag,
    Tournament,
    TournamentAdmin,
    TournamentBannedPlayer,
    TournamentMatch,
    TournamentHistory,
    TournamentSubscription,
    TournamentParticipant,
    TournamentSeries,
    TournamentSeriesAdmin,
    Video,
};

export const entities = {
    Game,
    AIConfig,
    BannedIp,
    Channel,
    ChannelChatMessage,
    ChatMessage,
    ConditionalMoves,
    ExternalGame,
    ExternalGameAnalyze,
    ExternalGameImportJob,
    GameAnalyze,
    GameChatSubscription,
    GameOptions,
    GameOptionsTimeControl,
    OptionsFischer,
    GameOptionsTimeControlFischer,
    OptionsByoYomi,
    GameOptionsTimeControlByoYomi,
    GameToPlayer,
    Ladder,
    LadderChallenge,
    LadderEvent,
    LadderPlayer,
    LadderReign,
    ModerationSetting,
    OnlinePlayers,
    Player,
    PlayerAccountPassword,
    PlayerFavoriteTimeControl,
    PlayerIp,
    PlayerLittleGolemAccount,
    PlayerModerationAction,
    PlayerNotification,
    PlayerAiWorkerKey,
    PlayerPushSubscription,
    PlayerSettings,
    PlayerStats,
    Puzzle,
    PuzzleCollection,
    Rating,
    SimilarPositionFlag,
    Tournament,
    TournamentAdmin,
    TournamentBannedPlayer,
    TournamentMatch,
    TournamentHistory,
    TournamentSubscription,
    TournamentParticipant,
    TournamentSeries,
    TournamentSeriesAdmin,
    Video,
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
