import { Inject, Service } from 'typedi';
import GameAnalyze from '../../shared/app/models/GameAnalyze';
import { EntityRepository } from '@mikro-orm/core';
import HostedGame from '../../shared/app/models/HostedGame';

@Service()
export default class GameAnalyzePersister
{
    constructor(
        @Inject('EntityRepository<GameAnalyze>')
        private gameAnalyzeRepository: EntityRepository<GameAnalyze>,

        @Inject('EntityRepository<HostedGame>')
        private hostedGameRepository: EntityRepository<HostedGame>,
    ) {}

    async persist(gamePublicId: string, gameAnalyze: GameAnalyze): Promise<void>
    {
        gameAnalyze.hostedGame = await this.hostedGameRepository.findOneOrFail({
            publicId: gamePublicId,
        });

        this.gameAnalyzeRepository.upsert(gameAnalyze);
    }

    async findByGamePublicId(publicId: string): Promise<null | GameAnalyze>
    {
        return await this.gameAnalyzeRepository.findOne({
            hostedGame: {
                publicId,
            },
        });
    }
}
