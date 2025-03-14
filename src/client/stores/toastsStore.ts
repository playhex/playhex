import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Toast } from '../../shared/app/Toast';

const useToastsStore = defineStore('toastsStore', () => {

    const toasts = ref<Toast[]>([]);

    const addToast = (toast: Toast): void => {
        toasts.value.push(toast);

        setInterval(() => deleteToast(toast), toast.options.autoCloseAfter);
    };

    const deleteToast = (toast: Toast): void => {
        toast.show = false;

        setTimeout(() => {
            toasts.value = toasts.value.filter(t => toast !== t);
        }, 150);
    };

    return {
        toasts,
        addToast,
        deleteToast,
    };

});

export default useToastsStore;
