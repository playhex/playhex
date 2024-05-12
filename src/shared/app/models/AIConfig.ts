import { Expose, GROUP_DEFAULT } from '../../../shared/app/class-transformer-custom';
import Player from './Player';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity()
export default class AIConfig
{
    @PrimaryColumn()
    playerId?: number;

    @OneToOne(() => Player, { cascade: ['insert', 'update'] })
    @JoinColumn()
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    player?: Player;

    @Column({ type: String, length: 191 })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    engine: string;

    @Column({ length: 32 })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    label: string;

    @Column({ type: String, length: 64, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    description: string | null;

    @Column({ type: 'smallint', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    boardsizeMin?: null | number;

    @Column({ type: 'smallint', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    boardsizeMax?: null | number;

    @Column({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    requireMorePower: boolean;

    @Column({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    isRemote: boolean;

    @Column('json')
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    config: { [key: string]: unknown };

    @Column({ default: 0 })
    order: number;
}
