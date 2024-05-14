<script setup lang="ts">
/* eslint-env browser */
import useLobbyStore from '@client/stores/lobbyStore';
import { useRouter } from 'vue-router';
import { createOverlay } from 'unoverlay-vue';
import Create1v1Overlay, { Create1v1OverlayInput } from '@client/vue/components/overlay/Create1v1Overlay.vue';
import Create1vAIOverlay, { Create1vAIOverlayInput } from '@client/vue/components/overlay/Create1vAIOverlay.vue';
import Create1vOfflineAIOverlay, { Create1vOfflineAIOverlayInput } from '@client/vue/components/overlay/Create1vOfflineAIOverlay.vue';
import HostedGameOptions from '../../../shared/app/models/HostedGameOptions';
import { timeControlToCadencyName } from '@shared/app/timeControlUtils';
import Player from '../../../shared/app/models/Player';
import AppSidebar from '@client/vue/components/layout/AppSidebar.vue';
import AppGameRulesSummary from '@client/vue/components/AppGameRulesSummary.vue';
import HostedGameClient from '../../HostedGameClient';
import useAuthStore from '@client/stores/authStore';
import AppPseudoWithOnlineStatus from '../components/AppPseudoWithOnlineStatus.vue';
import { BIconEye, BIconTrophy, BIconPeople, BIconRobot } from 'bootstrap-icons-vue';
import AppTimeControlLabelVue from '../components/AppTimeControlLabel.vue';
import { useSeoMeta } from '@unhead/vue';
import { formatDistanceToNowStrict } from 'date-fns';
import i18next from 'i18next';

const { t } = i18next;

useSeoMeta({
    titleTemplate: title => `${t('lobby_title')} - ${title}`,
});

const router = useRouter();
const lobbyStore = useLobbyStore();

const goToGame = (gameId: string) => {
    router.push({
        name: 'online-game',
        params: {
            gameId,
        },
    });
};

/*
 * 1 vs 1
 */
const create1v1Overlay = createOverlay<Create1v1OverlayInput, HostedGameOptions>(Create1v1Overlay);

const create1v1AndJoinGame = async () => {
    try {
        const gameOptions = await create1v1Overlay({
            gameOptions: {
                opponentType: 'player',
            },
        });

        const hostedGameClient = await lobbyStore.createGame(gameOptions);
        goToGame(hostedGameClient.getId());
    } catch (e) {
        // noop, player just closed popin
    }
};

/*
 * 1 vs AI
 */
const create1vAIOverlay = createOverlay<Create1vAIOverlayInput, HostedGameOptions>(Create1vAIOverlay);

const create1vAIAndJoinGame = async () => {
    try {
        const gameOptions = await create1vAIOverlay({
            gameOptions: {
                opponentType: 'ai',
            },
        });

        const hostedGameClient = await lobbyStore.createGame(gameOptions);
        goToGame(hostedGameClient.getId());
    } catch (e) {
        // noop, player just closed popin
    }
};

/*
 * Local play
 */
const create1vOfflineAIOverlay = createOverlay<Create1vOfflineAIOverlayInput, HostedGameOptions>(Create1vOfflineAIOverlay);

const createAndJoinGameVsLocalAI = async () => {
    try {
        const gameOptions = await create1vOfflineAIOverlay();

        router.push({
            name: 'play-vs-ai',
            state: {
                gameOptionsJson: JSON.stringify(gameOptions),
            },
        });
    } catch (e) {
        // noop, player just closed popin
    }
};

/*
 * Utils functions
 */
const isWaiting = (hostedGameClient: HostedGameClient) =>
    'created' === hostedGameClient.getHostedGame().state
;

const isPlaying = (hostedGameClient: HostedGameClient) =>
    'playing' === hostedGameClient.getHostedGame().state
;

const lobbyFilter = (hostedGameClient: HostedGameClient) => {
    if (!isPlaying(hostedGameClient)) return false;
    const startTime = hostedGameClient.getHostedGame().gameData?.startedAt ?? hostedGameClient.getHostedGame().createdAt;
    const days = (Date.now() - startTime.getTime()) / 86400000;
    const lastMove = hostedGameClient.getHostedGame().gameData?.lastMoveAt;
    // Hide games with no moves and >= 1 days since the game start
    return days < 1 || lastMove != null;
};

const isFinished = (hostedGameClient: HostedGameClient) =>
    'ended' === hostedGameClient.getHostedGame().state
;

