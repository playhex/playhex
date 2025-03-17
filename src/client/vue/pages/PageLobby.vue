<script setup lang="ts">
/* eslint-env browser */
import useLobbyStore from '../../stores/lobbyStore';
import { useRouter } from 'vue-router';
import { defineOverlay } from '@overlastic/vue';
import Create1v1RankedOverlay, { Create1v1RankedOverlayInput } from '../components/overlay/Create1v1RankedOverlay.vue';
import Create1v1FriendlyOverlay, { Create1v1FriendlyOverlayInput } from '../components/overlay/Create1v1FriendlyOverlay.vue';
import Create1vAIOverlay, { Create1vAIOverlayInput } from '../components/overlay/Create1vAIOverlay.vue';
import Create1vAIRankedOverlay, { Create1vAIRankedOverlayInput } from '../components/overlay/Create1vAIRankedOverlay.vue';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils';
import { HostedGame, HostedGameOptions } from '../../../shared/app/models';
import AppSidebar from '../components/layout/AppSidebar.vue';
import AppGameRulesSummary from '../components/AppGameRulesSummary.vue';
import useAuthStore from '../../stores/authStore';
import AppPseudo from '../components/AppPseudo.vue';
import { BIconEye, BIconTrophy, BIconPeople, BIconRobot, BIconTrophyFill, BIconSearch } from 'bootstrap-icons-vue';
import AppTimeControlLabel from '../components/AppTimeControlLabel.vue';
import { useSeoMeta } from '@unhead/vue';
import { formatDistanceToNowStrict } from 'date-fns';
import i18next from 'i18next';
import { createGameOptionsFromUrlHash } from '../../services/create-game-options-from-url-hash';
import { apiPostGame } from '../../apiClient';
import { canJoin, getPlayer, getStrictWinnerPlayer, getStrictLoserPlayer } from '../../../shared/app/hostedGameUtils';
import { useGuestJoiningCorrespondenceWarning } from '../composables/guestJoiningCorrespondenceWarning';

const updateSeoMeta = () => useSeoMeta({
    title: i18next.t('lobby_title'),
});

updateSeoMeta();
i18next.on('languageChanged', () => updateSeoMeta());

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
 * 1 vs 1 - ranked
 */
const create1v1RankedOverlay = defineOverlay<Create1v1RankedOverlayInput, HostedGameOptions>(Create1v1RankedOverlay);

const create1v1RankedAndJoinGame = async (gameOptions: HostedGameOptions = new HostedGameOptions()) => {
    gameOptions.opponentType = 'player';
    gameOptions.ranked = true;

    try {
        gameOptions = await create1v1RankedOverlay({ gameOptions });

        const hostedGame = await apiPostGame(gameOptions);
        goToGame(hostedGame.publicId);
    } catch (e) {
        // noop, player just closed popin
    }
};

/*
 * 1 vs 1 - friendly
 */
const create1v1FriendlyOverlay = defineOverlay<Create1v1FriendlyOverlayInput, HostedGameOptions>(Create1v1FriendlyOverlay);

const create1v1FriendlyAndJoinGame = async (gameOptions: HostedGameOptions = new HostedGameOptions()) => {
    gameOptions.opponentType = 'player';
    gameOptions.ranked = false;

    try {
        gameOptions = await create1v1FriendlyOverlay({ gameOptions });

        const hostedGame = await apiPostGame(gameOptions);
        goToGame(hostedGame.publicId);
    } catch (e) {
        // noop, player just closed popin
    }
};



/*
* 1 vs AI ranked
*/
const create1vAIRankedOverlay = defineOverlay<Create1vAIRankedOverlayInput, HostedGameOptions>(Create1vAIRankedOverlay);

/* global ALLOW_RANKED_BOT_GAMES */
// @ts-ignore: ALLOW_RANKED_BOT_GAMES replaced at build time by webpack.
const allowRankedBotGames: boolean = 'true' === ALLOW_RANKED_BOT_GAMES;

