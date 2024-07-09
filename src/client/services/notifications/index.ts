import { requestNotificationPermission } from './channels/browser';
import './channels/sound';
import { notifier } from './notifier';

export {
    notifier,
    requestNotificationPermission as requestBrowserNotificationPermission,
};
