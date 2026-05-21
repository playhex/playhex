import { defineStore } from 'pinia';
import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { BootstrapLevel } from '../../shared/app/bootstrapLevels.js';
import { RouteLocationAsRelativeTyped } from 'vue-router';

const useToastsStore = defineStore('toastsStore', () => {

    const toasts = ref<Toast[]>([]);

    const addToast = (message: string, options?: Partial<ToastOptions>): void => {
        const toast = createToast(message, options);

        toasts.value.push(toast);

        setInterval(() => deleteToast(toast), toast.options.autoCloseAfter);
    };

    const deleteToast = (toast: Toast): void => {
        toast.show = false;

        setTimeout(() => {
            toasts.value = toasts.value.filter(t => toast.id !== t.id);
        }, 150);
    };

    return {
        toasts,
        addToast,
        deleteToast,
    };

});

export type ToastOptions = {
    /**
     * Color of toast
     */
    level: BootstrapLevel;

    /**
     * In milliseconds, automatically close toast.
     * Defaults to 4000.
     */
    autoCloseAfter: number;

    /**
     * Show links or buttons.
     *
     * No action: no button, click on toast will just dismiss it.
     * 1 action: 1 button, and clicking on toast will perform this action.
     * 2+ actions: a button for each action, clicking on toast itself is ignored.
     */
    actions: {
        /**
         * Text in the button
         */
        label: string;

        /**
         * Callback: shows a button that call callback on click
         * Url: navigate to this url
         */
        action: RouteLocationAsRelativeTyped | (() => void);

        /**
         * Add classes to button. Defaults to "btn btn-link text-body"
         */
        classes?: string;
    }[];
};

export type Toast = {
    /**
     * Unique id, used as vue key in for loop
     */
    id: string;

    /**
     * To delete toast, first set it to false to show fading animation
     */
    show: boolean;

    /**
     * Text to display
     */
    message: string;

    options: ToastOptions;
};

const createToast = (message: string, options?: Partial<ToastOptions>): Toast => {
    return {
        id: uuidv4(),
        show: true,
        message,
        options: {
            ...defaultToastOptions,
            ...options,
        },
    };
};

const defaultToastOptions: ToastOptions = {
    level: 'info',
    autoCloseAfter: 4000,
    actions: [],
};

export default useToastsStore;
