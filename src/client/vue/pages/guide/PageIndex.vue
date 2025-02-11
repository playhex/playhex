<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Guide',
});
</script>

<template>
    <h1>PlayHex guide</h1>

    <p>Here is a guide for PlayHex features.</p>

    <p><router-link class="lead" :to="{ name: 'guide-ai-analysis' }">{{ $t('game_analysis.game_analysis') }}</router-link></p>
    <p><router-link class="lead" :to="{ name: 'guide-conditional-moves' }">{{ $t('conditional_moves.title') }}</router-link></p>
</template>
