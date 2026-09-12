import { Inject, Service } from 'typedi';
import { GameAnalyze, Game } from '../../shared/app/models/index.js';
import { Repository } from 'typeorm';

@Service()
export default class GameAnalyzeRepository
{
    constructor(
        @Inject('Repository<GameAnalyze>')
        private gameAnalyzeRepository: Repository<GameAnalyze>,

        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,
    ) {}

    async persist(gamePublicId: string, gameAnalyze: GameAnalyze): Promise<void>
    {
        gameAnalyze.game = await this.gameRepository.findOneOrFail({
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
            game: {
                publicId: publicId,
            },
        });
    }
}
