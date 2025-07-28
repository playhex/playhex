<script lang="ts" setup>
import { BIconSignTurnLeft } from '../icons';
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    robots: 'noindex',
    title: 'Page not found',
});
</script>

<template>
    <div class="text-center">
        <h1 class="mt-4">Not found</h1>

        <p class="lead mt-4">
            <a href="#" @click="$router.back()"><BIconSignTurnLeft /> Go back</a>
        </p>

        <p class="lead mt-4">
            <router-link :to="{ name: 'home' }">Go to home</router-link>
        </p>
    </div>
</template>
