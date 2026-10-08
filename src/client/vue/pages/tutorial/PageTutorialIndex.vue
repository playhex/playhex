<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore.js';
import { useTutorialControls } from '../../composables/tutorialControls.js';
import { tutorialSteps } from './tutorialSteps.js';

/*
 * Continue tutorial where player stopped.
 * Waits for player settings to know completed steps,
 * or starts from first step if they take too long to load.
 */
const router = useRouter();
const { playerSettings } = storeToRefs(usePlayerSettingsStore());
const { firstIncompleteStep } = useTutorialControls();

let redirected = false;

const redirect = (routeName: string): void => {
    if (redirected) {
        return;
    }

    redirected = true;
    void router.replace({ name: routeName });
};

const timeout = setTimeout(() => redirect(tutorialSteps[0].routeName), 2000);

watch(playerSettings, settings => {
    if (settings !== null) {
        redirect(firstIncompleteStep.value.routeName);
    }
}, { immediate: true });

onUnmounted(() => clearTimeout(timeout));
</script>

<template>
    <div></div>
</template>
