<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useGameThumbnail } from '../composables/useGameThumbnail.js';

const props = defineProps({
    gamePublicId: {
        type: String,
        required: true,
    },
});

const { gameView } = useGameThumbnail(props.gamePublicId);
const gameViewElement = ref<HTMLElement>();

onMounted(() => {
    watch(gameView, async () => {
        if (!gameView.value) {
            return;
        }

        if (!gameViewElement.value) {
            throw new Error('Missing element ref="gameViewElement"');
        }

        await gameView.value.mount(gameViewElement.value);
    });
});
</script>

<template>
    <div ref="gameViewElement" class="game-view-element"></div>
</template>

<style lang="stylus" scoped>
.game-view-element
    width 100%
    height 150px
</style>
