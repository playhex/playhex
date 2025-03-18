import { Inject, Service } from 'typedi';
import { IsNull, Like, Not, Repository } from 'typeorm';
import { Player } from '../../../shared/app/models/index.js';
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
        const accountsWithoutPassword = await this.playerRepository.findBy({
            isGuest: false,
            isBot: false,
            password: IsNull(),
            slug: Not(Like('anonymous%')),
        });

        return accountsWithoutPassword.map(player => `${player.pseudo} (id = ${player.id})`);
    }
}
