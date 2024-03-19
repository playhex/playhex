import { Expose } from 'class-transformer';
import Player from './Player';

type Groups = null | 'withPlayerId';

export default class AIConfig<Group extends Groups = null>
{
    @Expose()
    engine: string;

    @Expose()
    label: string;

    @Expose()
    description: string | null;

    @Expose()
    boardsizeMin: null | number;

    @Expose()
    boardsizeMax: null | number;

    @Expose()
    requireMorePower: boolean;

    @Expose()
    isRemote: boolean;

    @Expose()
    config: { [key: string]: unknown };

    player: Group extends 'withPlayerId' ? Pick<Player, 'publicId'> : Pick<Player, 'publicId'> | undefined;
}
