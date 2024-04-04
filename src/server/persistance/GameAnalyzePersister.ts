import { Service } from 'typedi';
import GameAnalyze from '../../shared/app/models/GameAnalyze';
import prisma from '../services/prisma';
import { plainToInstance } from 'class-transformer';

@Service()
export default class GameAnalyzePersister
{
    async persist(gamePublicId: string, gameAnalyze: GameAnalyze): Promise<void>
    {
        const hostedGame = await prisma.hostedGame.findUniqueOrThrow({
            select: {
                id: true,
            },
            where: {
                publicId: gamePublicId,
            },
        });

        await prisma.gameAnalyze.upsert({
            where: {
                hostedGameId: hostedGame.id,
            },
            create: {
                hostedGameId: hostedGame.id,
                startedAt: gameAnalyze.startedAt,
                endedAt: gameAnalyze.endedAt,
                analyze: gameAnalyze.analyze ?? undefined,
            },
            update: {
                startedAt: gameAnalyze.startedAt,
                endedAt: gameAnalyze.endedAt,
                analyze: gameAnalyze.analyze ?? undefined,
            },
        });
    }

    async findByGamePublicId(publicId: string): Promise<null | GameAnalyze>
    {
        const gameAnalyzeObject = await prisma.gameAnalyze.findFirst({
            where: {
                hostedGame: {
                    publicId,
                },
            },
        });

        if (null === gameAnalyzeObject) {
            return null;
        }

        return plainToInstance(GameAnalyze, gameAnalyzeObject);
    }
}
