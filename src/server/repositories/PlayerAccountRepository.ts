import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerAccountEmail, PlayerAccountPassword } from '../../shared/app/models/index.js';

/**
 * Private account data of a player: login, email.
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
}
