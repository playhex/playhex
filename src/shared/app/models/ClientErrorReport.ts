import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import Player from './Player.js';
import { Expose } from '../class-transformer-custom.js';

export const CLIENT_ERROR_REPORT_CREATE = 'client_error_report:create';

/**
 * Javascript error that happened on a player device,
 * reported from /rescue page to debug issues we cannot reproduce
 * (i.e board not displayed on some devices).
 */
@Entity()
@Index(['createdAt'])
export default class ClientErrorReport
{
    @PrimaryGeneratedColumn()
    id?: number;

    /**
     * Impacted player, null if not logged in.
     */
    @ManyToOne(() => Player, { nullable: true })
    player: null | Relation<Player>;

    /**
     * Where error comes from, i.e "error", "unhandledrejection", "board_mount", "theme_load",
     * or "manual" when player sent diagnostic without error.
     */
    @Expose({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @IsString({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @MaxLength(32, { groups: [CLIENT_ERROR_REPORT_CREATE] })
    @Column({ type: String, length: 32 })
    type: string;

    @Expose({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @IsString({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @MaxLength(4096, { groups: [CLIENT_ERROR_REPORT_CREATE] })
    @Column({ type: 'text' })
    message: string;

    @Expose({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @IsOptional({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @IsString({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @MaxLength(16384, { groups: [CLIENT_ERROR_REPORT_CREATE] })
    @Column({ type: 'text', nullable: true })
    stack: null | string = null;

    /**
     * Diagnostic as displayed on rescue page, in plain text:
     * versions, device, gpu, pixi renderer, board theme, cache, errors count...
     */
    @Expose({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @IsString({ groups: [CLIENT_ERROR_REPORT_CREATE] })
    @MaxLength(8192, { groups: [CLIENT_ERROR_REPORT_CREATE] })
    @Column({ type: 'text' })
    diagnostic: string;

    @Column({ default: () => 'current_timestamp' })
    createdAt: Date;
}
