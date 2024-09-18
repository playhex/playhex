import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import Player from './Player';
import { Expose } from '../class-transformer-custom';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { allShadingPatterns, type ShadingPatternType } from '../../../shared/pixi-board/shading-patterns';

@Entity()
export default class PlayerSettings
{
    @PrimaryColumn()
    playerId?: number;

    @OneToOne(() => Player)
    @JoinColumn()
    player?: Player;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Column({ default: false })
    confirmMoveBlitz: boolean = false;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Column({ default: false })
    confirmMoveNormal: boolean = false;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Column({ default: true })
    confirmMoveCorrespondence: boolean = true;

    @Expose()
    @IsOptional()
    @IsNumber()
    @Column({ type: 'smallint', default: 11 })
    orientationLandscape: number = 11;

    @Expose()
    @IsOptional()
    @IsNumber()
    @Column({ type: 'smallint', default: 9 })
    orientationPortrait: number = 9;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Column({ default: false })
    showCoords: boolean = false;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Column({ default: false })
    show44dots: boolean = false;

    /**
     * Which shading pattern to use,
     * null for no shading pattern.
     */
    @Expose()
    @IsOptional()
    @IsIn(allShadingPatterns)
    @Column({ type: String, nullable: true, length: 64, default: null })
    boardShadingPattern: ShadingPatternType = null;

    /**
     * Which shading pattern to use,
     * null for no shading pattern.
     */
    @Expose()
    @IsOptional()
    @IsString()
    @Length(0, 255)
    @ValidateIf((_, value) => value !== null)
    @Column({ type: String, nullable: true, length: 255, default: null })
    boardShadingPatternOption: null | string = null;

    /**
     * Between 0 and 1,
     * 1 means shading pattern is fully contrasted,
     * 0 is not visible.
     */
    @Expose()
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    @Column({ type: 'float', default: 0.5 })
    boardShadingPatternIntensity: number = 0.5;
}
