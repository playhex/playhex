<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore.js';
import AppPseudo from '../components/AppPseudo.vue';
import { type OnlinePlayer } from '../../../shared/app/models/index.js';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';

useHead({
    title: t('online_players_title'),
});

const onlinePlayersStore = useOnlinePlayersStore();
onlinePlayersStore.subscribeFullList();

const { players, totalPlayers } = storeToRefs(onlinePlayersStore);

type SortMode = 'rating' | 'alpha';
const sortMode = ref<SortMode>('rating');

const sortedPlayers = computed<OnlinePlayer[]>(() => {
    return Object.values<OnlinePlayer>(players.value)
        .sort((a, b) => {
            // inactive players at the end
            if (a.active && !b.active) return -1;
            if (!a.active && b.active) return 1;

            // guest players at the end
            if (!a.player.isGuest && b.player.isGuest) return -1;
            if (a.player.isGuest && !b.player.isGuest) return 1;

            if (sortMode.value === 'rating') {
                const rA = a.player.currentRating?.rating ?? -Infinity;
                const rB = b.player.currentRating?.rating ?? -Infinity;
                if (rB !== rA) return rB - rA;
            }

            return a.player.pseudo.localeCompare(b.player.pseudo);
        });
});
</script>

<template>
    <div class="container my-3">
        <div class="d-flex align-items-center gap-3 mb-3">
            <h1 class="mb-0">{{ $t('online_players_heading', { n: totalPlayers ?? '…' }) }}</h1>

            <div class="btn-group btn-group-sm ms-auto">
                <input type="radio" class="btn-check" id="sort-rating" v-model="sortMode" value="rating" autocomplete="off">
                <label class="btn btn-outline-secondary" for="sort-rating">{{ $t('sort_by_rating') }}</label>

                <input type="radio" class="btn-check" id="sort-alpha" v-model="sortMode" value="alpha" autocomplete="off">
                <label class="btn btn-outline-secondary" for="sort-alpha">{{ $t('sort_alpha') }}</label>
            </div>
        </div>

        <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-2">
            <div v-for="onlinePlayer in sortedPlayers" :key="onlinePlayer.player.publicId" class="col">
                <div class="player-item d-flex align-items-center gap-2 p-2 rounded" :class="{ inactive: !onlinePlayer.active }">
                    <AppPseudo :player="onlinePlayer.player" rating onlineStatus />
                </div>
            </div>
        </div>

        <p v-if="totalPlayers === null" class="text-secondary">{{ $t('loading') }}</p>
        <p v-else-if="totalPlayers === 0" class="text-secondary"><i>{{ $t('no_players_online') }}</i></p>
    </div>
</template>

<style lang="stylus" scoped>
.player-item
    background var(--bs-body-bg)
    border 1px solid var(--bs-border-color)
    font-size 0.9em

    &.inactive
        opacity 0.5
</style>
