import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { ModerationSetting } from '../../shared/app/models/index.js';

/**
 * Simple key/value store used by the moderation interface,
 * to persist moderator settings server side, shared between all their devices.
 */
@Service()
export default class ModerationSettingRepository
{
    constructor(
        @Inject('Repository<ModerationSetting>')
        private moderationSettingRepository: Repository<ModerationSetting>,
    ) {}

    async getAll(): Promise<{ [key: string]: string }>
    {
        const settings = await this.moderationSettingRepository.find();
        const values: { [key: string]: string } = {};

        for (const setting of settings) {
            values[setting.key] = setting.value;
        }

        return values;
    }

    async get(key: string): Promise<null | string>
    {
        const setting = await this.moderationSettingRepository.findOneBy({ key });

        return setting?.value ?? null;
    }

    async set(key: string, value: string): Promise<void>
    {
        await this.moderationSettingRepository.save({ key, value });
    }

    async remove(key: string): Promise<void>
    {
        await this.moderationSettingRepository.delete({ key });
    }
}
