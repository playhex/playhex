import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { HostedGame } from '../../../shared/app/models/index.js';
import { DataInconsistenciesCheckerInterface } from './DataInconsistenciesCheckerInterface.js';

const { ALLOW_RANKED_BOT_GAMES } = process.env;

@Service()
export class NoRankedVsAI implements DataInconsistenciesCheckerInterface
{
    constructor(
        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,

        private allowRankedBotGames: boolean = ALLOW_RANKED_BOT_GAMES === 'true',
    ) {}

    getDescription(): string
    {
        return 'Should not have ranked vs AI games';
    }

    async run(): Promise<string[]>
    {
        if (this.allowRankedBotGames) {
            // eslint-disable-next-line no-console
            console.log('     (test skipped) ranked bot games are allowed (ALLOW_RANKED_BOT_GAMES=true)');
            return [];
        }

        const rankedBotGames = await this.hostedGameRepository.findBy({
            ranked: true,
            opponentType: 'ai',
        });

        return rankedBotGames.map(game => `Ranked bot game: ${game.publicId} | created ${game.createdAt.toISOString()} | state ${game.state}`);
    }
}