const joinGame = async (gameId: string) => {
    const hostedGameClient = await lobbyStore.retrieveHostedGameClient(gameId);

    if (null === hostedGameClient) {
        throw new Error(`Cannot join game "${gameId}", game does not exists`);
    }

    hostedGameClient.sendJoinGame();
};

const isUncommonBoardsize = (hostedGameClient: HostedGameClient): boolean => {
    const { boardsize } = hostedGameClient.getGameOptions();

    return boardsize < 9 || boardsize > 19;
};

// Sort games in the "current games" and "join a game" sections
const gameComparator = (a: HostedGameClient, b: HostedGameClient): number => {
    // All bots games are placed at the end. Correspondence games are placed
    // after real-time games. The third factor is start time (if not existent,
    // then creation time).

    const botA = a.getPlayers().some(p => p.isBot);
    const botB = b.getPlayers().some(p => p.isBot);

    if (!botA && botB)
        return -1;

    if (botA && !botB)
        return 1;

    const timeA = timeControlToCadencyName(a.getGameOptions());
    const timeB = timeControlToCadencyName(b.getGameOptions());

    if (timeA !== 'correspondance' && timeB === 'correspondance')
        return -1;

    if (timeA === 'correspondance' && timeB !== 'correspondance')
        return 1;

    const hostedDataA = a.getHostedGame();
    const hostedDataB = b.getHostedGame();

    const startedAtA = hostedDataA.gameData?.startedAt;
    const startedAtB = hostedDataB.gameData?.startedAt;

    if (startedAtA != null && startedAtB != null)
        return startedAtB.getTime() - startedAtA.getTime();

    return hostedDataB.createdAt.getTime() - hostedDataA.createdAt.getTime();
};

/**
 * Finished games
 */
const byEndedAt = (a: HostedGameClient, b: HostedGameClient): number => {
    const gameDataA = a.getHostedGame().gameData;
    const gameDataB = b.getHostedGame().gameData;

    if (!gameDataA?.endedAt || !gameDataB?.endedAt) {
        return 0;
    }

    return gameDataB.endedAt.getTime() - gameDataA.endedAt.getTime();
};
</script>

