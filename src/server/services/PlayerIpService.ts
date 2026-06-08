import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player, PlayerIp } from '../../shared/app/models/index.js';

@Service()
export default class PlayerIpService
{
    constructor(
        @Inject('Repository<PlayerIp>')
        private playerIpRepository: Repository<PlayerIp>,
    ) {}

    async logPlayerIp(player: Player, ip: string): Promise<void>
    {
        await this.playerIpRepository
            .createQueryBuilder()
            .insert()
            .into(PlayerIp)
            .values({ player: { id: player.id }, ip, lastUsedAt: new Date() })
            .orUpdate(['lastUsedAt'], ['playerId', 'ip'])
            .execute()
        ;
    }
}
