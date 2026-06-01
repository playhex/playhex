import { Player, PlayerAccountPassword } from '../../../shared/app/models/index.js';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../data-source.js';

export class LoginNotExistingError extends Error {}
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
 * @throws {LoginNotExistingError}
 * @throws {InvalidPasswordError}
 */
export const authenticate = async (login: string, password: string): Promise<Player> => {
    const playerAccountPasswordRepository = AppDataSource.getRepository(PlayerAccountPassword);

    const playerAccountPassword = await playerAccountPasswordRepository.findOne({
        where: { login },
        relations: { player: true },
        select: { player: true },
    });

    if (playerAccountPassword === null) {
        throw new LoginNotExistingError();
    }

    if (!checkPassword(playerAccountPassword, password)) {
        throw new InvalidPasswordError();
    }

    return playerAccountPassword.player;
};
