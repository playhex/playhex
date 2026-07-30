import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game, Player, SimilarPositionFlag } from '../../shared/app/models/index.js';
import type { SimilarPositionFlagContext } from '../../shared/app/models/SimilarPositionFlag.js';
import { toCanonicalPosition, type CanonicalPosition, type ComparisonResult } from '../../shared/position-comparator/position-comparator.js';
import { countStones } from '../../shared/position-comparator/position-similarity.js';

export type SimilarPositionFlagInput = {
    context: SimilarPositionFlagContext;
    comparisonResult: ComparisonResult;
    position: CanonicalPosition;
    flaggedGamePublicId: string;
    playerPublicId?: null | string;
    ip?: null | string;
    botGamePublicId?: null | string;
};

@Service()
export default class SimilarPositionFlagRepository
{
    constructor(
        @Inject('Repository<SimilarPositionFlag>')
        private similarPositionFlagRepository: Repository<SimilarPositionFlag>,

        @Inject('Repository<Game>')
        private gameRepository: Repository<Game>,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) {}

    async create(input: SimilarPositionFlagInput): Promise<SimilarPositionFlag>
    {
        const { comparisonResult, position } = input;
        const flag = new SimilarPositionFlag();

        flag.context = input.context;
        flag.ip = input.ip ?? null;
        flag.flaggedGame = await this.findGameIdOrFail(input.flaggedGamePublicId);
        flag.flaggedGameStonesCount = countStones(toCanonicalPosition(comparisonResult.position));
        flag.botGame = input.botGamePublicId ? await this.findGameIdOrFail(input.botGamePublicId) : null;
        flag.player = input.playerPublicId
            ? await this.playerRepository.findOne({ select: { id: true }, where: { publicId: input.playerPublicId } })
            : null
        ;
        flag.boardsize = position.boardsize;
        flag.position = { black: position.black, white: position.white };
        flag.similarity = comparisonResult.similarity;
        flag.commonStones = comparisonResult.common;
        flag.mirror = comparisonResult.mirror || null;

        return await this.similarPositionFlagRepository.save(flag);
    }

    private async findGameIdOrFail(publicId: string): Promise<Game>
    {
        return await this.gameRepository.findOneOrFail({
            select: { id: true },
            where: { publicId },
        });
    }
}
