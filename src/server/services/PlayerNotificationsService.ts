import { Container, Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import PlayerNotification from '../../shared/app/models/PlayerNotification.js';
import { HexServer } from '../server.js';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';
import Rooms from '../../shared/app/Rooms.js';

@Service()
export class PlayerNotificationsService
{
    constructor(
        @Inject('Repository<PlayerNotification>')
        private playerNotificationRepository: Repository<PlayerNotification>,
    ) {}

    async addNotification(playerNotification: PlayerNotification): Promise<void>
    {
        Container.get(HexServer)
            .to(Rooms.player(playerNotification.player.publicId))
            .emit('playerNotification', instanceToPlain(playerNotification, {
                groups: ['playerNotification'],
            }))
        ;

        await this.playerNotificationRepository.save(playerNotification);
    }
}
