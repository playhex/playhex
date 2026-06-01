import { Player, PlayerAccountPassword } from '../../../shared/app/models/index.js';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../data-source.js';

export class PseudoNotExistingError extends Error {}
export class InvalidPasswordError extends Error {}

export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt();

    return bcrypt.hash(password, salt);
};

export const checkPassword = (playerAccountPassword: PlayerAccountPassword | null, password: string): boolean => {
    if (!playerAccountPassword?.password) {
        return false;
    }

    return bcrypt.compareSync(password, playerAccountPassword.password);
};

/**
 * @throws {PseudoNotExistingError}
 * @throws {InvalidPasswordError}
 */
export const authenticate = async (pseudo: string, password: string): Promise<Player> => {
    const playerRepository = AppDataSource.getRepository(Player);
    const playerAccountPasswordRepository = AppDataSource.getRepository(PlayerAccountPassword);

    const player = await playerRepository.findOne({
        where: {
            pseudo,
        },
    });

    if (player === null) {
        throw new PseudoNotExistingError();
    }

    const playerAccountPassword = await playerAccountPasswordRepository.findOneBy({
        playerId: player.id,
    });

    if (!checkPassword(playerAccountPassword, password)) {
        throw new InvalidPasswordError();
    }

    return player;
};
