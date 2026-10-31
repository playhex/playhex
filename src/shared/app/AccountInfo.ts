/**
 * Private account data, returned to the player itself only.
 * Used on settings page.
 */
export type AccountInfo = {
    /**
     * Login used with password, follows pseudo.
     */
    login: null | string;

    /**
     * Optional recovery email.
     */
    email: null | string;

    pseudoChange: {
        remaining: number;

        /**
         * Date when player will be able to change pseudo again, or null if player can change now.
         */
        nextAllowedAt: null | Date;

        /**
         * Former pseudo that would be displayed on profile if player changes pseudo now.
         */
        formerPseudoIfRenamedNow: null | {
            pseudo: string;
            until: Date;
        };
    };
};
