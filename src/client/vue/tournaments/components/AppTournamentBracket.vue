<script setup lang="ts">
import { Tournament } from '../../../../shared/app/models';
import AppBracketDefault from './brackets/AppBracketDefault.vue';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    <AppBracketDefault
        v-if="'single-elimination' === tournament.stage1Format"
        :tournament
    />
    <AppBracketDefault
        v-else
        :tournament
    />
</template>
