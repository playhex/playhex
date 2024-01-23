import { PlayerData } from '@shared/app/Types';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { Player } from '@prisma/client';
import HandledError from '../../../shared/app/Errors';

export class PseudoNotExistingError extends HandledError {}
export class InvalidPasswordError extends HandledError {}

export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt();

    return bcrypt.hash(password, salt);
};

export const checkPassword = (player: Player, password: string): boolean => {
    if (null === player.password) {
        return false;
    }

    return bcrypt.compareSync(password, player.password);
};

/**
 * @throws {PseudoNotExistingError}
 * @throws {InvalidPasswordError}
 */
export const authenticate = async (pseudo: string, password: string): Promise<PlayerData> => {
    const player = await prisma.player.findUnique({
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

    player.password = null;

    return player;
};
