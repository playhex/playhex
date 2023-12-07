<script lang="ts" setup>
/**
 * Force reload components.
 *
 * I.e /games/:id won't reload the component when changing only the id in url.
 * So making it as children of this components fixes it,
 * and prevent doing more logic to handle game change.
 */
</script>

<template>
    <router-view :key="$route.path"></router-view>
</template>
