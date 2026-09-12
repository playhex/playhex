import { Service } from 'typedi';
import { Body, ForbiddenError, Get, JsonController, NotFoundError, Param, Patch } from 'routing-controllers';
import { ConditionalMoves, Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import GameStore from '../../../store/GameStore.js';
import ConditionalMovesRepository from '../../../repositories/ConditionalMovesRepository.js';
import { hasPlayer } from '../../../../shared/app/gameUtils.js';

@JsonController()
@Service()
export default class GameConditionalMovesController
{
    constructor(
        private conditionalMovesRepository: ConditionalMovesRepository,
        private gameStore: GameStore,
    ) {}

    @Get('/api/games/:publicId/conditional-moves')
    async getConfitionalMoves(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ): Promise<ConditionalMoves> {
        const game = await this.gameStore.getActiveOrArchivedGame(publicId);

        if (game === null) {
            throw new NotFoundError(`No active game with id '${publicId}'.`);
        }

        let conditionalMoves = await this.conditionalMovesRepository.find(player, game);

        if (conditionalMoves !== null) {
            return conditionalMoves;
        }

        conditionalMoves = new ConditionalMoves();

        conditionalMoves.tree = [];
        conditionalMoves.unplayedLines = [];

        return conditionalMoves;
    }

    @Patch('/api/games/:publicId/conditional-moves')
    async postConditionalMoves(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() conditionalMoves: ConditionalMoves,
    ): Promise<ConditionalMoves> {
        const game = await this.gameStore.getActiveOrArchivedGame(publicId);

        if (game === null) {
            throw new NotFoundError(`No active game with id '${publicId}'.`);
        }

        if (!hasPlayer(game, player)) {
            throw new ForbiddenError(`Player '${player.pseudo} not in this game'`);
        }

        const entity = await this.conditionalMovesRepository.find(player, game);

        if (entity === null) {
            conditionalMoves.player = player;
            conditionalMoves.game = game;
        } else {
            entity.tree = conditionalMoves.tree;

            if (undefined !== conditionalMoves.unplayedLines) {
                entity.unplayedLines = conditionalMoves.unplayedLines;
            }

            conditionalMoves = entity;
        }

        await this.conditionalMovesRepository.save(conditionalMoves);

        return conditionalMoves;
    }
}
