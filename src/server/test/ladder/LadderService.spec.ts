/* eslint-disable require-await, @typescript-eslint/require-await -- in memory fakes of async interfaces */
import assert from 'assert';
import { describe, it } from 'mocha';
import { Game, GameToPlayer, Ladder, LadderChallenge, LadderEvent, LadderPlayer, LadderReign, Player } from '../../../shared/app/models/index.js';
import LadderService from '../../ladder/LadderService.js';
import type { LadderEntity, LadderRepositoryInterface } from '../../ladder/LadderRepository.js';
import type { LadderGameCreatorInterface } from '../../ladder/LadderGameCreator.js';
import { defaultTimeControlTypes } from '../../../shared/app/timeControlUtils.js';
import { LadderRefusalError } from '../../ladder/LadderError.js';

const DAY = 86400000;

class InMemoryLadderRepository implements LadderRepositoryInterface
{
    players: LadderPlayer[] = [];
    challenges: LadderChallenge[] = [];
    reigns: LadderReign[] = [];
    events: LadderEvent[] = [];

    constructor(private ladder: Ladder) {}

    async findLadderBySlug() { return this.ladder; }
    async findLadderById() { return this.ladder; }
    async findAllLadders() { return [this.ladder]; }
    async findPlayers() { return this.players; }
    async findRunningChallenges() { return this.challenges.filter(c => c.state !== 'ended'); }
    async findRecentChallenges() { return this.challenges; }
    async findChallengeByPublicId(publicId: string) { return this.challenges.find(c => c.publicId === publicId) ?? null; }
    async findChallengeByGamePublicId(publicId: string) { return this.challenges.find(c => c.game?.publicId === publicId) ?? null; }
    async findPlayingChallengesWithEndedGame() { return []; }
    async findPendingLiveChallenges() { return this.challenges.filter(c => c.state === 'pending_live'); }
    async findCurrentReign() { return this.reigns.find(r => r.endedAt === null) ?? null; }
    async findReigns() { return this.reigns; }
    async findEvents() { return this.events; }

    async findStrikeDates(_: number, playerIds: number[], since: Date)
    {
        const strikes: { [playerId: number]: Date[] } = {};

        for (const c of this.challenges) {
            if (c.strikePlayerId !== null && playerIds.includes(c.strikePlayerId) && c.endedAt! >= since) {
                (strikes[c.strikePlayerId] ??= []).push(c.endedAt!);
            }
        }

        return strikes;
    }

    async saveAll(entities: LadderEntity[])
    {
        for (const entity of entities) {
            const list: LadderEntity[] = entity instanceof LadderPlayer ? this.players
                : entity instanceof LadderChallenge ? this.challenges
                    : entity instanceof LadderReign ? this.reigns
                        : this.events
            ;

            if (!list.includes(entity)) {
                list.push(entity);
            }
        }
    }
}

class FakeGameCreator implements LadderGameCreatorInterface
{
    games: Game[] = [];

    async createGame(_: Ladder, challenge: LadderChallenge): Promise<Game>
    {
        const game = new Game();

        game.publicId = `game-${this.games.length}`;
        game.state = 'playing';
        game.gameToPlayers = [challenge.challenger, challenge.defender].map((player, order) => {
            const gameToPlayer = new GameToPlayer();
            gameToPlayer.player = player;
            gameToPlayer.order = order;
            return gameToPlayer;
        });

        this.games.push(game);

        return game;
    }
}

const createLadder = (): Ladder => {
    const ladder = new Ladder();

    ladder.id = 1;
    ladder.slug = 'main';
    ladder.boardsizeMin = 11;
    ladder.boardsizeMax = 19;
    ladder.timeControlType = defaultTimeControlTypes.correspondenceFast;
    ladder.ranked = true;

    return ladder;
};

const createPlayer = (id: number): Player => {
    const player = new Player();

    player.id = id;
    player.publicId = `00000000-0000-4000-8000-00000000000${id}`;
    player.pseudo = `player${id}`;
    player.isGuest = false;
    player.isBot = false;
    player.createdAt = new Date(Date.now() - 30 * DAY);

    return player;
};

/**
 * All players active by default
 */
