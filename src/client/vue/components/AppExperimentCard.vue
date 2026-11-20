<script setup lang="ts">
defineProps<{
    href: string;
    image: string;
    title: string;
    description: string;
    badge: string;
}>();
</script>

<template>
    <div class="card experiment-card text-white">
        <img :src="image" alt="" class="card-img" loading="lazy">
        <span class="badge text-bg-warning experiment-badge">{{ badge }}</span>
        <div class="card-img-overlay d-flex flex-column justify-content-end p-0">
            <div class="caption p-2">
                <a :href class="stretched-link text-white text-decoration-none fw-semibold">{{ title }}</a>
                <p class="m-0"><small>{{ description }}</small></p>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.experiment-card
    overflow hidden

    .card-img
        aspect-ratio 480 / 252
        object-fit cover

    .experiment-badge
        position absolute
        top 0.5rem
        right 0.5rem

    .caption
        background linear-gradient(transparent, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%)
        padding-top 1rem !important
</style>
