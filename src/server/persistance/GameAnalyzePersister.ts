import { Inject, Service } from 'typedi';
import { GameAnalyze, HostedGame } from '../../shared/app/models/index.js';
import { Repository } from 'typeorm';

@Service()
export default class GameAnalyzePersister
{
    constructor(
        @Inject('Repository<GameAnalyze>')
        private gameAnalyzeRepository: Repository<GameAnalyze>,

        @Inject('Repository<HostedGame>')
        private hostedGameRepository: Repository<HostedGame>,
    ) {}

    async persist(gamePublicId: string, gameAnalyze: GameAnalyze): Promise<void>
    {
        gameAnalyze.hostedGame = await this.hostedGameRepository.findOneOrFail({
            select: {
                id: true,
            },
            where: {
                publicId: gamePublicId,
            },
        });

        await this.gameAnalyzeRepository.save(gameAnalyze);
    }

    async findByGamePublicId(publicId: string): Promise<null | GameAnalyze>
    {
        return await this.gameAnalyzeRepository.findOneBy({
            hostedGame: {
                publicId: publicId,
            },
        });
    }
}
