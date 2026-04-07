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
import { canJoin, getStrictWinnerPlayer, getStrictLoserPlayer } from '../../../shared/app/hostedGameUtils.js';
import { HostedGame, Tournament } from '../../../shared/app/models/index.js';
import { formatDistanceToNowStrict } from 'date-fns';
import { useRouter } from 'vue-router';
import { useGuestJoiningCorrespondenceWarning } from '../composables/guestJoiningCorrespondenceWarning.js';
import { ref } from 'vue';
import { apiGetActiveTournaments } from '../../apiClient.js';
import AppFeaturedTournamentCard from '../tournaments/components/AppFeaturedTournamentCard.vue';
import AppCijmTournamentCard2026 from '../components/AppCijmTournamentCard2026.vue';
import AppLobbyModeSwitcher from '../components/AppLobbyModeSwitcher.vue';
import { IconSearch } from '../icons.js';
import AppLobbyFeaturesLiveGames from '../components/AppLobbyFeaturesLiveGames.vue';

useHead({
    title: t('lobby_title'),
});

const router = useRouter();
const { mySortedGames, myTurnCount } = storeToRefs(useMyGamesStore());
const lobbyStore = useLobbyStore();
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

    await lobbyStore.joinGame(hostedGame.publicId);

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
</script>

<template>
    <div class="container-fluid my-3">

        <div class="row">
            <div class="col-md-8">

                <!-- My turn to play -->
                <section v-if="mySortedGames && mySortedGames.length > 0" class="mb-4">
                    <div class="d-flex align-items-center justify-content-between">
                        <h2>
                            My turn to play ({{ myTurnCount }})
                        </h2>
                    </div>

                    <div class="d-flex flex-nowrap gap-3 overflow-auto pb-2">
                        <router-link
                            v-for="myGame of mySortedGames"
                            :key="myGame.publicId"
                            :to="{ name: 'online-game', params: { gameId: myGame.publicId } }"
                            class="card flex-shrink-0 game-card text-decoration-none"
                            :class="myGame.isMyTurn ? 'border-success' : ''"
                        >
                            <div class="card-body p-2 d-flex flex-column align-items-center gap-1">
                                <div class="d-flex align-items-center gap-1 w-100 justify-content-between">
                                    <span class="small text-body-secondary">vs </span>
                                    <span class="fw-semibold small text-truncate text-body text-right">
                                        <AppPseudo v-if="myGame.hostedGame" :player="getOpponent(myGame.hostedGame)!" rating onlineStatus />
                                    </span>
                                </div>

                                <AppGameThumbnail :gamePublicId="myGame.publicId" class="game-thumb" />

                                <div class="d-flex justify-content-between w-100 align-items-center">
                                    <span v-if="myGame.isMyTurn" class="badge text-bg-success pulse-badge">Your turn</span>
                                    <span v-else class="badge text-bg-secondary">Waiting</span>

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
                <h2>Create game</h2>

                <AppCreateGameButtons />

                <!-- Open games -->
                <section class="mb-4">
                    <div class="card">
                        <div class="card-header d-flex align-items-center justify-content-between">
                            <span class="fw-bold">Open {{ currentLobby }} games</span>
                            <span class="badge text-bg-secondary">{{ currentLobbyHostedGames.length }}</span>
                        </div>
                        <div v-if="currentLobbyHostedGames.length > 0" class="table-responsive waiting-games-list">
                            <table class="table table-borderless table-hover mb-0">
                                <thead>
                                    <tr class="small text-body-secondary">
                                        <th></th>
                                        <th>Host</th>
                                        <th>Size</th>
                                        <th>Time control</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="hostedGame in currentLobbyHostedGames" :key="hostedGame.publicId">
                                        <td>
                                            <router-link
                                                class="btn btn-sm btn-outline-secondary py-0"
                                                :to="{ name: 'online-game', params: { gameId: hostedGame.publicId } }"
                                            >Watch</router-link>
                                            <button
                                                v-if="canJoin(hostedGame, authStore.loggedInPlayer)"
                                                class="btn btn-sm py-0 ms-2"
                                                :class="isGuestJoiningCorrepondence(hostedGame) ? 'btn-outline-warning' : 'btn-success'"
                                                @click="joinGame(hostedGame)"
                                            >Join</button>
                                        </td>
                                        <td>
                                            <AppPseudo v-if="hostedGame.host" :player="hostedGame.host" onlineStatus rating />
                                            <i v-else>System</i>
                                        </td>
                                        <td>{{ hostedGame.boardsize }}×{{ hostedGame.boardsize }}</td>
                                        <td><AppTimeControlLabel :timeControlBoardsize="hostedGame" /></td>
                                        <td class="text-body-secondary small">{{ formatDistanceToNowStrict(hostedGame.createdAt, { addSuffix: true }) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="card-body waiting-games-list">
                            <div class="card-text text-secondary"><i>No open {{ currentLobby }} games for now</i></div>
                        </div>
                    </div>
                </section>

                <!-- Featured playing games -->
                <AppLobbyFeaturesLiveGames v-if="currentLobby === 'live'" />

                <!-- Recent games -->
                <section v-if="endedHostedGames.length > 0" class="mb-4">
                    <div class="card">
                        <div class="card-header d-flex align-items-center justify-content-between">
                            <span class="fw-bold">{{ $t('finished_games') }}</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-borderless table-hover mb-0">
                                <thead>
                                    <tr class="small text-secondary">
                                        <th></th>
                                        <th>{{ $t('game.won') }}</th>
                                        <th>{{ $t('game.lost') }}</th>
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
                                        <template v-if="hostedGame.winner !== null">
                                            <td><AppPseudo :player="getStrictWinnerPlayer(hostedGame)" rating classes="fw-semibold" /></td>
                                            <td><AppPseudo :player="getStrictLoserPlayer(hostedGame)" rating classes="text-body-secondary" /></td>
                                        </template>
                                        <template v-else>
                                            <td colspan="2" class="text-body-secondary">-</td>
                                        </template>
                                        <td class="text-body-secondary small">{{ formatDistanceToNowStrict(hostedGame.endedAt ?? hostedGame.createdAt, { addSuffix: true }) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="card-footer">
                            <router-link class="btn btn-link text-decoration-none px-0" :to="{ name: 'games-archive' }">
                                <IconSearch /> {{ $t('browse_all_ended_games') }}
                            </router-link>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Sidebar -->
            <div class="col-md-4">

                <!-- Upcoming events -->
                <template v-if="featuredTournaments && featuredTournaments.length > 0">
                    <h2>
                        Upcoming events
                    </h2>
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
    height 17em
</style>
