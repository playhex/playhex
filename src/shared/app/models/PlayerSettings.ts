import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import Player from './Player';
import { Expose } from '../class-transformer-custom';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

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
}
