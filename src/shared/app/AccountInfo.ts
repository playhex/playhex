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
};