<template>
    <div class="container-fluid my-3">
        <div class="row">
            <div class="col-sm-9">
                <h3>{{ $t('new_game') }}</h3>

                <div class="play-buttons row">
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="() => create1v1AndJoinGame()"><BIconPeople class="fs-3" /><br>{{ $t('1v1') }}</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-primary" @click="() => create1vAIAndJoinGame()"><BIconRobot class="fs-3" /><br>{{ $t('play_vs_ai') }}</button>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3 mb-4">
                        <button type="button" class="btn w-100 btn-outline-primary" @click="createAndJoinGameVsLocalAI"><BIconRobot class="fs-3" /><br>{{ $t('play_vs_offline_ai') }}</button>
                    </div>
                </div>

                <h3>{{ $t('lobby.join_a_game') }}</h3>

                <div v-if="Object.values(lobbyStore.hostedGameClients).some(isWaiting)" class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th scope="col"></th>
                                <th scope="col">{{ $t('game.host') }}</th>
                                <th scope="col">{{ $t('game.size') }}</th>
                                <th scope="col">{{ $t('game.time_control') }}</th>
                                <th scope="col">{{ $t('game.rules') }}</th>
                                <th scope="col">{{ $t('game.created') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(isWaiting).sort(gameComparator)"
                                :key="hostedGameClient.getId()"
                            >
                                <td>
                                    <button
                                        v-if="hostedGameClient.canJoin(useAuthStore().loggedInPlayer)"
                                        class="btn me-3 btn-sm btn-success"
                                        @click="joinGame(hostedGameClient.getId()); goToGame(hostedGameClient.getId())"
                                    >{{ $t('game.accept') }}</button>

                                    <router-link
                                        class="btn me-3 btn-sm btn-link"
                                        :to="{ name: 'online-game', params: { gameId: hostedGameClient.getId() } }"
                                    >{{ $t('game.watch') }}</router-link>
                                </td>
                                <td><AppPseudoWithOnlineStatus :player="hostedGameClient.getHostedGame().host" /></td>
                                <td :class="isUncommonBoardsize(hostedGameClient) ? 'text-warning' : ''">{{ hostedGameClient.getGameOptions().boardsize }}</td>
                                <td><AppTimeControlLabelVue :gameOptions="hostedGameClient.getGameOptions()" /></td>
                                <td><AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></td>
                                <td>{{
                                    formatDistanceToNowStrict(hostedGameClient.getHostedGame().createdAt, { addSuffix: true })
                                }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else>{{ $t('lobby.no_waiting_games') }}</p>

                <h4><BIconEye /> {{ $t('lobby.watch_current_games') }}</h4>

                <div v-if="Object.values(lobbyStore.hostedGameClients).some(isPlaying)" class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th scope="col"></th>
                                <th scope="col" class="d-none d-sm-table-cell">{{ $t('game.red') }}</th>
                                <th scope="col" class="d-none d-sm-table-cell">{{ $t('game.blue') }}</th>
                                <th scope="col" class="d-table-cell d-sm-none">{{ $t('players') }}</th>
                                <th scope="col">{{ $t('game.size') }}</th>
                                <th scope="col">{{ $t('game.time_control') }}</th>
                                <th scope="col">{{ $t('game.started') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(lobbyFilter).sort(gameComparator)"
                                :key="hostedGameClient.getId()"
                            >
                                <td class="ps-0">
                                    <router-link
                                        class="btn btn-sm btn-link"
                                        :to="{ name: 'online-game', params: { gameId: hostedGameClient.getId() } }"
                                    >{{ $t('game.watch') }}</router-link>
                                </td>
                                <td class="d-none d-sm-table-cell"><AppPseudoWithOnlineStatus :player="(hostedGameClient.getPlayer(0) as Player)" /></td>
                                <td class="d-none d-sm-table-cell"><AppPseudoWithOnlineStatus :player="(hostedGameClient.getPlayer(1) as Player)" /></td>
                                <td class="d-table-cell d-sm-none">
                                    <AppPseudoWithOnlineStatus :player="(hostedGameClient.getPlayer(0) as Player)" />
                                    <br>
                                    <AppPseudoWithOnlineStatus :player="(hostedGameClient.getPlayer(1) as Player)" />
                                </td>
                                <td>{{ hostedGameClient.getHostedGame().gameOptions.boardsize }}</td>
                                <td><AppTimeControlLabelVue :gameOptions="hostedGameClient.getGameOptions()" /></td>
                                <td>{{
                                    formatDistanceToNowStrict(hostedGameClient.getHostedGame().gameData?.startedAt ?? 0, { addSuffix: true })
                                }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else>{{ $t('lobby.no_playing_games') }}</p>

                <h4><BIconTrophy /> {{ $t('finished_games') }}</h4>

                <div v-if="Object.values(lobbyStore.hostedGameClients).some(isFinished)" class="table-responsive">
                    <table class="table table-responsive" style="margin-bottom: 0">
                        <thead>
                            <tr>
                                <th scope="col"></th>
                                <th scope="col">{{ $t('game.won') }}</th>
                                <th scope="col">{{ $t('game.lost') }}</th>
                                <th scope="col">{{ $t('game.size') }}</th>
                                <th scope="col">{{ $t('game.time_control') }}</th>
                                <th scope="col">{{ $t('game.finished') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="hostedGameClient in Object.values(lobbyStore.hostedGameClients).filter(isFinished).sort(byEndedAt)"
                                :key="hostedGameClient.getId()"
                            >
                                <td class="ps-0">
                                    <router-link
                                        class="btn btn-sm btn-link"
                                        :to="{ name: 'online-game', params: { gameId: hostedGameClient.getId() } }"
                                    >{{ $t('game.review') }}</router-link>
                                </td>
                                <template v-if="hostedGameClient.getHostedGame()?.gameData?.winner != null">
                                    <td><AppPseudoWithOnlineStatus :player="(hostedGameClient.getWinnerPlayer() as Player)" is="strong" /></td>
                                    <td><AppPseudoWithOnlineStatus :player="(hostedGameClient.getLoserPlayer() as Player)" classes="text-body-secondary" /></td>
                                </template>
                                <template v-else>
                                    <td>-</td>
                                    <td>-</td>
                                </template>
                                <td>{{ hostedGameClient.getHostedGame().gameOptions.boardsize }}</td>
                                <td><AppTimeControlLabelVue :gameOptions="hostedGameClient.getGameOptions()" /></td>
                                <td>{{
                                    formatDistanceToNowStrict(hostedGameClient.getHostedGame().gameData?.endedAt ?? 0, { addSuffix: true })
                                }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <button
                        class="btn btn-sm btn-link"
                        @click="() => lobbyStore.loadMoreEndedGames()"
                    >{{ $t('load_more') }}</button>
                </div>
            </div>
            <div class="col-sm-3">
                <AppSidebar />
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.play-buttons
    .btn
        min-height 7em

h4
    margin-top 1em

tr
    td:first-child, th:first-child
        padding-left 0

    td:last-child, th:last-child
        padding-right 0
</style>
