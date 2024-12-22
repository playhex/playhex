import { Service } from 'typedi';
import { IsNumber, IsString, Max, Min } from 'class-validator';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import PlayerRepository from '../../../repositories/PlayerRepository';
import HttpError from '../HttpError';
import { Authorized, Body, JsonController, Post } from 'routing-controllers';
import { Player, HostedGameOptions } from '../../../../shared/app/models';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../../../../shared/app/ratingUtils';

class CreateAiVsAiInput
{
    @IsString()
    ai0Slug: string;

    @IsString()
    ai1Slug: string;

    @IsNumber()
    @Min(RANKED_BOARDSIZE_MIN)
    @Max(RANKED_BOARDSIZE_MAX)
    boardsize: number = 11;
}

@JsonController()
@Service()
@Authorized('ADMIN')
export default class AdminController
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
        private playerRepository: PlayerRepository,
    ) {}

    @Post('/api/admin/persist-games')
    async persistGames()
    {
        const allSuccess = await this.hostedGameRepository.persistPlayingGames();

        if (!allSuccess) {
            throw new HttpError(500, 'Some games could not be persisted');
        }
    }

    @Post('/api/admin/create-ai-vs-ai')
    async createAIvsAI(
        @Body() body: CreateAiVsAiInput,
    ) {
        const findAIBySlug = async (slug: string): Promise<Player> => {
            const ai = await this.playerRepository.getAIPlayerBySlug(slug);

            if (null === ai) {
                throw new HttpError(400, `No AI with slug '${slug}'.`);
            }

            return ai;
        };

        const ai0 = await findAIBySlug(body.ai0Slug);
        const ai1 = await findAIBySlug(body.ai1Slug);

        const options = new HostedGameOptions();

        options.opponentType = 'ai';
        options.opponentPublicId = ai1.publicId;
        options.ranked = true;
        options.boardsize = body.boardsize;
        options.timeControl = {
            type: 'fischer',
            options: {
                initialTime: 3600000, // Fixed time so we can compare time consumed by both ai
            },
        };

        const hostedGameServer = await this.hostedGameRepository.createGame(ai0, options);

        return hostedGameServer.getHostedGame();
    }
}
