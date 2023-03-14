<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';

const { confirm, cancel } = useOverlayMeta();

const props = defineProps({
    title: {
        type: String,
        default: 'Confirmation',
    },
    message: {
        type: String,
        default: 'Are you sure?',
    },
    confirmLabel: {
        type: String,
        default: 'Yes',
    },
    confirmClass: {
        type: String,
        default: 'btn-success',
    },
    cancelLabel: {
        type: String,
        default: 'No',
    },
    cancelClass: {
        type: String,
        default: 'btn-secondary',
    },
});
</script>

<template>
    <div>
        <div class="modal d-block" @click="cancel()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <form class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ props.title }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <p>{{ props.message }}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn" :class="cancelClass" @click="cancel()">{{ props.cancelLabel }}</button>
                        <button type="submit" class="btn" :class="confirmClass" @click="confirm()">{{ props.confirmLabel }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
