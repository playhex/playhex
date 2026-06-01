import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player, PlayerAccountPassword } from '../../../shared/app/models/index.js';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface.js';

/**
 * A bug with typeorm set some account passwords to null.
 * Related to { select: false }, this has been removed to prevent this to occur again.
 */
@Service()
export class AccountsMustHavePassword implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) {}

    getDescription(): string
    {
        return 'Every account must have a password';
    }

    async run(): Promise<string[]>
    {
        const accountsWithoutPassword = await this.playerRepository
            .createQueryBuilder('p')
            .select(['p.id', 'p.pseudo'])
            .leftJoin(PlayerAccountPassword, 'pap', 'p.id = pap.playerId')
            .where('p.isGuest = false')
            .andWhere('p.isBot = false')
            .andWhere('p.slug NOT LIKE :slug', { slug: 'anonymous%' })
            .andWhere('pap.playerId IS NULL')
            .getMany()
        ;

        return accountsWithoutPassword.map(player => `${player.pseudo} (id = ${player.id})`);
    }
}
