<script setup lang="ts">
import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import AppRhombus from './AppRhombus.vue';
import { computed } from 'vue';

const { playerSettings } = storeToRefs(usePlayerSettingsStore());
const orientation = computed(() => playerSettings.value?.orientationLandscape ?? 0);
</script>

<template>
    <div>
        <AppRhombus :orientation />
    </div>
</template>
