const TWA_PACKAGE_NAME = 'org.playhex.twa';
const SESSION_STORAGE_KEY = 'isTwa';

/**
 * Whether the page is opened from the Android app (Trusted Web Activity).
 *
 * TWA opens the first page with referrer "android-app://org.playhex.twa",
 * then remember it for the session in case referrer is lost on later full page loads.
 */
export const isTwa = (): boolean => {
    if (typeof document === 'undefined') {
        return false;
    }

    if (document.referrer.startsWith(`android-app://${TWA_PACKAGE_NAME}`)) {
        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, '1');
        } catch {
            // ignore
        }

        return true;
    }

    try {
        return sessionStorage.getItem(SESSION_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
};
