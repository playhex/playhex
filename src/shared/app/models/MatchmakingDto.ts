import { IsOptional, IsUUID, ValidateBy } from 'class-validator';
import { Expose } from '../class-transformer-custom.js';
import { isValidMatchmakingPreferences, type MatchmakingPreferences } from '../matchmaking/matchmakingRules.js';

export class MatchmakingEnterInput
{
    @Expose()
    @ValidateBy({
        name: 'isMatchmakingPreferences',
        validator: {
            validate: (value: unknown) => isValidMatchmakingPreferences(value),
            defaultMessage: () => 'Invalid matchmaking preferences, at least one boardsize must be accepted',
        },
    })
    preferences: MatchmakingPreferences;

    /**
     * Avoid to be matched against this player if another one is waiting,
     * i.e when playing again just after a game.
     */
    @Expose()
    @IsOptional()
    @IsUUID()
    avoidPlayerPublicId?: null | string;
}
