<script setup lang="ts">
import AppNumberDiff from './AppNumberDiff.vue';

defineProps({
    ratingChange: {
        type: Number,
        required: true,
    },
});
</script>

<template>
    <AppNumberDiff :n="ratingChange" />
</template>
