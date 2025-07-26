<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useToastsStore from '../../../stores/toastsStore.js';
import { Toast } from '../../../../shared/app/Toast.js';
import { useRouter } from 'vue-router';

const { toasts } = storeToRefs(useToastsStore());
const { deleteToast } = useToastsStore();
const router = useRouter();

/**
 * When click on the toast itself (not buttons or close button)
 */
const clickToast = (toast: Toast): void => {
    const { actions } = toast.options;

    // no action: just close it
    if (actions.length === 0) {
        deleteToast(toast);
        return;
    }

    // single action: do it
    if (actions.length === 1) {
        const { action } = actions[0];

        if (typeof action === 'function') {
            action();
            deleteToast(toast);
            return;
        }

        router.push(action);
        deleteToast(toast);
        return;
    }
};
</script>

<template>
    <div class="toast-container position-fixed bottom-0 end-0">
        <div
            v-for="toast in toasts"
            :key="toast.id"
            @click="clickToast(toast)"
            class="toast align-items-center border-0 cursor-pointer"
            :class="[
                'text-bg-' + toast.options.level,
                {
                    show: toast.show,
                    clickable: toast.options.actions.length < 2,
                },
            ]"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-bs-animation="true"
        >
            <div class="d-flex">
                <div class="toast-body">
                    {{ toast.message }}

                    <template v-for="{ label, action, classes }, key in toast.options.actions" :key>
                        <button
                            v-if="('function' === typeof action)"
                            :class="classes ?? 'btn btn-link text-body'"
                            class="d-block"
                            @click.stop="() => { action(); deleteToast(toast); }"
                        >{{ label }}</button>

                        <router-link
                            v-else
                            class="text-body"
                            :to="action"
                            @click.stop="deleteToast(toast)"
                        >{{ label }}</router-link>
                    </template>
                </div>

                <button
                    type="button"
                    class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast"
                    aria-label="Close"
                    @click.stop="deleteToast(toast)"
                ></button>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.toast-container
    padding 1em
    padding-bottom 4em

.toast
    display block !important
    opacity 0

    &.show
        opacity 1

    transition opacity 150ms

.clickable
    cursor pointer
</style>
