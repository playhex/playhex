<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Rooms from '../../../shared/app/Rooms.js';
import useSocketStore from '../../stores/socketStore.js';
import AppGameThumbnailLobbyLiveCard from '../components/AppGameThumbnailLobbyLiveCard.vue';
import { useWindowSize } from '@vueuse/core';
import { IconPlayFill, IconCircleFill } from '../icons.js';
import { storeToRefs } from 'pinia';
import usePlayingGamesCountStore from '../../stores/playingGamesCountStore.js';

const { socket, joinRoom, leaveRoom } = useSocketStore();
const { live: livePlayingGamesCount, correspondence: correspondencePlayingGamesCount } = storeToRefs(usePlayingGamesCountStore());

const featuredGamesPublicIds = ref<string[]>([]);

socket.on('featuredLiveGamesUpdate', publicIds => {
    featuredGamesPublicIds.value = publicIds;
});

onMounted(() => {
    void joinRoom(Rooms.featuredLiveGames);
});

onUnmounted(() => {
    leaveRoom(Rooms.featuredLiveGames);
});

const { width } = useWindowSize();

const visibleFeaturedGamesPublicIds = computed(() => {
    if (width.value < 576) {
        return featuredGamesPublicIds.value.slice(0, 1);
    }

    return featuredGamesPublicIds.value;
});

const hasCorrespondenceGames = computed(() => (correspondencePlayingGamesCount.value ?? 0) > 0);
const hasLiveGames = computed(() => featuredGamesPublicIds.value.length > 0);
</script>

<template>
    <section v-if="hasLiveGames || hasCorrespondenceGames" class="mb-4">
        <div class="d-flex align-items-center gap-3 mb-2">
            <h2 class="mb-0 d-flex align-items-center gap-2">
                <IconCircleFill v-if="hasLiveGames" class="live-indicator" />
                {{ $t('lobby_playing_now') }}
            </h2>
            <router-link class="text-decoration-none" :to="{ name: 'playing-games' }">
                <span class="badge text-bg-success">
                    {{ $t('lobby_mode.n_playing', { n: livePlayingGamesCount ?? '…' }) }}
                    <IconPlayFill />
                </span>
            </router-link>
        </div>

        <div v-if="hasLiveGames" class="row">
            <div v-for="gamePublicId in visibleFeaturedGamesPublicIds" :key="gamePublicId" class="col col-sm-6">
                <AppGameThumbnailLobbyLiveCard :gamePublicId />
            </div>
        </div>
        <div v-else>
            <p>
                {{ $t('lobby_no_live_games_now') }}
                <router-link
                    :to="{ name: 'playing-games', params: { mode: 'correspondence' } }"
                >{{ $t('lobby_observe_correspondence') }}</router-link>.
            </p>
        </div>
    </section>
</template>

<style lang="stylus" scoped>
.live-indicator
    font-size 0.55em
    color var(--bs-danger)
    animation live-pulse 1.5s ease-in-out infinite

@css {
    @keyframes live-pulse {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.25; }
    }
}
</style>
