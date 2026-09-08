import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Simple key/value store for the moderation interface.
 * Used to persist moderator settings server side instead of local storage,
 * so they are shared between all moderator devices.
 *
 * E.g stores dates when moderator marked chat messages as seen.
 */
@Entity()
export default class ModerationSetting
{
    @PrimaryColumn({ length: 64 })
    key: string;

    @Column({ type: 'text' })
    value: string;
}
