import { Inject, Service } from 'typedi';
import { In, IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { Ladder, LadderChallenge, LadderEvent, LadderPlayer, LadderReign } from '../../shared/app/models/index.js';
import { AppDataSource } from '../data-source.js';

export type LadderEntity = LadderPlayer | LadderChallenge | LadderReign | LadderEvent;

/**
 * All ladder database access.
 * An interface so that LadderService can be tested with an in memory implementation.
 */
export interface LadderRepositoryInterface
{
    findLadderBySlug(slug: string): Promise<null | Ladder>;
    findLadderById(ladderId: number): Promise<null | Ladder>;
    findAllLadders(): Promise<Ladder[]>;

    /**
     * All members, active or not, with player.
     */
    findPlayers(ladderId: number): Promise<LadderPlayer[]>;

    /**
     * Running challenges (pending live, playing), with players and game.
     */
    findRunningChallenges(ladderId: number): Promise<LadderChallenge[]>;

    /**
     * Running challenges, and challenges ended since given date.
     */
    findRecentChallenges(ladderId: number, since: Date): Promise<LadderChallenge[]>;

    findChallengeByPublicId(publicId: string): Promise<null | LadderChallenge>;
    findChallengeByGamePublicId(gamePublicId: string): Promise<null | LadderChallenge>;

    /**
     * Challenges still running while their game is over (e.g. server restarted before result was applied).
     */
    findPlayingChallengesWithEndedGame(): Promise<LadderChallenge[]>;

    findPendingLiveChallenges(): Promise<LadderChallenge[]>;

    /**
     * Dates of strikes received by these players since a date.
     */
    findStrikeDates(ladderId: number, playerIds: number[], since: Date): Promise<{ [playerId: number]: Date[] }>;

    findCurrentReign(ladderId: number): Promise<null | LadderReign>;
    findReigns(ladderId: number): Promise<LadderReign[]>;

    /**
     * @param playerPublicId Only events where this player is player or otherPlayer
     */
    findEvents(ladderId: number, page: number, perPage: number, playerPublicId?: null | string): Promise<LadderEvent[]>;

    /**
     * Saves everything in a single transaction.
     */
    saveAll(entities: LadderEntity[]): Promise<void>;
}

@Service()
export default class LadderRepository implements LadderRepositoryInterface
{
    constructor(
        @Inject('Repository<Ladder>')
        private ladderRepository: Repository<Ladder>,

        @Inject('Repository<LadderPlayer>')
        private ladderPlayerRepository: Repository<LadderPlayer>,

        @Inject('Repository<LadderChallenge>')
        private ladderChallengeRepository: Repository<LadderChallenge>,

        @Inject('Repository<LadderReign>')
        private ladderReignRepository: Repository<LadderReign>,

        @Inject('Repository<LadderEvent>')
        private ladderEventRepository: Repository<LadderEvent>,
    ) {}

    async findLadderBySlug(slug: string): Promise<null | Ladder>
    {
        return await this.ladderRepository.findOneBy({ slug });
    }

    async findLadderById(ladderId: number): Promise<null | Ladder>
    {
        return await this.ladderRepository.findOneBy({ id: ladderId });
    }

    async findAllLadders(): Promise<Ladder[]>
    {
        return await this.ladderRepository.find();
    }

    async findPlayers(ladderId: number): Promise<LadderPlayer[]>
    {
        return await this.ladderPlayerRepository.find({
            relations: {
                player: {
                    currentRating: true,
                },
            },
            where: { ladderId },
        });
    }

    private readonly challengeRelations = {
        challenger: {
            currentRating: true,
        },
        defender: {
            currentRating: true,
        },
        game: true,
    };

    async findRunningChallenges(ladderId: number): Promise<LadderChallenge[]>
    {
        return await this.ladderChallengeRepository.find({
            relations: this.challengeRelations,
            where: {
                ladderId,
                state: In(['pending_live', 'playing']),
            },
            order: { createdAt: 'desc' },
        });
    }

    async findRecentChallenges(ladderId: number, since: Date): Promise<LadderChallenge[]>
    {
        return await this.ladderChallengeRepository.find({
            where: [
                { ladderId, state: In(['pending_live', 'playing']) },
                { ladderId, state: 'ended', endedAt: MoreThanOrEqual(since) },
            ],
        });
    }

    async findChallengeByPublicId(publicId: string): Promise<null | LadderChallenge>
    {
        return await this.ladderChallengeRepository.findOne({
            relations: { ...this.challengeRelations, ladder: true },
            where: { publicId },
        });
    }

    async findChallengeByGamePublicId(gamePublicId: string): Promise<null | LadderChallenge>
    {
        return await this.ladderChallengeRepository.findOne({
            relations: { ...this.challengeRelations, ladder: true },
            where: { game: { publicId: gamePublicId } },
        });
    }

    async findPlayingChallengesWithEndedGame(): Promise<LadderChallenge[]>
    {
        return await this.ladderChallengeRepository.find({
            relations: {
                ...this.challengeRelations,
                ladder: true,
                game: {
                    gameToPlayers: {
                        player: true,
                    },
                },
            },
            where: {
                state: 'playing',
                game: {
                    state: In(['ended', 'canceled']),
                },
            },
        });
    }

    async findPendingLiveChallenges(): Promise<LadderChallenge[]>
    {
        return await this.ladderChallengeRepository.find({
            relations: { ...this.challengeRelations, ladder: true },
            where: { state: 'pending_live' },
        });
    }

    async findStrikeDates(ladderId: number, playerIds: number[], since: Date): Promise<{ [playerId: number]: Date[] }>
    {
        const strikes: { [playerId: number]: Date[] } = {};

        if (playerIds.length === 0) {
            return strikes;
        }

        const challenges = await this.ladderChallengeRepository.find({
            select: { strikePlayerId: true, endedAt: true },
            where: {
                ladderId,
                strikePlayerId: In(playerIds),
                endedAt: MoreThanOrEqual(since),
            },
        });

        for (const { strikePlayerId, endedAt } of challenges) {
            if (strikePlayerId === null || endedAt === null) {
                continue;
            }

            (strikes[strikePlayerId] ??= []).push(endedAt);
        }

        return strikes;
    }

    async findCurrentReign(ladderId: number): Promise<null | LadderReign>
    {
        return await this.ladderReignRepository.findOne({
            relations: { player: true },
            where: { ladderId, endedAt: IsNull() },
        });
    }

    async findReigns(ladderId: number): Promise<LadderReign[]>
    {
        return await this.ladderReignRepository.find({
            relations: { player: true },
            where: { ladderId },
        });
    }

    async findEvents(ladderId: number, page: number, perPage: number, playerPublicId: null | string = null): Promise<LadderEvent[]>
    {
        return await this.ladderEventRepository.find({
            relations: {
                player: true,
                otherPlayer: true,
                challenge: {
                    game: true,
                },
            },
            where: playerPublicId === null
                ? { ladderId }
                : [
                    { ladderId, player: { publicId: playerPublicId } },
                    { ladderId, otherPlayer: { publicId: playerPublicId } },
                ],
            order: { createdAt: 'desc', id: 'desc' },
            skip: page * perPage,
            take: perPage,
        });
    }

    async saveAll(entities: LadderEntity[]): Promise<void>
    {
        await AppDataSource.transaction(async manager => {
            for (const entity of entities) {
                await manager.save(entity);
            }
        });
    }
}
