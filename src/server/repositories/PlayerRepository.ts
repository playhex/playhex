import { Player, PlayerAccountDiscord, PlayerAccountPassword, PlayerPseudoHistory } from '../../shared/app/models/index.js';
import { Inject, Service } from 'typedi';
import { v4 as uuidv4, validate as isUuid } from 'uuid';
import { hashPassword, checkPassword, InvalidPasswordError } from '../services/security/authentication.js';
import logger from '../services/logger.js';
import { checkPseudo, pseudoSlug, validatePseudo } from '../../shared/app/pseudoUtils.js';
import { EntityManager, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import { isDuplicateError } from './typeormUtils.js';
import SearchPlayersParameters from '../../shared/app/SearchPlayersParameters.js';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';
import PlayerIdentityMap from '../identity-map/PlayerIdentityMap.js';
import { getCurrentPseudoStartedAt, getNextPseudoChangeAllowedAt, type PseudoPeriod } from '../../shared/app/pseudoHistoryRules.js';
import { throwDiscordAlreadyLinkedOnDuplicate } from './PlayerAccountRepository.js';

export class PseudoAlreadyTakenError extends Error {}
export class MustBeGuestError extends Error {}
export class MustNotBeGuestError extends Error {}
export class SamePseudoError extends Error {}

export class PseudoChangeLimitReachedError extends Error
{
    constructor(
        public nextAllowedAt: Date,
    ) {
        super('Pseudo change limit reached');
    }
}

/**
 * Discord account to link to a player created from Discord.
 */
export type DiscordAccountToLink = {
    discordId: string;
    discordUsername: string;
};

@Service()
export default class PlayerRepository
{
    constructor(
        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,

        @Inject('Repository<PlayerAccountPassword>')
        private playerAccountPasswordRepository: Repository<PlayerAccountPassword>,

        @Inject('Repository<PlayerPseudoHistory>')
        private playerPseudoHistoryRepository: Repository<PlayerPseudoHistory>,

        private playerIdentityMap: PlayerIdentityMap,
    ) {}

    /**
     * Make sure we always use a same instance for a same player,
     * so a player updated somewhere is updated everywhere.
     */
    private resolveInstance(player: null | Player): null | Player
    {
        if (player === null) {
            return null;
        }

        return this.playerIdentityMap.resolve(player);
    }

    async getPlayer(publicId: string): Promise<null | Player>
    {
        return this.resolveInstance(await this.playerRepository.findOne({
            where: {
                publicId,
            },
        }));
    }

    async getPlayerBySlug(slug: string): Promise<null | Player>
    {
        return this.resolveInstance(await this.playerRepository.findOneBy({
            slug,
        }));
    }

    async getAIPlayerBySlug(slug: string): Promise<null | Player>
    {
        return this.resolveInstance(await this.playerRepository.findOneBy({
            slug,
            isBot: true,
        }));
    }

    /**
     * Finds a player from a single identifier that can be either
     * its numeric id, its publicId (uuid), or its slug.
     */
    async getPlayerByIdPublicIdOrSlug(identifier: number | string): Promise<null | Player>
    {
        if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
            return this.resolveInstance(await this.playerRepository.findOneBy({ id: Number(identifier) }));
        }

        if (isUuid(identifier)) {
            return await this.getPlayer(identifier);
        }

        return await this.getPlayerBySlug(identifier);
    }

    async searchPlayers(params: SearchPlayersParameters): Promise<Player[]>
    {
        const queryBuilder = this.playerRepository.createQueryBuilder('player')
            .take(Math.min(params.limit ?? 10, 10))
        ;

        if (undefined !== params.nicknameLike) {
            queryBuilder
                .andWhere('player.pseudo like :nicknameLike')
                .setParameter('nicknameLike', params.nicknameLike + '%')
            ;
        }

        if (undefined !== params.isBot) {
            queryBuilder
                .andWhere('player.isBot = :isBot')
                .setParameter('isBot', params.isBot)
            ;
        }

        if (undefined !== params.isGuest) {
            queryBuilder
                .andWhere('player.isGuest = :isGuest')
                .setParameter('isGuest', params.isGuest)
            ;
        }

        return await queryBuilder.getMany();
    }

    async createGuest(): Promise<Player>
    {
        let exponent = 3;

        while (exponent < 12) {
            try {
                const player = new Player();

                player.pseudo = String(10 ** exponent + Math.floor(Math.random() * 9 * (10 ** exponent)));
                player.publicId = uuidv4();
                player.slug = pseudoSlug(player.pseudo);
                player.isGuest = true;

                await this.playerRepository.save(player);

                return player;
            } catch (e) {
                if (e instanceof QueryFailedError && e.message.includes('Duplicate entry')) {
                    ++exponent;
                    continue;
                }

                throw e;
            }
        }

        logger.error('Unable to create a guest');
        throw new Error('Unable to create a guest');
    }

    /**
     * @throws {PseudoAlreadyTakenError}
     * @throws {PseudoTooShortError}
     * @throws {PseudoTooLongError}
     * @throws {InvalidPseudoError}
     */
    async createPlayer(pseudo: string, password: string): Promise<Player>
    {
        checkPseudo(pseudo);

        const player = await this.registerAccount(null, pseudo.trim(), await hashPassword(password));

        logger.info('Player created an account from anonymous', {
            pseudo,
            upgradedPlayer: instanceToPlain(player), // do not log password hash
        });

        return player;
    }

    /**
     * Creates an account, or upgrades a guest, with a linked Discord account and no password.
     * If pseudo is already taken, a suffix is added ("pseudo-2", "pseudo-3", ...).
     *
     * @param guest Guest to upgrade, or null to create a new player.
     * @param pseudoCandidates Pseudos to try, in order, before adding suffixes. Invalid ones are skipped.
     *
     * @throws {MustBeGuestError}
     * @throws {DiscordAlreadyLinkedError} If this Discord account has been linked meanwhile
     */
    async createPlayerFromDiscord(guest: null | Player, pseudoCandidates: string[], discordAccount: DiscordAccountToLink): Promise<Player>
    {
        if (guest !== null && !guest.isGuest) {
            throw new MustBeGuestError();
        }

        const linkDiscord = async (manager: EntityManager, player: Player) => {
            const playerAccountDiscord = new PlayerAccountDiscord();

            playerAccountDiscord.player = player;
            playerAccountDiscord.discordId = discordAccount.discordId;
            playerAccountDiscord.discordUsername = discordAccount.discordUsername;
            playerAccountDiscord.createdAt = new Date();

            // Must not be caught as PseudoAlreadyTakenError, else would retry all pseudo suffixes
            await throwDiscordAlreadyLinkedOnDuplicate(manager.save(playerAccountDiscord));
        };

        for (const pseudo of generatePseudoCandidates(pseudoCandidates)) {
            try {
                const player = await this.registerAccount(guest, pseudo, null, linkDiscord);

                logger.info('Player created an account from Discord', {
                    pseudo,
                    fromGuest: guest !== null,
                    discordId: discordAccount.discordId,
                    upgradedPlayer: instanceToPlain(player),
                });

                return player;
            } catch (e) {
                if (e instanceof PseudoAlreadyTakenError) {
                    continue;
                }

                throw e;
            }
        }

        throw new Error('Unable to find an available pseudo to create account from Discord');
    }

    /**
     * Create a new player, or upgrade a guest, with its PlayerAccountPassword.
     * Pseudo must have been checked before.
     *
     * @param guest Guest to upgrade, or null to create a new player
     * @param hashedPassword Null to create an account without password, i.e created from Discord
     * @param extra Callback to save more entities in the same transaction
     *
     * @throws {PseudoAlreadyTakenError}
     */
    private async registerAccount(
        guest: null | Player,
        pseudo: string,
        hashedPassword: null | string,
        extra?: (manager: EntityManager, player: Player) => Promise<void>,
    ): Promise<Player>
    {
        // Do not mutate guest instance before saving: it is shared (identity map),
        // and could be reverted by a concurrent getPlayer() while awaiting.
        const upgrade = {
            isGuest: false,
            pseudo,
            slug: pseudoSlug(pseudo),
            registeredAt: new Date(),
        };

        let player: Player;

        if (guest === null) {
            player = new Player();
            player.publicId = uuidv4();
            Object.assign(player, upgrade);
        } else {
            player = guest;
        }

        const playerAccountPassword = new PlayerAccountPassword();

        playerAccountPassword.player = player;
        playerAccountPassword.login = pseudo;
        playerAccountPassword.password = hashedPassword;
        playerAccountPassword.createdAt = new Date();
        playerAccountPassword.updatedAt = new Date();

        try {
            await this.playerRepository.manager.transaction(async manager => {
                if (guest === null) {
                    await manager.save(player);
                } else {
                    await manager.createQueryBuilder(Player, 'player')
                        .update()
                        .where('publicId = :publicId', { publicId: guest.publicId })
                        .set(upgrade)
                        .execute()
                    ;
                }

                await manager.save(playerAccountPassword);

                if (extra) {
                    await extra(manager, player);
                }
            });
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }

        if (guest !== null) {
            Object.assign(guest, upgrade);
        }

        return player;
    }

    /**
     * @throws {InvalidPasswordError}
     */
    async changePassword(publicId: string, oldPassword: string, newPassword: string): Promise<Player>
    {
        const player = await this.playerRepository.findOne({
            where: {
                publicId,
            },
        });

        if (player === null) {
            logger.error(`Player with id ${publicId} doesn't exist`);
            throw new Error('Cannot find player id');
        }

        const playerAccountPassword = await this.playerAccountPasswordRepository.findOneBy({
            playerId: player.id,
        });

        if (!playerAccountPassword) {
            throw new Error('Unexpected null playerAccountPassword');
        }

        // Account created from Discord has no password yet: allow to set one
        if (playerAccountPassword.password && !checkPassword(playerAccountPassword, oldPassword)) {
            throw new InvalidPasswordError();
        }

        playerAccountPassword.password = await hashPassword(newPassword);
        playerAccountPassword.updatedAt = new Date();

        logger.info('Player is changing password', { playerPublicId: publicId });

        await this.playerAccountPasswordRepository.save(playerAccountPassword);

        return player;
    }

    /**
     * @throws {MustBeGuestError}
     * @throws {PseudoAlreadyTakenError}
     * @throws {PseudoTooShortError}
     * @throws {PseudoTooLongError}
     * @throws {InvalidPseudoError}
     */
    async upgradeGuest(publicId: string, pseudo: string, password: string): Promise<Player>
    {
        checkPseudo(pseudo);

        const player = await this.getPlayer(publicId);

        if (player === null) {
            // Should not happen: a session linked to a non-existing player
            throw new Error('Player not found');
        }

        if (!player.isGuest) {
            throw new MustBeGuestError();
        }

        await this.registerAccount(player, pseudo.trim(), await hashPassword(password));

        logger.info('Player created an account from guest', {
            pseudo,
            upgradedPlayer: instanceToPlain(player), // do not log password hash
        });

        return player;
    }

    async getPseudoHistory(playerId: number): Promise<PseudoPeriod[]>
    {
        return await this.playerPseudoHistoryRepository.find({
            where: { playerId },
            order: { endedAt: 'desc' },
        });
    }

    /**
     * Get player who used this slug, the most recently.
     * Used to redirect old profile urls.
     */
    async getPlayerByOldSlug(slug: string): Promise<null | Player>
    {
        const lastPeriod = await this.playerPseudoHistoryRepository.findOne({
            where: { slug },
            order: { endedAt: 'desc' },
        });

        if (lastPeriod === null) {
            return null;
        }

        return this.resolveInstance(await this.playerRepository.findOneBy({ id: lastPeriod.playerId }));
    }

    /**
     * Player changes its own pseudo.
     * Old pseudo is kept in history, and login follows new pseudo.
     *
     * @throws {MustNotBeGuestError}
     * @throws {SamePseudoError}
     * @throws {PseudoChangeLimitReachedError}
     * @throws {PseudoAlreadyTakenError}
     * @throws {PseudoTooShortError}
     * @throws {PseudoTooLongError}
     * @throws {InvalidPseudoError}
     */
    async changePseudo(player: Player, newPseudo: string): Promise<Player>
    {
        newPseudo = newPseudo.trim();

        checkPseudo(newPseudo);

        if (player.isGuest || !player.id) {
            throw new MustNotBeGuestError();
        }

        if (newPseudo === player.pseudo) {
            throw new SamePseudoError();
        }

        const now = new Date();
        const history = await this.getPseudoHistory(player.id);
        const nextAllowedAt = getNextPseudoChangeAllowedAt(history, now);

        if (nextAllowedAt !== null) {
            throw new PseudoChangeLimitReachedError(nextAllowedAt);
        }

        const oldPeriod = new PlayerPseudoHistory();

        oldPeriod.playerId = player.id;
        oldPeriod.pseudo = player.pseudo;
        oldPeriod.slug = player.slug;
        oldPeriod.startedAt = getCurrentPseudoStartedAt(history, player.registeredAt ?? player.createdAt);
        oldPeriod.endedAt = now;

        const update = {
            pseudo: newPseudo,
            slug: pseudoSlug(newPseudo),
        };

        try {
            await this.playerRepository.manager.transaction(async manager => {
                await manager.save(oldPeriod);

                await manager.createQueryBuilder(Player, 'player')
                    .update()
                    .where('id = :id', { id: player.id })
                    .set(update)
                    .execute()
                ;

                await manager.createQueryBuilder(PlayerAccountPassword, 'playerAccountPassword')
                    .update()
                    .where('playerId = :playerId', { playerId: player.id })
                    .set({ login: newPseudo })
                    .execute()
                ;
            });
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }

        // Update player instance kept in memory, i.e in games already created
        Object.assign(this.playerIdentityMap.get(player.publicId) ?? player, update);

        logger.info('Player changed pseudo', {
            playerPublicId: player.publicId,
            oldPseudo: oldPeriod.pseudo,
            newPseudo,
        });

        return player;
    }

    async getLastRegisteredPlayers(limit: number): Promise<Player[]>
    {
        return await this.playerRepository.find({
            where: { isGuest: false, isBot: false },
            order: { registeredAt: 'desc' },
            take: limit,
        });
    }

    async getLastAvatarUploads(limit: number): Promise<Player[]>
    {
        return await this.playerRepository.find({
            where: { avatarUpdatedAt: Not(IsNull()) },
            order: { avatarUpdatedAt: 'desc' },
            take: limit,
        });
    }

    async updateAvatar(publicId: string, avatarPath: string, avatarThumbnailPath: string): Promise<void>
    {
        const avatarUpdatedAt = new Date();

        await this.playerRepository.createQueryBuilder('player')
            .update()
            .where('publicId = :publicId', { publicId })
            .set({ avatarPath, avatarThumbnailPath, avatarUpdatedAt })
            .execute()
        ;

        // Update player instance kept in memory, i.e in games already created
        Object.assign(this.playerIdentityMap.get(publicId) ?? {}, { avatarPath, avatarThumbnailPath, avatarUpdatedAt });
    }

    async updatePronouns(publicId: string, pronouns: Player['pronouns']): Promise<void>
    {
        await this.playerRepository.createQueryBuilder('player')
            .update()
            .where('publicId = :publicId', { publicId })
            .set({ pronouns })
            .execute()
        ;

        Object.assign(this.playerIdentityMap.get(publicId) ?? {}, { pronouns });
    }

    async updateCountryFlag(publicId: string, countryFlag: string | null): Promise<void>
    {
        await this.playerRepository.createQueryBuilder('player')
            .update()
            .where('publicId = :publicId', { publicId })
            .set({ countryFlag })
            .execute()
        ;

        // Update player instance kept in memory, i.e in games already created
        Object.assign(this.playerIdentityMap.get(publicId) ?? {}, { countryFlag });
    }

    async moderateNickname(player: Player): Promise<void>
    {
        let exponent = 2;

        while (exponent < 12) {
            try {
                const number = String(10 ** exponent + Math.floor(Math.random() * 9 * (10 ** exponent)));
                player.pseudo = `moderated ${number}`;
                player.slug = pseudoSlug(player.pseudo);
                await this.playerRepository.save(player);
                return;
            } catch (e) {
                if (e instanceof QueryFailedError && e.message.includes('Duplicate entry')) {
                    ++exponent;
                    continue;
                }

                throw e;
            }
        }

        logger.error('Unable to moderate nickname');
        throw new Error('Unable to moderate nickname');
    }
}

/**
 * Yields pseudo candidates to create an account,
 * skipping invalid ones, and adding suffix if all are taken.
 */
function* generatePseudoCandidates(bases: string[]): Generator<string>
{
    const validBases = bases
        .map(base => base.trim().substring(0, 32).trim())
        .filter(base => validatePseudo(base))
    ;

    if (validBases.length === 0) {
        validBases.push('player');
    }

    yield* validBases;

    const base = validBases[0];

    for (let i = 2; i < 100; ++i) {
        const suffix = `-${i}`;

        yield base.substring(0, 32 - suffix.length) + suffix;
    }
}
