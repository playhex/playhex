<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { HostedGame } from '../../../shared/app/models/index.js';
import { apiGetActiveGames } from '../../apiClient.js';
import { isLive, isCorrespondence } from '../../../shared/app/timeControlUtils.js';
import { isBotGame } from '../../../shared/app/hostedGameUtils.js';
import AppPseudo from '../components/AppPseudo.vue';
import AppTimeControlLabel from '../components/AppTimeControlLabel.vue';
import { IconLightningChargeFill, IconCalendar, IconList, IconGrid3x3GapFill } from '../icons.js';
import { formatDistanceToNowStrict } from 'date-fns';
import { useHead } from '@unhead/vue';
import { useRouter, useRoute } from 'vue-router';
import AppGameThumbnailLobbyLiveCard from '../components/AppGameThumbnailLobbyLiveCard.vue';
import { t } from 'i18next';

useHead({ title: t('playing_games.title') });

const TOP_COUNT = 6;

type SortKey = 'recently-started' | 'most-moves' | 'longest' | 'player-rating';
type ViewMode = 'top' | 'all';

const allPlayingGames = ref<HostedGame[]>([]);
const loading = ref(true);
const view = ref<ViewMode>('top');
const router = useRouter();
const route = useRoute();
const currentLobby = computed(() => route.params.mode === 'correspondence' ? 'correspondence' : 'live');
const sort = ref<SortKey>(route.params.mode === 'correspondence' ? 'most-moves' : 'recently-started');
const setLobby = (mode: 'live' | 'correspondence') => router.push({ name: 'playing-games', params: { mode } });

onMounted(async () => {
    const games = await apiGetActiveGames();
    allPlayingGames.value = games.filter(g => g.state === 'playing' && !isBotGame(g));
    loading.value = false;
});

const liveGames = computed(() => allPlayingGames.value.filter(g => isLive(g)));
const correspondenceGames = computed(() => allPlayingGames.value.filter(g => isCorrespondence(g)));
const baseGames = computed(() => currentLobby.value === 'live' ? liveGames.value : correspondenceGames.value);

const maxRating = (game: HostedGame): number => {
    return Math.max(
        ...game.hostedGameToPlayers.map(p => p.player?.currentRating?.rating ?? 1500),
    );
};

const sortedGames = computed(() => {
    const games = [...baseGames.value];

    switch (sort.value) {
        case 'recently-started':
            return games.sort((a, b) => {
                if (!a.startedAt) return 1;
                if (!b.startedAt) return -1;
                return b.startedAt.getTime() - a.startedAt.getTime();
            });

        case 'most-moves':
            return games.sort((a, b) => b.moves.length - a.moves.length);

        case 'longest':
            return games.sort((a, b) => {
                if (!a.startedAt) return 1;
                if (!b.startedAt) return -1;
                return a.startedAt.getTime() - b.startedAt.getTime();
            });

        case 'player-rating':
            return games.sort((a, b) => maxRating(b) - maxRating(a));
    }
});
</script>

<template>
    <div class="container-fluid my-3">
        <h1 class="h3 mb-3">{{ $t('playing_games.title') }}</h1>

        <!-- Type switcher -->
        <div class="btn-group mb-4" role="group" aria-label="Game type">
            <button
                @click="setLobby('live')"
                class="btn"
                :class="currentLobby === 'live' ? 'btn-success' : 'btn-outline-secondary'"
                type="button"
            >
                <IconLightningChargeFill /> {{ $t('time_cadency.normal') }}
                <span class="badge ms-1" :class="currentLobby === 'live' ? 'text-bg-light' : 'text-bg-success'">{{ liveGames.length }}</span>
            </button>
            <button
                @click="setLobby('correspondence')"
                class="btn"
                :class="currentLobby === 'correspondence' ? 'btn-warning' : 'btn-outline-secondary'"
                type="button"
            >
                <IconCalendar /> {{ $t('time_cadency.correspondence') }}
                <span class="badge ms-1" :class="currentLobby === 'correspondence' ? 'text-bg-dark' : 'text-bg-warning'">{{ correspondenceGames.length }}</span>
            </button>
        </div>

        <!-- Games card -->
        <div class="card">
            <div class="card-header d-flex align-items-center gap-2 flex-wrap">
                <span class="fw-bold me-auto">
                    {{ $t(currentLobby === 'live' ? 'playing_games.live_games' : 'playing_games.correspondence_games') }}
                    <span class="badge text-bg-secondary ms-1">{{ baseGames.length }}</span>
                </span>

                <!-- Sort -->
                <select v-model="sort" class="form-select form-select-sm w-auto">
                    <option value="recently-started">{{ $t('sort_recently_started') }}</option>
                    <option value="most-moves">{{ $t('sort_most_moves') }}</option>
                    <option value="longest">{{ $t('sort_longest_game') }}</option>
                    <option value="player-rating">{{ $t('sort_player_rating') }}</option>
                </select>

                <!-- View toggle -->
                <div class="btn-group btn-group-sm" role="group" aria-label="View mode">
                    <button
                        @click="view = 'top'"
                        class="btn"
                        :class="view === 'top' ? 'btn-secondary' : 'btn-outline-secondary'"
                        type="button"
                        :title="`Top ${TOP_COUNT} thumbnails`"
                    ><IconGrid3x3GapFill /> Top {{ TOP_COUNT }}</button>
                    <button
                        @click="view = 'all'"
                        class="btn"
                        :class="view === 'all' ? 'btn-secondary' : 'btn-outline-secondary'"
                        type="button"
                        title="All games as table"
                    ><IconList /> {{ $t('all') }}</button>
                </div>
            </div>

            <div v-if="loading" class="card-body text-secondary">
                <i>{{ $t('loading') }}</i>
            </div>

            <div v-else-if="baseGames.length === 0" class="card-body text-secondary">
                <i>{{ $t(currentLobby === 'live' ? 'playing_games.no_live_games' : 'playing_games.no_correspondence_games') }}</i>
            </div>

            <!-- Thumbnail grid (top view) -->
            <div v-else-if="view === 'top'" class="card-body">
                <div class="row g-2">
                    <div
                        v-for="game in sortedGames.slice(0, TOP_COUNT)"
                        :key="game.publicId"
                        class="col-12 col-sm-6 col-md-4 col-xl-3"
                    >
                        <AppGameThumbnailLobbyLiveCard :gamePublicId="game.publicId" />
                    </div>
                </div>
            </div>

            <!-- Table (all view) -->
            <div v-else class="table-responsive">
                <table class="table table-borderless table-hover mb-0">
                    <thead>
                        <tr class="small text-body-secondary">
                            <th></th>
                            <th>{{ $t('game.red') }}</th>
                            <th>{{ $t('game.blue') }}</th>
                            <th>{{ $t('game.size') }}</th>
                            <th>{{ $t('game.time_control') }}</th>
                            <th>{{ $t('moves') }}</th>
                            <th>{{ $t('game.duration') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="game in sortedGames" :key="game.publicId">
                            <td>
                                <router-link
                                    class="btn btn-sm btn-outline-secondary py-0"
                                    :to="{ name: 'online-game', params: { gameId: game.publicId } }"
                                >{{ $t('game.watch') }}</router-link>
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
