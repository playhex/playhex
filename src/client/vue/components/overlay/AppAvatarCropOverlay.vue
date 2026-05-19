<script setup lang="ts">
import { useDisclosure } from '@overlastic/vue';
import { PropType, ref, onMounted, onUnmounted } from 'vue';
import { Cropper, CircleStencil } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

const { visible, confirm, cancel } = useDisclosure();

const props = defineProps({
    file: {
        type: Object as PropType<File>,
        required: true,
    },
});

const imageUrl = ref('');
const cropper = ref<InstanceType<typeof Cropper> | null>(null);
const ready = ref(false);

onMounted(() => {
    imageUrl.value = URL.createObjectURL(props.file);
});

onUnmounted(() => {
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
});

const confirmCrop = () => {
    const canvas = cropper.value?.getResult()?.canvas;
    if (!canvas) return;

    canvas.toBlob(blob => {
        if (blob) confirm(blob);
    }, props.file.type);
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog modal-dialog-centered" @click="e => e.stopPropagation()">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('player_settings.crop_avatar') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body p-0 cropper-wrap">
                        <Cropper
                            ref="cropper"
                            class="avatar-cropper"
                            :class="{ invisible: !ready }"
                            :src="imageUrl"
                            :stencilComponent="CircleStencil"
                            :stencilProps="{ aspectRatio: 1 }"
                            :defaultSize="({ imageSize }: { imageSize: { width: number; height: number } }) => {
                                const size = Math.min(imageSize.width, imageSize.height);
                                return { width: size, height: size };
                            }"
                            :canvas="{ width: 512, height: 512 }"
                            @ready="ready = true"
                        />
                        <div v-if="!ready" class="cropper-loader">
                            <div class="spinner-border text-secondary" role="status">
                                <span class="visually-hidden">Loading…</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="cancel()">{{ $t('cancel') }}</button>
                        <button type="button" class="btn btn-primary" :disabled="!ready" @click="confirmCrop()">{{ $t('yes') }}</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show"></div>
    </div>
</template>

<style scoped>
.cropper-wrap {
    position: relative;
    aspect-ratio: 1 / 1;
    max-height: 55vh;
    overflow: hidden;
}

.avatar-cropper {
    width: 100%;
    height: 100%;
}

.cropper-loader {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
