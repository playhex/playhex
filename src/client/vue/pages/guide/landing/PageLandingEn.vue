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
    title: 'Play Hex online',
});
</script>

<template>
    <h1>Play Hex online</h1>
</template>
