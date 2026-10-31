/**
 * Returns redirect path from a "?redirect=/xxx" query parameter,
 * only if it is a path on this site, to prevent open redirects.
 */
export const getSafeRedirect = (redirect: unknown): null | string => {
    if (typeof redirect !== 'string') {
        return null;
    }

    if (!redirect.startsWith('/') || redirect.startsWith('//') || redirect.startsWith('/\\')) {
        return null;
    }

    return redirect;
};
