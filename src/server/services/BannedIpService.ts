import { Inject, Service } from 'typedi';
import { IsNull, MoreThan, Or, Repository } from 'typeorm';
import { BannedIp } from '../../shared/app/models/index.js';

@Service()
export default class BannedIpService
{
    constructor(
        @Inject('Repository<BannedIp>')
        private bannedIpRepository: Repository<BannedIp>,
    ) {}

    async getActiveBan(ip: string)
    {
        return await this.bannedIpRepository.findOneBy({
            ip,
            bannedUntil: Or(IsNull(), MoreThan(new Date())),
        });
    }

    async getActiveBans(): Promise<BannedIp[]>
    {
        return await this.bannedIpRepository.find({
            where: { bannedUntil: Or(IsNull(), MoreThan(new Date())) },
            order: { bannedAt: 'desc' },
        });
    }

    async banIp(ip: string, bannedUntil: Date, reason: string): Promise<void>
    {
        await this.bannedIpRepository
            .createQueryBuilder()
            .insert()
            .into(BannedIp)
            .values({ ip, bannedAt: new Date(), bannedUntil, reason })
            .orUpdate(['bannedAt', 'bannedUntil', 'reason'], ['ip'])
            .execute()
        ;
    }
}
