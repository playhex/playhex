import { Expose, GROUP_DEFAULT } from '../../../shared/app/class-transformer-custom';
import Player from './Player';
import { Entity, Property, OneToOne } from '@mikro-orm/core';

@Entity()
export default class AIConfig
{
    @OneToOne({ primary: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    player: Player;

    @Property({ type: String, length: 191 })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    engine: string;

    @Property({ length: 32 })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    label: string;

    @Property({ type: String, length: 64, nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    description: string | null;

    @Property({ type: 'smallint', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    boardsizeMin?: null | number;

    @Property({ type: 'smallint', nullable: true })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    boardsizeMax?: null | number;

    @Property({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    requireMorePower: boolean;

    @Property({ default: false })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    isRemote: boolean;

    @Property({ type: 'json' })
    @Expose({ groups: [GROUP_DEFAULT, 'ai_config'] })
    config: { [key: string]: unknown };

    @Property({ default: 0 })
    order: number;
}
