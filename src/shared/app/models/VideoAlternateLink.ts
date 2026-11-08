import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import Video from './Video.js';

/**
 * Alternate link of a video, when same video is also published on other platforms.
 * Main link stays Video.url.
 */
@Entity()
@Index(['video', 'position'])
export default class VideoAlternateLink
{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Video, video => video.alternateLinks, { nullable: false, onDelete: 'CASCADE' })
    video: Relation<Video>;

    /**
     * External link. Youtube links are normalized, see normalizeVideoUrl().
     */
    @Column({ length: 512, unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    url: string;

    /**
     * Display order, starting from 0.
     */
    @Column({ type: 'smallint', unsigned: true })
    position: number;
}
