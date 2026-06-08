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
}
