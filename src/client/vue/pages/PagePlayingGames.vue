<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { HostedGame } from '../../../shared/app/models/index.js';
import { apiGetActiveGames } from '../../apiClient.js';
import { isLive, isCorrespondence } from '../../../shared/app/timeControlUtils.js';
import { isBotGame } from '../../../shared/app/hostedGameUtils.js';
import AppPseudo from '../components/AppPseudo.vue';
import AppTimeControlLabel from '../components/AppTimeControlLabel.vue';
import { IconLightningChargeFill, IconCalendar } from '../icons.js';
import { formatDistanceToNowStrict } from 'date-fns';
import { useHead } from '@unhead/vue';
import { storeToRefs } from 'pinia';
import useLobbyStore from '../../stores/lobbyStore.js';

useHead({ title: 'Playing games' });

const allPlayingGames = ref<HostedGame[]>([]);
const loading = ref(true);
const { currentLobby } = storeToRefs(useLobbyStore());

onMounted(async () => {
    const games = await apiGetActiveGames();
    allPlayingGames.value = games.filter(g => g.state === 'playing' && !isBotGame(g));
    loading.value = false;
});

const liveGames = computed(() => allPlayingGames.value.filter(g => isLive(g)));
const correspondenceGames = computed(() => allPlayingGames.value.filter(g => isCorrespondence(g)));
const currentGames = computed(() => currentLobby.value === 'live' ? liveGames.value : correspondenceGames.value);
</script>

<template>
    <div class="container-fluid my-3">
        <h1 class="h3 mb-3">Playing games</h1>

        <!-- Tab switcher -->
        <div class="mode-strip mb-4" role="tablist">
            <button
                @click="currentLobby = 'live'"
                class="mode-panel mode-panel-live"
                :class="{ active: currentLobby === 'live' }"
                type="button" role="tab"
                :aria-selected="currentLobby === 'live'"
            >
                <span class="mode-bg-icon"><IconLightningChargeFill /></span>
                <span class="mode-count">{{ liveGames.length }}</span>
                <span class="mode-name"><IconLightningChargeFill /> Live</span>
                <span class="mode-hint">Clocked games in progress</span>
            </button>
            <button
                @click="currentLobby = 'correspondence'"
                class="mode-panel mode-panel-correspondence"
                :class="{ active: currentLobby === 'correspondence' }"
                type="button" role="tab"
                :aria-selected="currentLobby === 'correspondence'"
            >
                <span class="mode-bg-icon"><IconCalendar /></span>
                <span class="mode-count">{{ correspondenceGames.length }}</span>
                <span class="mode-name"><IconCalendar /> Correspondence</span>
                <span class="mode-hint">Games played at own pace</span>
            </button>
        </div>

        <!-- Games table -->
        <div class="card">
            <div class="card-header d-flex align-items-center justify-content-between">
                <span class="fw-bold">{{ currentLobby === 'live' ? 'Live' : 'Correspondence' }} games in progress</span>
                <span class="badge text-bg-secondary">{{ currentGames.length }}</span>
            </div>

            <div v-if="loading" class="card-body text-secondary">
                <i>Loading…</i>
            </div>

            <div v-else-if="currentGames.length === 0" class="card-body text-secondary">
                <i>No {{ currentLobby }} games in progress</i>
            </div>

            <div v-else class="table-responsive">
                <table class="table table-borderless table-hover mb-0">
                    <thead>
                        <tr class="small text-body-secondary">
                            <th></th>
                            <th>Red</th>
                            <th>Blue</th>
                            <th>Size</th>
                            <th>Time control</th>
                            <th>Moves</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="game in currentGames" :key="game.publicId">
                            <td>
                                <router-link
                                    class="btn btn-sm btn-outline-secondary py-0"
                                    :to="{ name: 'online-game', params: { gameId: game.publicId } }"
                                >Watch</router-link>
                            </td>
                            <td>
                                <AppPseudo v-if="game.hostedGameToPlayers[0]" :player="game.hostedGameToPlayers[0].player" rating classes="text-danger" />
                            </td>
                            <td>
                                <AppPseudo v-if="game.hostedGameToPlayers[1]" :player="game.hostedGameToPlayers[1].player" rating classes="text-primary" />
                            </td>
                            <td>{{ game.boardsize }}×{{ game.boardsize }}</td>
                            <td><AppTimeControlLabel :timeControlBoardsize="game" /></td>
                            <td class="text-body-secondary small">{{ game.moves.length }}</td>
                            <td class="text-body-secondary small">{{ game.startedAt ? formatDistanceToNowStrict(game.startedAt) : '–' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.mode-strip
    display flex
    border-radius 0.5rem
    overflow hidden
    border 1px solid var(--bs-border-color)

.mode-panel
    flex 1
    position relative
    display grid
    grid-template-columns 1fr auto
    grid-template-rows auto auto
    gap 0 0.5rem
    padding 0.75rem 1rem
    border none
    background var(--bs-body-bg)
    text-align left
    cursor pointer
    transition background-color 0.18s, color 0.18s, box-shadow 0.18s
    overflow hidden

    &:first-child
        border-right 1px solid var(--bs-border-color)

    &:focus-visible
        outline 2px solid var(--bs-focus-ring-color)
        outline-offset -2px

.mode-bg-icon
    position absolute
    right 0.6rem
    bottom -0.3rem
    font-size 3.8rem
    pointer-events none
    opacity 0.06
    transition opacity 0.18s

.mode-count
    grid-column 2
    grid-row 1 / 3
    align-self center
    font-size 1.8rem
    font-weight 700
    line-height 1
    transition color 0.18s
    color var(--bs-secondary-color)

.mode-name
    grid-column 1
    grid-row 1
    font-weight 600
    font-size 0.95rem
    transition color 0.18s
    color var(--bs-secondary-color)

.mode-hint
    grid-column 1
    grid-row 2
    font-size 0.75rem
    color var(--bs-secondary-color)
    opacity 0.7

.mode-panel-live
    &:not(.active):hover
        background var(--bs-tertiary-bg)

        .mode-bg-icon
            opacity 0.1

    &.active
        box-shadow inset 0 -4px 0 var(--bs-success)
        cursor default

        .mode-count, .mode-name
            color var(--bs-success)

        .mode-bg-icon
            opacity 0.12

.mode-panel-correspondence
    &:not(.active):hover
        background var(--bs-tertiary-bg)

        .mode-bg-icon
            opacity 0.1

    &.active
        box-shadow inset 0 -4px 0 var(--bs-warning)
        cursor default

        .mode-count, .mode-name
            color var(--bs-warning)

        .mode-bg-icon
            opacity 0.12

@css {
    .mode-panel-live.active {
        background: color-mix(in srgb, var(--bs-success) 8%, var(--bs-body-bg));
    }

    .mode-panel-correspondence.active {
        background: color-mix(in srgb, var(--bs-warning) 8%, var(--bs-body-bg));
    }
}

.card .table
    thead
        th, td
            color var(--bs-tertiary-color)
            font-weight 400
            font-size 1em

    tr:first-child, td:first-child
        padding-left 1em

    tr:last-child, td:last-child
        padding-right 1em
</style>