const create1vAIRankedAndJoinGame = async (gameOptions: HostedGameOptions = new HostedGameOptions()) => {
    gameOptions.opponentType = 'ai';
    gameOptions.ranked = true;

    try {
        gameOptions = await create1vAIRankedOverlay({ gameOptions });

        const hostedGame = await apiPostGame(gameOptions);
        goToGame(hostedGame.publicId);
    } catch (e) {
        // noop, player just closed popin
    }
};

/*
 * 1 vs AI
 */
const create1vAIOverlay = defineOverlay<Create1vAIOverlayInput, HostedGameOptions>(Create1vAIOverlay);

const create1vAIFriendlyAndJoinGame = async (gameOptions: HostedGameOptions = new HostedGameOptions()) => {
    gameOptions.opponentType = 'ai';
    gameOptions.ranked = false;

    try {
        gameOptions = await create1vAIOverlay({ gameOptions });

        const hostedGame = await apiPostGame(gameOptions);
        goToGame(hostedGame.publicId);
    } catch (e) {
        // noop, player just closed popin
    }
};

/*
 * Utils functions
 */
const isWaiting = (hostedGame: HostedGame) =>
    'created' === hostedGame.state
;

const isPlaying = (hostedGame: HostedGame) =>
    'playing' === hostedGame.state
;

const isFinished = (hostedGame: HostedGame) =>
    'ended' === hostedGame.state
;

const joinGame = async (hostedGame: HostedGame) => {
    if (isGuestJoiningCorrepondence(hostedGame)) {
        try {
            await createGuestJoiningCorrepondenceWarningOverlay();
        } catch (e) {
            return;
        }
    }

    const result = await lobbyStore.joinGame(hostedGame.publicId);

    if (true !== result) {
        throw new Error('Could not join game: ' + result);
    }

    goToGame(hostedGame.publicId);
};

const isUncommonBoardsize = (hostedGame: HostedGame): boolean => {
    const { boardsize } = hostedGame.gameOptions;

    return boardsize < 9 || boardsize > 19;
};

// Sort games in the "current games" and "join a game" sections
const gameComparator = (a: HostedGame, b: HostedGame): number => {
    // All bots games are placed at the end. Correspondence games are placed
    // after real-time games. The third factor is start time (if not existent,
    // then creation time).

    const botA = a.hostedGameToPlayers.some(p => p.player.isBot);
    const botB = b.hostedGameToPlayers.some(p => p.player.isBot);

    if (!botA && botB)
        return -1;

    if (botA && !botB)
        return 1;

    const timeA = timeControlToCadencyName(a.gameOptions);
    const timeB = timeControlToCadencyName(b.gameOptions);

    if (timeA !== 'correspondence' && timeB === 'correspondence')
        return -1;

    if (timeA === 'correspondence' && timeB !== 'correspondence')
        return 1;

    const startedAtA = a.gameData?.startedAt;
    const startedAtB = b.gameData?.startedAt;

    if (startedAtA != null && startedAtB != null)
        return startedAtB.getTime() - startedAtA.getTime();

    return b.createdAt.getTime() - a.createdAt.getTime();
};

/**
 * Finished games
 */
const byEndedAt = (a: HostedGame, b: HostedGame): number => {
    const gameDataA = a.gameData;
    const gameDataB = b.gameData;

    if (!gameDataA?.endedAt || !gameDataB?.endedAt) {
        return 0;
    }

    return gameDataB.endedAt.getTime() - gameDataA.endedAt.getTime();
};

/*
 * Auto create game with options from url hash
 * I.e "/#create-1v1" -> open create 1v1 popin with predefined parameters
 */
