import Player from '../../shared/app/models/Player';
import { Inject, Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, checkPassword, InvalidPasswordError } from '../services/security/authentication';
import logger from '../services/logger';
import { checkPseudo, pseudoSlug } from '../../shared/app/pseudoUtils';
import HandledError from '../../shared/app/Errors';
import { FindOptionsSelect, QueryFailedError, Repository } from 'typeorm';

export class PseudoAlreadyTakenError extends HandledError {}
export class MustBeGuestError extends HandledError {}

@Service()
export default class PlayerRepository
{
    /**
     * Cached players indexed by publicId
     */
    private playersCache: { [key: string]: Player } = {};

    constructor(
        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) {}

    async getPlayer(publicId: string): Promise<null | Player>
    {
        if (this.playersCache[publicId]) {
            return this.playersCache[publicId];
        }

        const player = await this.playerRepository.findOneBy({
            publicId,
        });

        if (null !== player) {
            this.playersCache[publicId] = player;
        }

        return player;
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

                return this.playersCache[player.publicId] = player;
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

            return this.playersCache[player.publicId] = player;
        } catch (e) {
            if (e instanceof QueryFailedError && e.message.includes('ER_DUP_ENTRY')) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }
    }

    /** @throws {InvalidPasswordError} */
    async changePassword(publicId: string, oldPassword: string, newPassword: string): Promise<Player> {
        const player = await this.playerRepository.findOne({
            select: this.allColumnWithPassword(),
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
        return this.playersCache[publicId] = await this.playerRepository.save(player);
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

        player.isGuest = false;
        player.pseudo = pseudo;
        player.slug = pseudoSlug(pseudo);
        player.password = await hashPassword(password);
        player.createdAt = new Date();

        try {
            return this.playersCache[publicId] = await this.playerRepository.save(player);
        } catch (e) {
            if (e instanceof QueryFailedError && e.message.includes('ER_DUP_ENTRY')) {
                throw new PseudoAlreadyTakenError();
            }

            throw e;
        }
    }

    /**
     * By default, player password column is not selected in database queries.
     * To force select password, use:
     *  {
     *      select: allColumnWithPassword(),
     *  },
     *  where: { where: ... }
     */
    allColumnWithPassword(): FindOptionsSelect<Player>
    {
        const allColumnsWithPassword: FindOptionsSelect<Player> = {};

        this.playerRepository.metadata.columns.forEach(column => {
            allColumnsWithPassword[column.propertyName as keyof Player] = true;
        });

        return allColumnsWithPassword;
    }
}
