<script setup lang="ts">
import { useHead, useSeoMeta } from '@unhead/vue';

useHead({
    link: [
        {
            rel: 'alternate',
            href: '/landing',
            hreflang: 'x-default',
        },
        {
            rel: 'alternate',
            href: '/en/landing',
            hreflang: 'en',
        },
        {
            rel: 'alternate',
            href: '/fr/landing',
            hreflang: 'fr',
        },
    ],
});

useSeoMeta({
    title: 'Jouer au Hex en ligne',
});
</script>

<template>
    <h1>Jouer au Hex en ligne</h1>
</template>