const createGameFromHash = () => {
    const gameOptions = createGameOptionsFromUrlHash();

    if (null === gameOptions) {
        return;
    }

    // Remove hash to allow re-open create game overlay in case of clicking on a link again
    document.location.hash = '';

    if ('player' === gameOptions.opponentType) {
        if (gameOptions.ranked) {
            create1v1RankedAndJoinGame(gameOptions);
        } else {
            create1v1FriendlyAndJoinGame(gameOptions);
        }
    } else {
        create1vAIFriendlyAndJoinGame(gameOptions);
    }
};

createGameFromHash();
window.addEventListener('hashchange', () => createGameFromHash());

/*
 * Warning when guest joining correspondence game
 */
const {
    createGuestJoiningCorrepondenceWarningOverlay,
    isGuestJoiningCorrepondence,
} = useGuestJoiningCorrespondenceWarning();
</script>

<template>
    <div class="container-fluid my-3">
        <div class="row">
            <div class="col-sm-9">
                <h3>{{ $t('new_game') }}</h3>

                <div class="play-buttons row mb-4 g-3">
                    <div class="col">
                        <button type="button" class="btn w-100 btn-warning" @click="() => create1v1RankedAndJoinGame()"><BIconTrophy class="fs-3" /><br>{{ $t('1v1_ranked.title') }}</button>
                    </div>
                    <div class="col" v-if="allowRankedBotGames">
                        <button type="button" class="btn w-100 btn-warning" @click="() => create1vAIRankedAndJoinGame()"><BIconRobot class="fs-3" /><br>{{ $t('1vAI_ranked.title') }}</button>
                    </div>
                    <div class="col">
                        <button type="button" class="btn w-100 btn-success" @click="() => create1v1FriendlyAndJoinGame()"><BIconPeople class="fs-3" /><br>{{ $t('1v1_friendly.title') }}</button>
                    </div>
                    <div class="col">
                        <button type="button" class="btn w-100 btn-primary" @click="() => create1vAIFriendlyAndJoinGame()"><BIconRobot class="fs-3" /><br>{{ $t('1vAI_friendly.title') }}</button>
                    </div>
                </div>

                <h3>{{ $t('lobby.join_a_game') }}</h3>

                <!--
                    Created games
                -->
                <div v-if="Object.values(lobbyStore.hostedGames).some(isWaiting)" class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th scope="col"></th>
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
                                v-for="hostedGame in Object.values(lobbyStore.hostedGames).filter(isWaiting).sort(gameComparator)"
                                :key="hostedGame.publicId"
                            >
                                <td>
                                    <button
                                        v-if="canJoin(hostedGame, useAuthStore().loggedInPlayer)"
                                        class="btn me-3 btn-sm"
                                        :class="isGuestJoiningCorrepondence(hostedGame) ? 'btn-outline-warning' : 'btn-success'"
                                        @click="joinGame(hostedGame)"
                                    >{{ $t('game.accept') }}</button>

                                    <router-link
                                        class="btn me-3 btn-sm btn-link"
                                        :to="{ name: 'online-game', params: { gameId: hostedGame.publicId } }"
                                    >{{ $t('game.watch') }}</router-link>
                                </td>
                                <td><span v-if="hostedGame.gameOptions.ranked" class="text-warning"><BIconTrophyFill /> <span class="d-none d-md-inline">{{ $t('ranked') }}</span></span></td>
                                <td><AppPseudo onlineStatus rating :player="hostedGame.host" /></td>
                                <td :class="isUncommonBoardsize(hostedGame) ? 'text-warning' : ''">{{ hostedGame.gameOptions.boardsize }}</td>
                                <td><AppTimeControlLabel :gameOptions="hostedGame.gameOptions" /></td>
                                <td><AppGameRulesSummary :gameOptions="hostedGame.gameOptions" /></td>
                                <td>{{
                                    formatDistanceToNowStrict(hostedGame.createdAt, { addSuffix: true })
                                }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else>{{ $t('lobby.no_waiting_games') }}</p>

                <h4><BIconEye /> {{ $t('lobby.watch_current_games') }}</h4>

                <!--
                    Currently playing games
                -->
                <div v-if="Object.values(lobbyStore.hostedGames).some(isPlaying)" class="table-responsive">
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
                                v-for="hostedGame in Object.values(lobbyStore.hostedGames).filter(isPlaying).sort(gameComparator)"
                                :key="hostedGame.publicId"
                            >
                                <td class="ps-0">
                                    <router-link
                                        class="btn btn-sm btn-link"
                                        :to="{ name: 'online-game', params: { gameId: hostedGame.publicId } }"
                                    >{{ $t('game.watch') }}</router-link>

                                    <span v-if="hostedGame.gameOptions.ranked" class="text-warning"><BIconTrophyFill /> <span class="d-none d-md-inline">{{ $t('ranked') }}</span></span>
                                </td>
                                <td class="d-none d-sm-table-cell"><AppPseudo rating onlineStatus :player="getPlayer(hostedGame, 0)!" /></td>
                                <td class="d-none d-sm-table-cell"><AppPseudo rating onlineStatus :player="getPlayer(hostedGame, 1)!" /></td>
                                <td class="d-table-cell d-sm-none">
                                    <AppPseudo rating onlineStatus :player="getPlayer(hostedGame, 0)!" />
                                    <br>
                                    <AppPseudo rating onlineStatus :player="getPlayer(hostedGame, 1)!" />
                                </td>
                                <td>{{ hostedGame.gameOptions.boardsize }}</td>
                                <td><AppTimeControlLabel :gameOptions="hostedGame.gameOptions" /></td>
                                <td>{{
                                    formatDistanceToNowStrict(hostedGame.gameData?.startedAt ?? 0, { addSuffix: true })
                                }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else>{{ $t('lobby.no_playing_games') }}</p>

                <h4><BIconTrophy /> {{ $t('finished_games') }}</h4>

                <!--
                    Finished games
                -->
                <div v-if="Object.values(lobbyStore.endedHostedGames).some(isFinished)" class="table-responsive">
                    <table class="table" style="margin-bottom: 0">
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
                                v-for="hostedGame in Object.values(lobbyStore.endedHostedGames).filter(isFinished).sort(byEndedAt)"
                                :key="hostedGame.publicId"
                            >
                                <td class="ps-0">
                                    <router-link
                                        class="btn btn-sm btn-link"
                                        :to="{ name: 'online-game', params: { gameId: hostedGame.publicId } }"
                                    >{{ $t('game.review') }}</router-link>

                                    <span v-if="hostedGame.gameOptions.ranked" class="text-warning"><BIconTrophyFill /> <span class="d-none d-md-inline">{{ $t('ranked') }}</span></span>
                                </td>
                                <template v-if="hostedGame?.gameData?.winner != null">
                                    <td><AppPseudo rating onlineStatus :player="getStrictWinnerPlayer(hostedGame)" is="strong" /></td>
                                    <td><AppPseudo rating onlineStatus :player="getStrictLoserPlayer(hostedGame)" classes="text-body-secondary" /></td>
                                </template>
                                <template v-else>
                                    <td>-</td>
                                    <td>-</td>
                                </template>
                                <td>{{ hostedGame.gameOptions.boardsize }}</td>
                                <td><AppTimeControlLabel :gameOptions="hostedGame.gameOptions" /></td>
                                <td>{{
                                    formatDistanceToNowStrict(hostedGame.gameData?.endedAt ?? 0, { addSuffix: true })
                                }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <router-link class="btn btn-link text-decoration-none" :to="{ name: 'games-archive' }">
                        <BIconSearch /> {{ $t('browse_all_ended_games') }}
                    </router-link>
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
        min-height 6em

        @media (min-width: 992px)
            min-height 7em

h4
    margin-top 1em

tr
    td:first-child, th:first-child
        padding-left 0

    td:last-child, th:last-child
        padding-right 0
</style>
