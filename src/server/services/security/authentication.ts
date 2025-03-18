import Player from '../../../shared/app/models/Player.js';
import bcrypt from 'bcryptjs';
import HandledError from '../../../shared/app/Errors.js';
import { AppDataSource } from '../../data-source.js';

export class PseudoNotExistingError extends HandledError {}
export class InvalidPasswordError extends HandledError {}

export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt();

    return bcrypt.hash(password, salt);
};

export const checkPassword = (player: Player, password: string): boolean => {
    if (!player.password) {
        return false;
    }

    return bcrypt.compareSync(password, player.password);
};

/**
 * @throws {PseudoNotExistingError}
 * @throws {InvalidPasswordError}
 */
export const authenticate = async (pseudo: string, password: string): Promise<Player> => {
    const playerRepository = AppDataSource.getRepository(Player);

    const player = await playerRepository.findOne({
        where: {
            pseudo,
        },
    });

    if (null === player) {
        throw new PseudoNotExistingError();
    }

    if (!checkPassword(player, password)) {
        throw new InvalidPasswordError();
    }

    return player;
};
