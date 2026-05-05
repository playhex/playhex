<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useMyGamesStore from '../../stores/myGamesStore.js';
import useLobbyStore from '../../stores/lobbyStore.js';
import useAuthStore from '../../stores/authStore.js';
import AppGameThumbnail from '../components/AppGameThumbnail.vue';
import AppChrono from '../components/AppChrono.vue';
import AppCreateGameButtons from '../components/AppCreateGameButtons.vue';
import AppTimeControlLabel from '../components/AppTimeControlLabel.vue';
import { getMyIndex, getOpponent } from '../../services/context-utils.js';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import AppPseudo from '../components/AppPseudo.vue';
import { canJoin, getStrictWinnerPlayer, getStrictLoserPlayer, isBotGame } from '../../../shared/app/hostedGameUtils.js';
import { isUncommonBoardsize } from '../../../shared/app/hostedGameOptionsUtils.js';
import { HostedGame, Tournament } from '../../../shared/app/models/index.js';
import { formatDistanceToNowStrict } from 'date-fns';
import { useRouter } from 'vue-router';
import { useGuestJoiningCorrespondenceWarning } from '../composables/guestJoiningCorrespondenceWarning.js';
import { onBeforeMount, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { apiGetActiveTournaments } from '../../apiClient.js';
import useToastsStore from '../../stores/toastsStore.js';
import { Toast } from '../../../shared/app/Toast.js';
import AppFeaturedTournamentCard from '../tournaments/components/AppFeaturedTournamentCard.vue';
import AppCijmTournamentCard2026 from '../components/AppCijmTournamentCard2026.vue';
import AppLobbyModeSwitcher from '../components/AppLobbyModeSwitcher.vue';
import { IconCircleFill, IconSearch, IconTrophyFill } from '../icons.js';
import AppLobbyFeaturesLiveGames from '../components/AppLobbyFeaturesLiveGames.vue';
import AppLobbyFeaturesCorrespondenceGames from '../components/AppLobbyFeaturesCorrespondenceGames.vue';
import AppTutorialCard from '../components/AppTutorialCard.vue';
import { useElementHover } from '@vueuse/core';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore.js';
import AppRhombusAutoOrientation from '../components/AppRhombusAutoOrientation.vue';
import AppGameRulesSummary from '../components/AppGameRulesSummary.vue';

useHead({
    title: t('lobby_title'),
});

const router = useRouter();
const { mySortedGames, myTurnCount } = storeToRefs(useMyGamesStore());
const { activePlayersCount } = storeToRefs(useOnlinePlayersStore());
const lobbyStore = useLobbyStore();
const { clearSoftRemovedGames, excludeSoftRemoved } = lobbyStore;
const { currentLobby, currentLobbyHostedGames, endedHostedGames } = storeToRefs(lobbyStore);
const authStore = useAuthStore();

const {
    createGuestJoiningCorrepondenceWarningOverlay,
    isGuestJoiningCorrepondence,
} = useGuestJoiningCorrespondenceWarning();

const joinGame = async (hostedGame: HostedGame) => {
    if (isGuestJoiningCorrepondence(hostedGame)) {
        try {
            await createGuestJoiningCorrepondenceWarningOverlay();
        } catch (e) {
            return;
        }
    }

    try {
        await lobbyStore.joinGame(hostedGame.publicId);
    } catch (e) {
        useToastsStore().addToast(new Toast('Could not join game', { level: 'danger' }));
        return;
    }

    await router.push({
        name: 'online-game',
        params: { gameId: hostedGame.publicId },
    });
};

// Featured tournaments
const featuredTournaments = ref<null | Tournament[]>(null);

void (async () => {
    featuredTournaments.value = await apiGetActiveTournaments({
        featured: true,
    });
})();

// Clear soft removed games
const gamesListElement = useTemplateRef('gamesList');
const isHovered = useElementHover(gamesListElement);

// Desktop: clears when mouse leave games list
// Mobile: clears when tap outside games list, but only after tapped inside.
watch(isHovered, hovered => {
    if (!hovered) {
        clearSoftRemovedGames();
    }
});

onBeforeMount(() => clearSoftRemovedGames(true));
onBeforeUnmount(() => clearSoftRemovedGames(true));
</script>

<template>
    <div class="container-fluid my-3">

        <div class="row">
            <div class="col-md-8">

                <AppTutorialCard />

                <!-- My turn to play -->
                <section v-if="mySortedGames && mySortedGames.length > 0" class="mb-4">
                    <div class="d-flex align-items-center justify-content-between">
                        <h2 class="d-flex align-items-center gap-2">
                            {{ myTurnCount > 0 ? $t('lobby_my_turn_to_play') : $t('lobby_my_current_games') }}
                            <span v-if="myTurnCount > 0" class="badge text-bg-danger">{{ myTurnCount }}</span>
                        </h2>
                    </div>

                    <div class="d-flex flex-nowrap gap-3 overflow-auto pb-2">
                        <router-link
                            v-for="(myGame, i) of mySortedGames"
                            :key="myGame.publicId"
                            :to="{ name: 'online-game', params: { gameId: myGame.publicId } }"
                            class="card flex-shrink-0 game-card text-decoration-none"
                            :class="myGame.isMyTurn ? (isBotGame(myGame.hostedGame) ? 'border-primary' : 'border-success') : ''"
                        >
                            <div class="card-body p-2 d-flex flex-column align-items-center gap-1">
                                <div class="d-flex align-items-center gap-1 w-100 justify-content-between">
                                    <span class="small text-body-secondary">vs</span>
                                    <span class="fw-semibold small text-truncate text-body text-right">
                                        <AppPseudo v-if="myGame.hostedGame" :player="getOpponent(myGame.hostedGame)!" rating onlineStatus />
                                    </span>
                                </div>

                                <AppGameThumbnail v-if="i < 6" :gamePublicId="myGame.publicId" class="game-thumb" />
                                <!-- Prevent displaying too many game views here -->
                                <AppRhombusAutoOrientation v-else class="game-thumb" />

                                <div class="d-flex justify-content-between w-100 align-items-end">
                                    <template v-if="!isBotGame(myGame.hostedGame)">
                                        <span v-if="myGame.isMyTurn" class="badge text-bg-success pulse-badge">{{ $t('lobby_your_turn_badge') }}</span>
                                        <span v-else class="badge text-bg-secondary">{{ $t('lobby_waiting_badge') }}</span>
                                    </template>

                                    <!-- empty div to align chrono right -->
                                    <span v-else class="badge text-bg-primary">{{ $t('bot') }}</span>

                                    <AppChrono
                                        v-if="getMyIndex(myGame.hostedGame) !== null && myGame.hostedGame.timeControl?.players[getMyIndex(myGame.hostedGame)!]"
                                        :playerTimeData="myGame.hostedGame.timeControl.players[getMyIndex(myGame.hostedGame)!]"
                                        :timeControlOptions="myGame.hostedGame.timeControlType"
                                        class="chrono"
                                    />
                                </div>
                            </div>
                        </router-link>
                    </div>
                </section>

                <!-- switch live/correspondence -->
                <AppLobbyModeSwitcher class="mb-4" />

                <!-- Create game -->
                <h2>{{ $t('new_game') }}</h2>

                <AppCreateGameButtons />

                <!-- Open games -->
                <section class="mb-4">
                    <div class="card" ref="gamesList">
                        <div class="card-header d-flex align-items-center justify-content-between">
                            <span class="fw-bold">{{ $t(currentLobby === 'live' ? 'lobby.open_live_games' : 'lobby.open_correspondence_games') }}</span>
                            <span class="badge text-bg-secondary">{{ currentLobbyHostedGames.filter(excludeSoftRemoved).length }}</span>
                        </div>
                        <div v-if="currentLobbyHostedGames.length > 0" class="table-responsive waiting-games-list">
                            <table class="table text-nowrap table-borderless table-hover mb-0">
                                <thead>
                                    <tr class="small text-body-secondary">
                                        <th></th>
                                        <th>{{ $t('game.host') }}</th>
                                        <th>{{ $t('game.size') }}</th>
                                        <th>{{ $t('game.time_control') }}</th>
                                        <th>{{ $t('game.rules') }}</th>
                                        <th>{{ $t('game.created') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="hostedGame in currentLobbyHostedGames" :key="hostedGame.publicId" :class="{ 'soft-removed': hostedGame.softRemoved }">
                                        <td>
                                            <router-link
                                                class="btn btn-sm btn-outline-secondary py-0"
                                                :to="{ name: 'online-game', params: { gameId: hostedGame.publicId } }"
                                            >{{ $t('game.watch') }}</router-link>
                                            <button
                                                v-if="canJoin(hostedGame, authStore.loggedInPlayer)"
                                                class="btn btn-sm py-0 ms-2"
                                                :class="hostedGame.softRemoved ? 'btn-outline-secondary text-decoration-line-through' : isGuestJoiningCorrepondence(hostedGame) ? 'btn-outline-warning' : 'btn-success'"
                                                @click="joinGame(hostedGame)"
                                                :disabled="Boolean(hostedGame.softRemoved)"
                                            >{{ $t('lobby_join') }}</button>
                                            <span v-if="hostedGame.ranked" class="text-warning ms-2"><IconTrophyFill /> {{ $t('ranked') }}</span>
                                        </td>
                                        <td>
                                            <AppPseudo v-if="hostedGame.host" :player="hostedGame.host" onlineStatus rating />
                                            <i v-else>{{ $t('system') }}</i>
                                        </td>
                                        <template v-if="!hostedGame.softRemoved">
                                            <td :class="{ 'text-warning': isUncommonBoardsize(hostedGame) }">{{ hostedGame.boardsize }}×{{ hostedGame.boardsize }}</td>
                                            <td><AppTimeControlLabel :timeControlBoardsize="hostedGame" /></td>
                                            <td class="small"><AppGameRulesSummary :gameOptions="hostedGame" /></td>
                                            <td class="text-body-secondary small">{{ formatDistanceToNowStrict(hostedGame.createdAt, { addSuffix: true }) }}</td>
                                        </template>
                                        <td v-else colspan="4"><small>{{ $t('lobby_game_no_longer_available') }}</small></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="card-body waiting-games-list">
                            <div class="card-text text-secondary"><i>{{ $t(currentLobby === 'live' ? 'lobby.no_open_live_games' : 'lobby.no_open_correspondence_games') }}</i></div>
                        </div>
                    </div>
                </section>

                <!-- Featured playing games -->
                <AppLobbyFeaturesLiveGames v-if="currentLobby === 'live'" />
                <AppLobbyFeaturesCorrespondenceGames v-else-if="currentLobby === 'correspondence'" />

                <!-- Recent games -->
                <section v-if="endedHostedGames.length > 0" class="mb-4">
                    <div class="card">
                        <div class="card-header d-flex align-items-center justify-content-between">
                            <span class="fw-bold">{{ $t('finished_games') }}</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table text-nowrap table-borderless table-hover mb-0">
                                <thead>
                                    <tr class="small text-secondary">
                                        <th></th>
                                        <th></th>
                                        <th>{{ $t('game.won') }}</th>
                                        <th>{{ $t('game.lost') }}</th>
                                        <th>{{ $t('game.size') }}</th>
                                        <th>{{ $t('game.time_control') }}</th>
                                        <th>{{ $t('game.finished') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="hostedGame in endedHostedGames" :key="hostedGame.publicId">
                                        <td>
                                            <router-link
                                                class="btn btn-sm btn-outline-secondary py-0"
                                                :to="{ name: 'online-game', params: { gameId: hostedGame.publicId } }"
                                            >{{ $t('game.review') }}</router-link>
                                        </td>
                                        <td><span v-if="hostedGame.ranked" class="text-warning"><IconTrophyFill /> <span class="d-none d-sm-inline">{{ $t('ranked') }}</span></span></td>
                                        <template v-if="hostedGame.winner !== null">
                                            <td><AppPseudo :player="getStrictWinnerPlayer(hostedGame)" rating classes="fw-semibold" /></td>
                                            <td><AppPseudo :player="getStrictLoserPlayer(hostedGame)" rating classes="text-body-secondary" /></td>
                                        </template>
                                        <template v-else>
                                            <td colspan="2" class="text-body-secondary">-</td>
                                        </template>
                                        <td>{{ hostedGame.boardsize }}×{{ hostedGame.boardsize }}</td>
                                        <td><AppTimeControlLabel :timeControlBoardsize="hostedGame" /></td>
                                        <td class="text-body-secondary small">{{ formatDistanceToNowStrict(hostedGame.endedAt ?? hostedGame.createdAt, { addSuffix: true }) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="card-footer">
                            <router-link class="btn btn-link text-decoration-none p-0" :to="{ name: 'games-archive' }">
                                <small><IconSearch /> {{ $t('browse_all_ended_games') }}</small>
                            </router-link>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Sidebar -->
            <div class="col-md-4">

                <!-- Active players count -->
                <router-link
                    :to="{ name: 'online-players' }"
                    class="card mb-3 text-decoration-none active-players-card"
                >
                    <div class="card-body py-2 d-flex align-items-center gap-2">
                        <IconCircleFill class="text-success active-players-icon" />
                        <span class="fw-semibold">{{ activePlayersCount ?? '…' }}</span>
                        <span class="text-body-secondary">{{ $t('lobby_active_players', { count: activePlayersCount }) }}</span>
                    </div>
                </router-link>

                <!-- Upcoming events -->
                <template v-if="featuredTournaments && featuredTournaments.length > 0">
                    <h2>{{ $t('upcoming_events') }}</h2>
                </template>

                <AppCijmTournamentCard2026 />

                <AppFeaturedTournamentCard
                    v-for="tournament in featuredTournaments"
                    :key="tournament.publicId"
                    :tournament
                />

            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.game-card
    width 12em

.game-thumb
    margin auto
    height 95px

.chrono
    font-size 0.75em
    font-family monospace

.event-card
    background var(--bs-body-bg)
    overflow hidden

.event-bg-icon
    position absolute
    top 0.4rem
    right 0.3rem
    font-size 4.5rem
    opacity 0.1
    pointer-events none

.event-meta
    font-size 0.75em

@css {
    @keyframes pulse-ring {
        0%   { box-shadow: 0 0 0 0   rgba(var(--bs-success-rgb), 0.7); }
        70%  { box-shadow: 0 0 0 7px rgba(var(--bs-success-rgb), 0); }
        100% { box-shadow: 0 0 0 0   rgba(var(--bs-success-rgb), 0); }
    }
}

.pulse-badge
    animation pulse-ring 2s ease-in-out infinite

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

.waiting-games-list
    height 14em

.active-players-icon
    font-size 0.65em

tr.soft-removed, tr.soft-removed *
    color var(--bs-secondary-color) !important
</style>