class FakeOnlinePlayersService
{
    inactivePlayerIds = new Set<string>();

    isActive(player: Player): boolean
    {
        return !this.inactivePlayerIds.has(player.publicId);
    }
}

const setup = async (playersCount: number) => {
    const ladder = createLadder();
    const repository = new InMemoryLadderRepository(ladder);
    const gameCreator = new FakeGameCreator();
    const onlinePlayersService = new FakeOnlinePlayersService();
    const service = new LadderService(repository, gameCreator, onlinePlayersService);
    const players: Player[] = [];

    for (let i = 1; i <= playersCount; ++i) {
        const player = createPlayer(i);
        players.push(player);
        await service.join(ladder, player);
    }

    const positions = () => players.map(p => repository.players.find(lp => lp.playerId === p.id)!.position);

    const endGame = async (game: Game, winnerOrder: 0 | 1, outcome: Game['outcome'] = 'path') => {
        game.state = 'ended';
        game.winner = winnerOrder;
        game.outcome = outcome;
        await service.onGameOver(game);
    };

    return { ladder, repository, gameCreator, onlinePlayersService, service, players, positions, endGame };
};

describe('LadderService', () => {
    it('joins at the bottom, first player becomes King', async () => {
        const { repository, positions } = await setup(3);

        assert.deepStrictEqual(positions(), [1, 2, 3]);
        assert.strictEqual(repository.reigns.length, 1);
        assert.strictEqual(repository.reigns[0].playerId, 1);
    });

    it('refuses to join twice', async () => {
        const { service, ladder, players } = await setup(1);

        await assert.rejects(service.join(ladder, players[0]), LadderRefusalError);
    });

    it('challenger wins and takes the seat, new King', async () => {
        const { service, ladder, players, positions, gameCreator, endGame, repository } = await setup(3);

        const challenge = await service.challenge(ladder, players[2], players[0].publicId, 13, null);

        assert.strictEqual(challenge.state, 'playing');
        assert.strictEqual(gameCreator.games.length, 1);

        await endGame(gameCreator.games[0], 0);

        assert.deepStrictEqual(positions(), [2, 3, 1]);
        assert.strictEqual(challenge.state, 'ended');
        assert.strictEqual(challenge.result, 'challenger_won');
        assert.strictEqual(repository.reigns.find(r => r.endedAt === null)?.playerId, 3);
    });

    it('applies result only once', async () => {
        const { service, ladder, players, positions, gameCreator, endGame } = await setup(3);

        await service.challenge(ladder, players[2], players[1].publicId, 13, null);
        await endGame(gameCreator.games[0], 0);
        await service.onGameOver(gameCreator.games[0]);

        assert.deepStrictEqual(positions(), [1, 3, 2]);
    });

    it('defender wins, King defense counted', async () => {
        const { service, ladder, players, positions, gameCreator, endGame, repository } = await setup(3);

        await service.challenge(ladder, players[1], players[0].publicId, 13, null);
        await endGame(gameCreator.games[0], 1);

        assert.deepStrictEqual(positions(), [1, 2, 3]);
        assert.strictEqual(repository.reigns[0].defenses, 1);
        assert.strictEqual(repository.players[0].currentDefenseStreak, 1);
    });

    it('refuses challenge out of rules', async () => {
        const { service, ladder, players } = await setup(3);

        await assert.rejects(service.challenge(ladder, players[0], players[1].publicId, 13, null), (e: LadderRefusalError) => e.reason === 'out_of_range');
        await assert.rejects(service.challenge(ladder, players[2], players[1].publicId, 9, null), (e: LadderRefusalError) => e.reason === 'invalid_boardsize');
    });

    it('timeout before second move: voided with strike, removed on second strike', async () => {
        const { service, ladder, players, positions, gameCreator, repository } = await setup(4);

        const cancel = async (game: Game, playerToMove: 0 | 1) => {
            game.state = 'canceled';
            game.cancelReason = null;
            game.currentPlayerIndex = playerToMove;
            await service.onGameOver(game);
        };

        await service.challenge(ladder, players[3], players[2].publicId, 13, null);
        await cancel(gameCreator.games[0], 1);

        assert.deepStrictEqual(positions(), [1, 2, 3, 4]);
        assert.strictEqual(repository.challenges[0].result, 'voided');
        assert.strictEqual(repository.challenges[0].strikePlayerId, 3);

        // Player 3 challenges the King, and times out before first move
        await service.challenge(ladder, players[2], players[0].publicId, 13, null);
        await cancel(gameCreator.games[1], 0);

        assert.deepStrictEqual(positions(), [1, 2, null, 3]);
        assert.strictEqual(repository.players[2].state, 'removed_strikes');
    });

    it('live proposal: no game until answered', async () => {
        const { service, ladder, players, gameCreator } = await setup(2);

        const challenge = await service.challenge(ladder, players[1], players[0].publicId, 13, defaultTimeControlTypes.normal, new Date());

        assert.strictEqual(challenge.state, 'pending_live');
        assert.strictEqual(gameCreator.games.length, 0);

        await assert.rejects(service.answerLiveProposal(challenge.publicId, players[1], true));

        await service.answerLiveProposal(challenge.publicId, players[0], true);

        assert.strictEqual(challenge.state, 'playing');
        assert.strictEqual(challenge.playedLive, true);
        assert.strictEqual(gameCreator.games.length, 1);
    });

    it('live proposal expires: correspondence game starts', async () => {
        const { service, ladder, players, gameCreator } = await setup(2);

        const challenge = await service.challenge(ladder, players[1], players[0].publicId, 13, defaultTimeControlTypes.normal, new Date(Date.now() - 2 * DAY));

        await service.startExpiredLiveProposals();

        assert.strictEqual(challenge.state, 'playing');
        assert.strictEqual(challenge.playedLive, false);
        assert.strictEqual(gameCreator.games.length, 1);
    });

    it('refuses live proposal to an inactive defender', async () => {
        const { service, ladder, players, onlinePlayersService, gameCreator } = await setup(2);

        onlinePlayersService.inactivePlayerIds.add(players[0].publicId);

        await assert.rejects(
            service.challenge(ladder, players[1], players[0].publicId, 13, defaultTimeControlTypes.normal),
            (e: LadderRefusalError) => e.reason === 'defender_not_active',
        );

        assert.strictEqual(gameCreator.games.length, 0);
    });

    it('refuses to accept live when challenger is not active anymore, but can decline', async () => {
        const { service, ladder, players, onlinePlayersService, gameCreator } = await setup(2);

        const challenge = await service.challenge(ladder, players[1], players[0].publicId, 13, defaultTimeControlTypes.normal);

        onlinePlayersService.inactivePlayerIds.add(players[1].publicId);

        await assert.rejects(
            service.answerLiveProposal(challenge.publicId, players[0], true),
            (e: LadderRefusalError) => e.reason === 'challenger_not_active',
        );

        assert.strictEqual(gameCreator.games.length, 0);

        await service.answerLiveProposal(challenge.publicId, players[0], false);

        assert.strictEqual(challenge.state, 'playing');
        assert.strictEqual(challenge.playedLive, false);
        assert.strictEqual(gameCreator.games.length, 1);
    });

    it('refuses to answer an expired live proposal', async () => {
        const { service, ladder, players, gameCreator } = await setup(2);

        const challenge = await service.challenge(ladder, players[1], players[0].publicId, 13, defaultTimeControlTypes.normal, new Date(Date.now() - 11 * 60 * 1000));

        await assert.rejects(service.answerLiveProposal(challenge.publicId, players[0], true));

        assert.strictEqual(gameCreator.games.length, 0);
    });

    it('refuses correspondence time control as live proposal', async () => {
        const { service, ladder, players } = await setup(2);

        await assert.rejects(
            service.challenge(ladder, players[1], players[0].publicId, 13, defaultTimeControlTypes.correspondenceFast),
            (e: LadderRefusalError) => e.reason === 'live_time_control_not_live',
        );
    });

    it('leave moves up players below, King leaving makes new King', async () => {
        const { service, ladder, players, positions, repository } = await setup(3);

        await service.leave(ladder, players[0]);

        assert.deepStrictEqual(positions(), [null, 1, 2]);
        assert.strictEqual(repository.reigns.find(r => r.endedAt === null)?.playerId, 2);
    });
});
