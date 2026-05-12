<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Rooms from '../../../shared/app/Rooms.js';
import useSocketStore from '../../stores/socketStore.js';
import AppGameThumbnailLobbyLiveCard from '../components/AppGameThumbnailLobbyLiveCard.vue';
import { useWindowSize } from '@vueuse/core';

const { socket, joinRoom, leaveRoom } = useSocketStore();

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

const hasLiveGames = computed(() => featuredGamesPublicIds.value.length > 0);
</script>

<template>
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
</template>
