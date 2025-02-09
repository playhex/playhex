<script setup lang="ts">
defineProps({
    /**
     * Path in images/guide folder.
     * E.g src="conditional-moves/tab.png"
     */
    src: {
        type: String,
        required: true,
    },

    caption: {
        type: String,
        required: true,
    },
});
</script>

<template>
    <figure class="figure">
        <img
            :src="'/images/guide/' + src"
            :alt="caption"
            class="img-thumbnail"
        />
        <figcaption class="figure-caption text-end">{{ caption }}</figcaption>
    </figure>
</template>
