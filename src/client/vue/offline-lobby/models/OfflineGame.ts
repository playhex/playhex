import Player from '../../../../shared/app/models/Player.js';
import { GameData } from '../../../../shared/game-engine/normalization.js';
import { OfflineAIGameOptions } from './OfflineAIGameOptions.js';

export class OfflineGame
{
    gameOptions: OfflineAIGameOptions;

    gameData: GameData;

    players: Player[] = [];
}
