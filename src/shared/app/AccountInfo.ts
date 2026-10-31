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
     * Whether player has a password. False when account has been created from Discord.
     */
    hasPassword: boolean;

    /**
     * Optional recovery email.
     */
    email: null | string;

    /**
     * Linked Discord account. Private, not displayed on profile.
     */
    discord: null | {
        username: string;
    };

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
