import { EntitySubscriberInterface, EventSubscriber, UpdateEvent } from 'typeorm';
import { Player } from '../../../shared/app/models';
import logger from '../../services/logger';

/**
 * After updating Player (i.e after setting him a new currentRating),
 * password was undefined but set to null by typeorm while persisting.
 * Which causes the next persist set player password to null...
 *
 * See https://github.com/typeorm/typeorm/issues/4167
 *
 * This subscriber fixes this behaviour.
 */
@EventSubscriber()
export default class FixPasswordRemoving implements EntitySubscriberInterface<Player>
{
    listenTo(): typeof Player
    {
        return Player;
    }

    afterUpdate(event: UpdateEvent<Player>): void
    {
        const { entity } = event;

        if (!(entity instanceof Player)) {
            logger.warning('afterUpdate received an entity which is not a Player');
            return;
        }

        entity.password = undefined;
    }
}
