<script setup lang="ts">
/*
 * What is Hexplorer, and how to use its main features.
 * Displayed first until player dismisses it.
 */
import { storeToRefs } from 'pinia';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import { IconCheck } from '../../icons.js';

const emit = defineEmits<{
    dismiss: [];
}>();

const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

const dismiss = (): void => {
    localSettings.value.hexplorerHelpDismissed = true;
    emit('dismiss');
};

const howToKeys = ['play', 'import', 'ai', 'setup', 'file'];
</script>

<template>
    <div>
        <h2>{{ $t('hexplorer.help_what_title') }}</h2>
        <p class="lead">{{ $t('hexplorer.help_what') }}</p>

        <h2>{{ $t('hexplorer.help_why_title') }}</h2>
        <p>{{ $t('hexplorer.help_why') }}</p>

        <h2>{{ $t('hexplorer.help_how_title') }}</h2>
        <ul class="ps-3">
            <li v-for="key in howToKeys" :key class="mb-1">{{ $t(`hexplorer.help_how_${key}`) }}</li>
        </ul>

        <button
            v-if="!localSettings.hexplorerHelpDismissed"
            type="button"
            class="btn btn-success w-100"
            @click="dismiss()"
        ><IconCheck /> {{ $t('hexplorer.help_dismiss') }}</button>
    </div>
</template>
