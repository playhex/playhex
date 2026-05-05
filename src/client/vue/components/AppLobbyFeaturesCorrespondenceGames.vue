<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Rooms from '../../../shared/app/Rooms.js';
import useSocketStore from '../../stores/socketStore.js';
import AppGameThumbnailLobbyLiveCard from '../components/AppGameThumbnailLobbyLiveCard.vue';
import { useWindowSize } from '@vueuse/core';
import { IconPlayFill } from '../icons.js';
import { storeToRefs } from 'pinia';
import usePlayingGamesCountStore from '../../stores/playingGamesCountStore.js';

const { socket, joinRoom, leaveRoom } = useSocketStore();
const { correspondence: correspondencePlayingGamesCount } = storeToRefs(usePlayingGamesCountStore());

const featuredGamesPublicIds = ref<string[]>([]);

socket.on('featuredCorrespondenceGamesUpdate', publicIds => {
    featuredGamesPublicIds.value = publicIds;
});

onMounted(() => {
    void joinRoom(Rooms.featuredCorrespondenceGames);
});

onUnmounted(() => {
    leaveRoom(Rooms.featuredCorrespondenceGames);
});

const { width } = useWindowSize();

const visibleFeaturedGamesPublicIds = computed(() => {
    if (width.value < 576) {
        return featuredGamesPublicIds.value.slice(0, 1);
    }

    return featuredGamesPublicIds.value;
});
</script>

<template>
    <section v-if="featuredGamesPublicIds.length > 0" class="mb-4">
        <div class="d-flex align-items-center gap-3 mb-2">
            <h2 class="mb-0">{{ $t('lobby_playing_now') }}</h2>
            <router-link class="text-decoration-none" :to="{ name: 'playing-games', params: { mode: 'correspondence' } }">
                <span class="badge text-bg-warning">
                    {{ $t('lobby_mode.n_playing', { n: correspondencePlayingGamesCount ?? '…' }) }}
                    <IconPlayFill />
                </span>
            </router-link>
        </div>

        <div class="row">
            <div v-for="gamePublicId in visibleFeaturedGamesPublicIds" :key="gamePublicId" class="col col-sm-6">
                <AppGameThumbnailLobbyLiveCard :gamePublicId />
            </div>
        </div>
    </section>
</template>
