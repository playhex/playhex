import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player, PlayerFavoriteTimeControl } from '../../shared/app/models/index.js';
import { type TimeControlCadency } from '../../shared/app/timeControlUtils.js';

@Service()
export default class PlayerFavoriteTimeControlRepository
{
    constructor(
        @Inject('Repository<PlayerFavoriteTimeControl>')
        private repository: Repository<PlayerFavoriteTimeControl>,
    ) {}

    async getForPlayer(publicId: string): Promise<PlayerFavoriteTimeControl[]>
    {
        return this.repository.find({
            where: {
                player: { publicId },
            },
            order: { order: 'ASC' },
        });
    }

    async replaceForPlayer(player: Player, cadency: TimeControlCadency, items: PlayerFavoriteTimeControl[]): Promise<void>
    {
        await this.repository.manager.transaction(async manager => {
            await manager.delete(PlayerFavoriteTimeControl, { playerId: player.id, cadency });

            for (let i = 0; i < items.length; i++) {
                await manager.insert(PlayerFavoriteTimeControl, {
                    playerId: player.id,
                    name: items[i].name ?? null,
                    cadency,
                    timeControlType: items[i].timeControlType,
                    order: i,
                });
            }
        });
    }
}
