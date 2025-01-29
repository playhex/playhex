import { Service } from 'typedi';
import { Body, ForbiddenError, Get, JsonController, NotFoundError, Param, Patch } from 'routing-controllers';
import { ConditionalMoves, Player } from '../../../../shared/app/models';
import { AuthenticatedPlayer } from '../middlewares';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import ConditionalMovesRepository from '../../../repositories/ConditionalMovesRepository';

@JsonController()
@Service()
export default class GameConditionalMovesController
{
    constructor(
        private conditionalMovesRepository: ConditionalMovesRepository,
        private hostedGameRepository: HostedGameRepository,
    ) {}

    @Get('/api/games/:publicId/conditional-moves')
    async getConfitionalMoves(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ): Promise<ConditionalMoves> {
        const hostedGameServer = this.hostedGameRepository.getActiveGame(publicId);

        if (null === hostedGameServer) {
            throw new NotFoundError(`No active game with id '${publicId}'.`);
        }

        let conditionalMoves = await this.conditionalMovesRepository.find(player, hostedGameServer.getHostedGame());

        if (null !== conditionalMoves) {
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
        const hostedGameServer = this.hostedGameRepository.getActiveGame(publicId);

        if (null === hostedGameServer) {
            throw new NotFoundError(`No active game with id '${publicId}'.`);
        }

        if (!hostedGameServer.isPlayerInGame(player)) {
            throw new ForbiddenError(`Player '${player.pseudo} not in this game'`);
        }

        const entity = await this.conditionalMovesRepository.find(player, hostedGameServer.getHostedGame());

        if (null === entity) {
            conditionalMoves.player = player;
            conditionalMoves.hostedGame = hostedGameServer.getHostedGame();
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
