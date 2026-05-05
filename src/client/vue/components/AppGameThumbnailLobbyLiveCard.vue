<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGameThumbnail } from '../composables/useGameThumbnail.js';
import AppPseudo from './AppPseudo.vue';
import AppPlayerRating from './AppPlayerRating.vue';
import { IconEye, IconCircleFill } from '../icons.js';
import { isLive } from '../../../shared/app/timeControlUtils.js';

const props = defineProps({
    gamePublicId: {
        type: String,
        required: true,
    },
});

const { gameView, hostedGame, spectatorsCount } = useGameThumbnail(props.gamePublicId);
const gameViewElement = ref<HTMLElement>();

const showLive = computed(() => {
    return hostedGame.value && hostedGame.value.state === 'playing' && isLive(hostedGame.value);
});

watch(gameView, async () => {
    if (!gameView.value || !gameViewElement.value) {
        return;
    }

    await gameView.value.mount(gameViewElement.value);
}, { immediate: true });
</script>

<template>
    <div class="card h-100" :class="{ 'live-game-card': showLive }">
        <router-link :to="{ name: 'online-game', params: { gameId: gamePublicId } }" class="card-body text-decoration-none p-2">
            <div v-if="hostedGame" class="mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="player-col text-start">
                        <AppPseudo v-if="hostedGame.hostedGameToPlayers[0]" :player="hostedGame.hostedGameToPlayers[0].player" classes="fw-bold small text-danger" />
                    </div>
                    <small v-if="hostedGame.state !== 'playing'">
                        Just ended
                    </small>
                    <span v-else-if="showLive" class="live-badge">
                        <IconCircleFill class="live-dot" /> LIVE
                    </span>
                    <div class="player-col text-end">
                        <AppPseudo v-if="hostedGame.hostedGameToPlayers[1]" :player="hostedGame.hostedGameToPlayers[1].player" classes="fw-bold small text-primary" />
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-1">
                    <AppPlayerRating v-if="hostedGame.hostedGameToPlayers[0]" :player="hostedGame.hostedGameToPlayers[0].player" class="rating-text" />
                    <small v-if="spectatorsCount > 0"><IconEye /> {{ spectatorsCount }}</small>
                    <AppPlayerRating v-if="hostedGame.hostedGameToPlayers[1]" :player="hostedGame.hostedGameToPlayers[1].player" class="rating-text" />
                </div>
            </div>
            <div class="d-flex justify-content-center">
                <div ref="gameViewElement" class="game-view-element"></div>
            </div>
        </router-link>
    </div>
</template>

<style lang="stylus" scoped>
.live-game-card
    border-top 3px solid var(--bs-danger)

.game-view-element
    width 100%
    height 170px

.live-badge
    font-size 0.7em
    font-weight 700
    letter-spacing 0.06em
    color var(--bs-danger)
    display flex
    align-items center
    gap 3px

.live-dot
    font-size 0.55em
    animation live-pulse 1.5s ease-in-out infinite

.player-col
    flex 1
    min-width 0

.rating-text
    font-size 0.75em
    color var(--bs-secondary-color)

@css {
    @keyframes live-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.25; }
    }
}
</style>
