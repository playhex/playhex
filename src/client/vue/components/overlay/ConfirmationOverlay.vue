<script setup lang="ts">
import { t } from 'i18next';
import { useExtendOverlay } from '@overlastic/vue';

const { visible, resolve, reject } = useExtendOverlay();

const props = defineProps({
    title: {
        type: String,
        default: t('confirm_overlay.confirmation'),
    },
    message: {
        type: String,
        default: t('confirm_overlay.are_you_sure?'),
    },
    confirmLabel: {
        type: String,
        default: t('yes'),
    },
    confirmClass: {
        type: String,
        default: 'btn-success',
    },
    cancelLabel: {
        type: String,
        default: t('no'),
    },
    cancelClass: {
        type: String,
        default: 'btn-secondary',
    },
});
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="reject()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ props.title }}</h5>
                        <button type="button" class="btn-close" @click="reject()"></button>
                    </div>
                    <div class="modal-body">
                        <p class="card-text">{{ props.message }}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn" :class="cancelClass" @click="reject()">{{ props.cancelLabel }}</button>
                        <button type="button" class="btn" :class="confirmClass" @click="resolve()">{{ props.confirmLabel }}</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
