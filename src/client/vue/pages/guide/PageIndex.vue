<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Guide',
});
</script>

<template>
    <h1>PlayHex guide</h1>

    <p>Here is a guide for PlayHex features.</p>

    <router-link class="lead" :to="{ name: 'guide_conditional_moves' }">{{ $t('conditional_moves.title') }}</router-link>
</template>
