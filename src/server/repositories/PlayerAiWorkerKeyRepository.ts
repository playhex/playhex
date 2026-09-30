import { randomInt } from 'node:crypto';
import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerAiWorkerKey } from '../../shared/app/models/index.js';

const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const KEY_LENGTH = 32;

/**
 * Do not update lastSeenAt in database on every worker request.
 */
const LAST_SEEN_UPDATE_INTERVAL_MS = 60_000;

export const generateAiWorkerKey = (): string => {
    let key = '';

    for (let i = 0; i < KEY_LENGTH; ++i) {
        key += KEY_CHARS[randomInt(KEY_CHARS.length)];
    }

    return key;
};

@Service()
export default class PlayerAiWorkerKeyRepository
{
    constructor(
        @Inject('Repository<PlayerAiWorkerKey>')
        private playerAiWorkerKeyRepository: Repository<PlayerAiWorkerKey>,
    ) {}

    async findEnabledByKey(key: string): Promise<null | PlayerAiWorkerKey>
    {
        return await this.playerAiWorkerKeyRepository.findOneBy({
            key,
            enabled: true,
        });
    }

    async findByPlayerId(playerId: number): Promise<PlayerAiWorkerKey[]>
    {
        return await this.playerAiWorkerKeyRepository.find({
            where: { playerId },
            order: { createdAt: 'asc' },
        });
    }

    async findAll(): Promise<PlayerAiWorkerKey[]>
    {
        return await this.playerAiWorkerKeyRepository.find({
            relations: { player: true },
            order: { createdAt: 'asc' },
        });
    }

    /**
     * Creates a new key for a player.
     * Name defaults to "default", and is suffixed ("default-2", "default-3"...)
     * if player already has a key with this name.
     */
    async createKey(playerId: number, name = 'default'): Promise<PlayerAiWorkerKey>
    {
        const existingNames = new Set((await this.findByPlayerId(playerId)).map(key => key.name));
        let uniqueName = name;

        for (let n = 2; existingNames.has(uniqueName); ++n) {
            uniqueName = `${name}-${n}`;
        }

        const playerAiWorkerKey = new PlayerAiWorkerKey();

        playerAiWorkerKey.playerId = playerId;
        playerAiWorkerKey.name = uniqueName;
        playerAiWorkerKey.key = generateAiWorkerKey();

        return await this.playerAiWorkerKeyRepository.save(playerAiWorkerKey);
    }

    /**
     * @returns Revoked key, or null if not found
     */
    async revoke(id: number): Promise<null | PlayerAiWorkerKey>
    {
        const playerAiWorkerKey = await this.playerAiWorkerKeyRepository.findOneBy({ id });

        if (playerAiWorkerKey === null) {
            return null;
        }

        playerAiWorkerKey.enabled = false;
        playerAiWorkerKey.revokedAt = new Date();

        return await this.playerAiWorkerKeyRepository.save(playerAiWorkerKey);
    }

    /**
     * Updates lastSeenAt, but not more than once per minute.
     */
    async touch(playerAiWorkerKey: PlayerAiWorkerKey): Promise<void>
    {
        const now = new Date();

        if (playerAiWorkerKey.lastSeenAt !== null && now.getTime() - playerAiWorkerKey.lastSeenAt.getTime() < LAST_SEEN_UPDATE_INTERVAL_MS) {
            return;
        }

        playerAiWorkerKey.lastSeenAt = now;

        await this.playerAiWorkerKeyRepository.update(playerAiWorkerKey.id!, { lastSeenAt: now });
    }
}
