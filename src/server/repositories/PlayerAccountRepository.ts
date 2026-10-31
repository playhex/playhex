import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Player, PlayerAccountDiscord, PlayerAccountEmail, PlayerAccountPassword } from '../../shared/app/models/index.js';
import { isDuplicateError } from './typeormUtils.js';
import PlayerIdentityMap from '../identity-map/PlayerIdentityMap.js';

export class DiscordAlreadyLinkedError extends Error {}
export class MustSetPasswordFirstError extends Error {}

/**
 * Private account data of a player: login, email, linked Discord account.
 * Never exposed with Player, only to the player itself.
 */
@Service()
export default class PlayerAccountRepository
{
    constructor(
        @Inject('Repository<PlayerAccountPassword>')
        private playerAccountPasswordRepository: Repository<PlayerAccountPassword>,

        @Inject('Repository<PlayerAccountEmail>')
        private playerAccountEmailRepository: Repository<PlayerAccountEmail>,

        @Inject('Repository<PlayerAccountDiscord>')
        private playerAccountDiscordRepository: Repository<PlayerAccountDiscord>,

        private playerIdentityMap: PlayerIdentityMap,
    ) {}

    async getPassword(playerId: number): Promise<null | PlayerAccountPassword>
    {
        return await this.playerAccountPasswordRepository.findOneBy({ playerId });
    }

    async getEmail(playerId: number): Promise<null | PlayerAccountEmail>
    {
        return await this.playerAccountEmailRepository.findOneBy({ playerId });
    }

    async setEmail(playerId: number, email: string): Promise<PlayerAccountEmail>
    {
        let playerAccountEmail = await this.getEmail(playerId);

        if (playerAccountEmail === null) {
            playerAccountEmail = new PlayerAccountEmail();
            playerAccountEmail.playerId = playerId;
            playerAccountEmail.createdAt = new Date();
        }

        playerAccountEmail.email = email;
        playerAccountEmail.updatedAt = new Date();

        return await this.playerAccountEmailRepository.save(playerAccountEmail);
    }

    async deleteEmail(playerId: number): Promise<void>
    {
        await this.playerAccountEmailRepository.delete({ playerId });
    }

    async getDiscord(playerId: number): Promise<null | PlayerAccountDiscord>
    {
        return await this.playerAccountDiscordRepository.findOneBy({ playerId });
    }

    /**
     * Get player linked to this Discord account, if any.
     */
    async getPlayerByDiscordId(discordId: string): Promise<null | Player>
    {
        const playerAccountDiscord = await this.playerAccountDiscordRepository.findOne({
            where: { discordId },
            relations: { player: true },
        });

        if (!playerAccountDiscord) {
            return null;
        }

        return this.playerIdentityMap.resolve(playerAccountDiscord.player);
    }

    /**
     * @throws {DiscordAlreadyLinkedError} If this Discord account is linked to another player, or player has already a Discord account linked
     */
    async linkDiscord(playerId: number, discordId: string, discordUsername: string): Promise<PlayerAccountDiscord>
    {
        const values = {
            playerId,
            discordId,
            discordUsername,
            createdAt: new Date(),
        };

        await throwDiscordAlreadyLinkedOnDuplicate(this.playerAccountDiscordRepository.insert(values));

        return Object.assign(new PlayerAccountDiscord(), values);
    }

    /**
     * @throws {MustSetPasswordFirstError} If player has no password: would not be able to log in anymore.
     */
    async unlinkDiscord(playerId: number): Promise<void>
    {
        const playerAccountPassword = await this.getPassword(playerId);

        if (!playerAccountPassword?.password) {
            throw new MustSetPasswordFirstError();
        }

        await this.playerAccountDiscordRepository.delete({ playerId });
    }
}

/**
 * Converts a duplicate error on player_account_discord (discordId or playerId)
 * to DiscordAlreadyLinkedError.
 *
 * @throws {DiscordAlreadyLinkedError}
 */
export const throwDiscordAlreadyLinkedOnDuplicate = async <T>(promise: Promise<T>): Promise<T> => {
    try {
        return await promise;
    } catch (e) {
        if (isDuplicateError(e)) {
            throw new DiscordAlreadyLinkedError();
        }

        throw e;
    }
};
