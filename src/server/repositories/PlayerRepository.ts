import Player from '../../shared/app/models/Player';
import { Inject, Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, checkPassword, InvalidPasswordError } from '../services/security/authentication';
import logger from '../services/logger';
import { checkPseudo, pseudoSlug } from '../../shared/app/pseudoUtils';
import HandledError from '../../shared/app/Errors';
import { QueryFailedError, Repository } from 'typeorm';
import { isDuplicateError } from './typeormUtils';
import SearchPlayersParameters from '@shared/app/SearchPlayersParameters';

export class PseudoAlreadyTakenError extends HandledError {}
export class MustBeGuestError extends HandledError {}

@Service()
export default class PlayerRepository
{
    constructor(
        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) {}

    async getPlayer(publicId: string): Promise<null | Player>
    {
        return await this.playerRepository.findOne({
            where: {
                publicId,
            },
            cache: 30000,
        });
    }

    async getPlayerBySlug(slug: string): Promise<null | Player>
    {
        return this.playerRepository.findOneBy({
            slug,
        });
    }

    async getAIPlayerBySlug(slug: string): Promise<null | Player>
    {
        return this.playerRepository.findOneBy({
            slug,
            isBot: true,
        });
    }

    async searchPlayers(params: SearchPlayersParameters): Promise<Player[]>
    {
        const queryBuilder = this.playerRepository.createQueryBuilder('player')
            .take(10)
        ;

        if (undefined !== params.nicknameLike) {
            queryBuilder
                .andWhere(`(
                    player.pseudo like :nicknameLike
                    or player.slug like :nicknameLike
                )`)
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

        return queryBuilder.getMany();
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
     */
    async createPlayer(pseudo: string, password: string): Promise<Player>
    {
        checkPseudo(pseudo);

        try {
            const player = new Player();

            player.publicId = uuidv4();
            player.pseudo = pseudo;
            player.slug = pseudoSlug(pseudo);
            player.password = await hashPassword(password);

            await this.playerRepository.save(player);

            return player;
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }
    }

    /** @throws {InvalidPasswordError} */
    async changePassword(publicId: string, oldPassword: string, newPassword: string): Promise<Player> {
        const player = await this.playerRepository.findOne({
            where: {
                publicId,
            },
        });

        if (player === null) {
            logger.error(`Player with id ${publicId} doesn't exist`);
            throw new Error('Cannot find player id');
        }
        if (!checkPassword(player, oldPassword)) {
            throw new InvalidPasswordError();
        }
        player.password = await hashPassword(newPassword);
        return await this.playerRepository.save(player);
    }

    /**
     * @throws {MustBeGuestError}
     * @throws {PseudoAlreadyTakenError}
     * @throws {PseudoTooShortError}
     * @throws {PseudoTooLongError}
     */
    async upgradeGuest(publicId: string, pseudo: string, password: string): Promise<Player>
    {
        checkPseudo(pseudo);

        const player = await this.getPlayer(publicId);

        if (null === player) {
            // Should not happen: a session linked to a non-existing player
            throw new Error('Player not found');
        }

        if (!player.isGuest) {
            throw new MustBeGuestError();
        }

        // Do not mutate current in-memory player until upgraded successfully
        const upgradedPlayer = new Player();
        Object.assign(upgradedPlayer, player);

        upgradedPlayer.isGuest = false;
        upgradedPlayer.pseudo = pseudo;
        upgradedPlayer.slug = pseudoSlug(pseudo);
        upgradedPlayer.password = await hashPassword(password);
        upgradedPlayer.createdAt = new Date();

        try {
            return await this.playerRepository.save(upgradedPlayer);
        } catch (e) {
            if (isDuplicateError(e)) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }
    }

    async shadowBan(publicId: string)
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
}
