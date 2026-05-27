<script setup lang="ts">
import { onMounted, ref, toRefs } from 'vue';
import { GameView } from '@playhex/pixi-board';

const props = defineProps({
    gameView: {
        type: GameView,
        required: true,
    },
});

const {
    gameView,
} = toRefs(props);

const gameViewElement = ref<HTMLElement>();

onMounted(async () => {
    if (!gameViewElement.value) {
        throw new Error('No element with ref gameViewElement');
    }

    await gameView.value.mount(gameViewElement.value);
});
</script>

<template>
    <div ref="gameViewElement"></div>
</template>
