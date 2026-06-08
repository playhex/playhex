import { Inject, Service } from 'typedi';
import { In, Not, Repository } from 'typeorm';
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

    async getIpsForPlayerWithOthers(player: Player): Promise<Array<{ ip: string, lastUsedAt: Date, otherPlayers: Player[] }>>
    {
        const ips = await this.playerIpRepository.find({
            where: { player: { id: player.id } },
            order: { lastUsedAt: 'desc' },
        });

        if (!ips.length) return [];

        const ipStrings = ips.map(i => i.ip);

        const otherEntries = await this.playerIpRepository.find({
            where: { ip: In(ipStrings), player: { id: Not(player.id as number) } },
            relations: { player: true },
        });

        const otherPlayersByIp = new Map<string, Player[]>();
        for (const entry of otherEntries) {
            if (!otherPlayersByIp.has(entry.ip)) {
                otherPlayersByIp.set(entry.ip, []);
            }
            otherPlayersByIp.get(entry.ip)!.push(entry.player);
        }

        return ips.map(i => ({
            ip: i.ip,
            lastUsedAt: i.lastUsedAt,
            otherPlayers: otherPlayersByIp.get(i.ip) ?? [],
        }));
    }
}
