<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useGameThumbnail } from '../composables/useGameThumbnail.js';
import AppPseudo from './AppPseudo.vue';
import AppPlayerRating from './AppPlayerRating.vue';
import { IconEye } from '../icons.js';

const props = defineProps({
    gamePublicId: {
        type: String,
        required: true,
    },
});

const { gameView, hostedGame } = useGameThumbnail(props.gamePublicId);
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
    <div class="card h-100">
        <router-link :to="{ name: 'online-game', params: { gameId: gamePublicId } }" class="card-body text-decoration-none p-2">
            <div v-if="hostedGame" class="mb-2">
                <div class="justify">
                    <AppPseudo :player="hostedGame?.hostedGameToPlayers[0].player" classes="text-primary fw-bold" />
                    <AppPseudo :player="hostedGame?.hostedGameToPlayers[1].player" classes="text-danger fw-bold" />
                </div>
                <div class="justify">
                    <AppPlayerRating :player="hostedGame?.hostedGameToPlayers[0].player" />
                    <span class="small"><IconEye /> 3</span>
                    <AppPlayerRating :player="hostedGame?.hostedGameToPlayers[1].player" />
                </div>
            </div>
            <div class="d-flex justify-content-center board-wrap mb-2">
                <div ref="gameViewElement" class="game-view-element"></div>
            </div>
        </router-link>
    </div>
</template>

<style lang="stylus" scoped>
.game-view-element
    width 100%
    height 150px

.justify
    display flex
    justify-content space-between
</style>
