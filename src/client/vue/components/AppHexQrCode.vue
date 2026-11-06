<script setup lang="ts">
import { computed } from 'vue';
import { createHexQrCode } from '../../services/hexQrCode.js';

const props = defineProps({
    text: {
        type: String,
        required: true,
    },
});

const qrCode = computed(() => createHexQrCode(props.text));
</script>

<template>
    <svg :viewBox="`0 0 ${qrCode.size} ${qrCode.size}`" xmlns="http://www.w3.org/2000/svg" role="img">
        <!-- Always white, even in dark mode: scanners need a light background -->
        <rect :width="qrCode.size" :height="qrCode.size" fill="#fff" />
        <path :d="qrCode.modulesPath" class="qr-dark" shape-rendering="crispEdges" />
        <path :d="qrCode.eyesPath" class="qr-dark" fill-rule="evenodd" />
    </svg>
</template>

<style scoped>
.qr-dark {
    fill: var(--bs-danger);
}
</style>
