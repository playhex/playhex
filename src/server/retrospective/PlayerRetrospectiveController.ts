import { Service } from 'typedi';
import { CurrentUser, Get, JsonController, Param } from 'routing-controllers';
import PlayerRepository from '../repositories/PlayerRepository.js';
import PlayerRetrospectiveRepository from './PlayerRetrospectiveRepository.js';
import { Player } from '../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { DomainHttpError } from '../../shared/app/DomainHttpError.js';
import type { PlayerRetrospectiveData, PlayerRetrospectiveSummary, RetrospectiveLink } from '../../shared/app/retrospective/retrospectiveTypes.js';

@JsonController()
@Service()
export default class PlayerRetrospectiveController
{
    constructor(
        private playerRepository: PlayerRepository,
        private playerRetrospectiveRepository: PlayerRetrospectiveRepository,
    ) {}

    /**
     * Published yearly retrospectives of authenticated player, most recent first.
     * Only for the player itself: contains share codes, retrospectives are visible only when shared.
     */
    @Get('/api/retrospectives')
    async getMine(
        @AuthenticatedPlayer() player: Player,
    ): Promise<{ retrospectives: PlayerRetrospectiveSummary[] }> {
        return {
            retrospectives: await this.playerRetrospectiveRepository.findPublishedSummaries(player),
        };
    }

    /**
     * 404 if not generated yet, or wrong share code.
     * Previous and next years links are only returned to the player itself.
     */
    @Get('/api/players/:publicId/retrospectives/:year/:shareCode')
    async getOne(
        @Param('publicId') publicId: string,
        @Param('year') year: number,
        @Param('shareCode') shareCode: string,
        @CurrentUser() currentPlayer?: Player,
    ): Promise<{ retrospective: PlayerRetrospectiveData, previous: null | RetrospectiveLink, next: null | RetrospectiveLink }> {
        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
            throw new DomainHttpError(404, 'player_not_found');
        }

        const retrospective = Number.isInteger(year)
            ? await this.playerRetrospectiveRepository.findPublished(player, year, shareCode)
            : null
        ;

        if (retrospective === null) {
            throw new DomainHttpError(404, 'retrospective_not_found');
        }

        const neighbours = currentPlayer?.publicId === player.publicId
            ? await this.playerRetrospectiveRepository.findNeighbours(player, year)
            : { previous: null, next: null }
        ;

        return { retrospective: retrospective.data, ...neighbours };
    }
}
