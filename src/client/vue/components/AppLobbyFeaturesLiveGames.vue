<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Rooms from '../../../shared/app/Rooms.js';
import useSocketStore from '../../stores/socketStore.js';
import AppGameThumbnailLobbyLiveCard from '../components/AppGameThumbnailLobbyLiveCard.vue';
import { useWindowSize } from '@vueuse/core';

const { socket, joinRoom, leaveRoom } = useSocketStore();

const featuredGamesPublicIds = ref<string[]>([]);

socket.on('featuredGamesUpdate', publicIds => {
    featuredGamesPublicIds.value = publicIds;
});

onMounted(() => {
    void joinRoom(Rooms.featuredGames);
});

onUnmounted(() => {
    leaveRoom(Rooms.featuredGames);
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
        <h2>En cours maintenant</h2>

        <div class="row">
            <div v-for="gamePublicId in visibleFeaturedGamesPublicIds" :key="gamePublicId" class="col col-sm-6">
                <AppGameThumbnailLobbyLiveCard :gamePublicId />
            </div>
        </div>
    </section>
</template>
