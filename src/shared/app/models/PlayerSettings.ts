import { Entity, Property, OneToOne } from '@mikro-orm/core';
import Player from './Player';
import { Expose } from '../class-transformer-custom';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { allShadingPatterns, type ShadingPatternType } from '../../../shared/pixi-board/shading-patterns';

@Entity()
export default class PlayerSettings
{
    @OneToOne(() => Player, { primary: true })
    player: Player;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Property({ default: false })
    confirmMoveBlitz: boolean = false;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Property({ default: false })
    confirmMoveNormal: boolean = false;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Property({ default: true })
    confirmMoveCorrespondence: boolean = true;

    @Expose()
    @IsOptional()
    @IsNumber()
    @Property({ type: 'smallint', default: 11 })
    orientationLandscape: number = 11;

    @Expose()
    @IsOptional()
    @IsNumber()
    @Property({ type: 'smallint', default: 9 })
    orientationPortrait: number = 9;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Property({ default: false })
    showCoords: boolean = false;

    @Expose()
    @IsOptional()
    @IsBoolean()
    @Property({ default: false })
    show44dots: boolean = false;

    /**
     * Which shading pattern to use,
     * null for no shading pattern.
     */
    @Expose()
    @IsOptional()
    @IsIn(allShadingPatterns)
    @Property({ type: String, nullable: true, length: 64, default: null })
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
    @Property({ type: String, nullable: true, length: 255, default: null })
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
    @Property({ type: 'float', default: 0.5 })
    boardShadingPatternIntensity: number = 0.5;
}
