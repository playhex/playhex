import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Short link "/s/<slug>" redirecting to a relative url of the app.
 */
@Entity()
export default class ShortLink
{
    @PrimaryColumn({ type: 'varchar', length: 32 })
    slug: string;

    /**
     * Relative url, e.g "/puzzles/xxx". Never absolute, so links keep working on any domain.
     */
    @Column({ type: 'varchar', length: 512 })
    target: string;

    @Column({ type: 'int', unsigned: true, default: 0 })
    clicks: number;

    @Column({ type: Date, nullable: true })
    lastUsedAt: null | Date;

    @Column({ type: Date, default: () => 'current_timestamp()' })
    createdAt: Date;
}
