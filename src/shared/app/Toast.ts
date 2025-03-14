import { v4 as uuidv4 } from 'uuid';
import { BootstrapLevel } from '../../shared/app/bootstrapLevels';
import { RouteLocationAsRelativeTyped } from 'vue-router';

export type ToastOptions = {
    /**
     * Color of toast
     */
    level: BootstrapLevel;

    /**
     * In milliseconds, automatically close toast.
     */
    autoCloseAfter: number;

    /**
     * Show links or buttons.
     */
    actions: {
        label: string;

        /**
         * Callback: shows a button that call callback on click
         * Url: navigate to this url
         */
        action: RouteLocationAsRelativeTyped | (() => void);
    }[];
};

const defaultToastOptions: ToastOptions = {
    level: 'info',
    autoCloseAfter: 4000,
    actions: [],
};

export class Toast
{
    /**
     * Unique id, used as vue key in for loop
     */
    id = uuidv4();

    /**
     * To delete toast, first set it to false to show fading animation
     */
    show = true;

    options: Required<ToastOptions>;

    constructor(
        public message: string,
        options: Partial<ToastOptions> = {},
    ) {
        this.options = {
            ...defaultToastOptions,
            ...options,
        };
    }
}
