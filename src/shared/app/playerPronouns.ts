import type Player from './models/Player.js';

export const playerPronouns = ['he/him', 'she/her', 'they/them'] as const;
export type PlayerPronouns = typeof playerPronouns[number];

/** Grammatical context for translations about this player, never the viewer. */
export const playerGender = (player?: Pick<Player, 'pronouns'> | null): 'male' | 'female' | 'other' => {
    switch (player?.pronouns) {
        case 'he/him': return 'male';
        case 'she/her': return 'female';
        default: return 'other';
    }
};
