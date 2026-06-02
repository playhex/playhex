import { Player, PlayerAccountPassword } from '../../shared/app/models/index.js';
import { Inject, Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, checkPassword, InvalidPasswordError } from '../services/security/authentication.js';
import logger from '../services/logger.js';
import { checkPseudo, pseudoSlug } from '../../shared/app/pseudoUtils.js';
import { IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import { isDuplicateError } from './typeormUtils.js';
import SearchPlayersParameters from '../../shared/app/SearchPlayersParameters.js';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';

export class PseudoAlreadyTakenError extends Error {}
export class MustBeGuestError extends Error {}

@Service()
export default class PlayerRepository
{
    constructor(
        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,

        @Inject('Repository<PlayerAccountPassword>')
        private playerAccountPasswordRepository: Repository<PlayerAccountPassword>,
    ) {}

    async getPlayer(publicId: string): Promise<null | Player>
    {
        return await this.playerRepository.findOne({
            where: {
                publicId,
            },
        });
    }

    async getPlayerBySlug(slug: string): Promise<null | Player>
    {
        return await this.playerRepository.findOneBy({
            slug,
        });
    }

    async getAIPlayerBySlug(slug: string): Promise<null | Player>
    {
        return await this.playerRepository.findOneBy({
            slug,
            isBot: true,
        });
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

        try {
            const player = new Player();

            player.publicId = uuidv4();
            player.pseudo = pseudo;
            player.slug = pseudoSlug(pseudo);
            player.registeredAt = new Date();

            const playerAccountPassword = new PlayerAccountPassword();

            playerAccountPassword.player = player;
            playerAccountPassword.login = pseudo.trim();
            playerAccountPassword.password = await hashPassword(password);
            playerAccountPassword.createdAt = new Date();
            playerAccountPassword.updatedAt = new Date();

            await this.playerRepository.manager.transaction(async manager => {
                await manager.save(player);
                await manager.save(playerAccountPassword);
            });

            logger.info('Player created an account from anonymous', {
                oldPlayer: player,
                pseudo,
                upgradedPlayer: instanceToPlain(player), // do not log password hash
            });

            return player;
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }
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

        if (!checkPassword(playerAccountPassword, oldPassword)) {
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

        player.isGuest = false;
        player.pseudo = pseudo.trim();
        player.slug = pseudoSlug(pseudo);
        player.registeredAt = new Date();

        const playerAccountPassword = new PlayerAccountPassword();

        playerAccountPassword.player = player;
        playerAccountPassword.login = player.pseudo;
        playerAccountPassword.password = await hashPassword(password);
        playerAccountPassword.createdAt = new Date();
        playerAccountPassword.updatedAt = new Date();

        try {
            await this.playerRepository.manager.transaction(async manager => {
                await manager.save(player);
                await manager.save(playerAccountPassword);
            });

            logger.info('Player created an account from guest', {
                pseudo,
                upgradedPlayer: instanceToPlain(player), // do not log password hash
            });

            return player;
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }
    }

    /**
     * @returns Number of players shadow deleted (0 or 1)
     */
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
        await this.playerRepository.createQueryBuilder('player')
            .update()
            .where('publicId = :publicId', { publicId })
            .set({ avatarPath, avatarThumbnailPath, avatarUpdatedAt: new Date() })
            .execute()
        ;
    }

    async updateCountryFlag(publicId: string, countryFlag: string | null): Promise<void>
    {
        await this.playerRepository.createQueryBuilder('player')
            .update()
            .where('publicId = :publicId', { publicId })
            .set({ countryFlag })
            .execute()
        ;
    }

    async shadowBan(publicId: string): Promise<number | undefined>
    {
        const { affected } = await this.playerRepository.createQueryBuilder('player')
            .update()
            .where('publicId = :publicId', { publicId })
            .set({
                shadowBanned: true,
            })
            .execute()
        ;

        return affected;
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
