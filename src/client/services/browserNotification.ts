/**
 * Thin wrapper around the browser Notification API.
 *
 * Notification is not available in every context: iOS Safari in a normal tab,
 * some in-app webviews, non-secure contexts... Because it is an undeclared global there,
 * any direct access to `Notification` (even `Notification?.permission`, optional chaining
 * does not guard an undeclared global) throws a ReferenceError.
 *
 * So no other file should reference `Notification` directly, use these helpers instead.
 */
export const isNotificationSupported = typeof Notification !== 'undefined';

/**
 * Current notification permission, 'denied' when notifications are not supported at all.
 */
export const getNotificationPermission = (): NotificationPermission => isNotificationSupported
    ? Notification.permission
    : 'denied'
;

/**
 * Prompt player to grant notifications.
 *
 * @returns State of permission after prompt. False if notifications not supported by browser.
 */
export const requestNotificationPermission = async (): Promise<false | NotificationPermission> => {
    if (!isNotificationSupported) {
        return false;
    }

    return await Notification.requestPermission();
};
