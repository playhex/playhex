const icon = '/images/logo-transparent.svg';

const sendNotification = (options, route) => {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    } else if (Notification.permission === 'granted') {
        new Notification('PlayHex', { ...options, icon }).onclick = function() {
            if (route) route();
            focus(window);
            this.close();
        };
    }
};

export { sendNotification };
