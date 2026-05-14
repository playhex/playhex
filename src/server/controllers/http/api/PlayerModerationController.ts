import { Get, JsonController, Param, Patch, QueryParam } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares.js';
import { Player } from '../../../../shared/app/models/index.js';
import PlayerModerationActionRepository from '../../../repositories/PlayerModerationActionRepository.js';
import { instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';

@JsonController()
@Service()
export default class PlayerModerationController
{
    constructor(
        private playerModerationActionRepository: PlayerModerationActionRepository,
    ) {}

    @Get('/api/player-moderation-actions')
    async getCurrentModerationAction(
        @AuthenticatedPlayer() player: Player,
        @QueryParam('withPastActions') withPastActions?: boolean,
    ) {
        const moderationActions = await this.playerModerationActionRepository.findActionsForPlayer(player, withPastActions);

        return moderationActions.map(moderationAction => instanceToPlain(moderationAction, {
            groups: ['player_moderation_action'],
        }));
    }

    @Get('/api/players/:publicId/has-moderation-actions')
    async hasActiveModerationActions(
        @Param('publicId') publicId: string,
    ) {
        return await this.playerModerationActionRepository.isCurrentlyChatRestricted(publicId);
    }

    @Patch('/api/player-moderation-actions/:publicId/acknowledge')
    async ackModerationAction(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ) {
        return await this.playerModerationActionRepository.acknowledgeActionForPlayer(player, publicId);
    }
}
