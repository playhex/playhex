<script setup lang="ts">
defineProps({
    format: {
        type: String,
        required: true,
    },
});
</script>

<template>
    <img
        :src="'/images/tournament/' + format + '.svg'"
        :alt="$t('tournament_format.' + format)"
        class="img-fluid"
    />
</template>

<style lang="stylus" scoped>
[data-bs-theme=light]
    img
        filter invert(95%) sepia(11%) saturate(78%) hue-rotate(169deg) brightness(92%) contrast(99%)

[data-bs-theme=dark]
    img
        filter invert(12%) sepia(11%) saturate(78%) hue-rotate(169deg) brightness(97%) contrast(94%)
</style>
