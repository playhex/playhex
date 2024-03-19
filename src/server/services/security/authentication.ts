import Player from '../../../shared/app/models/Player';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import HandledError from '../../../shared/app/Errors';
import { plainToInstance } from 'class-transformer';

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
    const playerObject = await prisma.player.findUnique({
        where: {
            pseudo,
        },
    });

    const player = plainToInstance(Player, playerObject);

    if (null === player) {
        throw new PseudoNotExistingError();
    }

    if (!checkPassword(player, password)) {
        throw new InvalidPasswordError();
    }

    player.password = undefined;

    return player;
};
