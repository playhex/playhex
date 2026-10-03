import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Type } from 'class-transformer';
import { Expose, GROUP_DEFAULT } from '../class-transformer-custom.js';
import { ColumnUUID } from '../custom-typeorm.js';
import { keysOf } from '../utils.js';
import Player from './Player.js';

/**
 * External link to a video about Hex (youtube or other).
 * Videos are not hosted, nor embedded.
 *
 * Moderation is done directly in database, i.e:
 *      UPDATE video SET accepted = true, moderatedAt = NOW() WHERE id = ...;
 */
@Entity()
@Index(keysOf<Video>()('accepted', 'createdAt'))
export default class Video
{
    @PrimaryGeneratedColumn()
    id: number;

    @ColumnUUID({ unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    publicId: string;

    /**
     * External link. Youtube links are normalized, see normalizeVideoUrl().
     */
    @Column({ length: 512, unique: true })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    url: string;

    @Column({ length: 255 })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    title: string;

    /**
     * Name of the video author, or youtube channel.
     * Not the player who submitted it.
     */
    @Column({ length: 128 })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    authorName: string;

    @Column({ type: 'int', unsigned: true })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    durationSeconds: number;

    /**
     * Languages in which video is accessible (spoken or subtitled),
     * keys of availableLocales, e.g ["en", "fr"].
     */
    @Column({ type: 'simple-array' })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    @Type(() => String)
    languages: string[];

    /**
     * Not displayed, only used by search, in addition to title.
     * Free text: synonyms, other words this video should be found with...
     */
    @Column({ type: String, length: 512, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    keywords: null | string;

    /**
     * E.g "/video-thumbnails/<uuid>.jpg"
     */
    @Column({ length: 255 })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    thumbnailPath: string;

    /**
     * Player who submitted this video.
     */
    @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
    @Expose({ groups: [GROUP_DEFAULT] })
    @Type(() => Player)
    submittedBy: null | Relation<Player>;

    /**
     * Moderation result:
     * null: pending, not yet moderated, not listed
     * true: accepted, listed
     * false: refused, not listed
     */
    @Column({ type: Boolean, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT] })
    accepted: null | boolean;

    @Column({ type: Date, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT] })
    @Type(() => Date)
    moderatedAt: null | Date;

    /**
     * Displayed and sorted on in videos list.
     */
    @Column({ type: Date, default: () => 'current_timestamp()' })
    @Expose({ groups: [GROUP_DEFAULT, 'video'] })
    @Type(() => Date)
    createdAt: Date;
}
