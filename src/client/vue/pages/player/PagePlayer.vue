<script lang="ts" setup>
/* eslint-env browser */
import { storeToRefs } from 'pinia';
import { Person, WithContext } from 'schema-dts';
import useAuthStore from '../../../stores/authStore';
import { BIconPerson, BIconPersonUp, BIconBoxArrowRight, BIconGear } from 'bootstrap-icons-vue';
import HostedGame from '../../../../shared/app/models/HostedGame';
import Player from '../../../../shared/app/models/Player';
import { getPlayerGames, getPlayerBySlug, ApiClientError } from '../../../apiClient';
import { Ref, ref } from 'vue';
import { format } from 'date-fns';
import useLobbyStore from '../../../stores/lobbyStore';
import HostedGameClient from '../../../HostedGameClient';
import AppPseudo from '../../components/AppPseudo.vue';
import AppOnlineStatus from '../../components/AppOnlineStatus.vue';
import AppPseudoWithOnlineStatusVue from '../../components/AppPseudoWithOnlineStatus.vue';
import AppTimeControlLabelVue from '../../components/AppTimeControlLabel.vue';
import AppGameRulesSummary from '@client/vue/components/AppGameRulesSummary.vue';
import { useRoute, useRouter } from 'vue-router';
import { useJsonLd } from '../../../services/head';
import { useSeoMeta } from '@unhead/vue';
import { pseudoString } from '../../../../shared/app/pseudoUtils';
import { formatDistanceToNowStrict } from 'date-fns';
import { timeControlToCadencyName } from '@shared/app/timeControlUtils';

const { slug } = useRoute().params;

if (Array.isArray(slug)) {
    throw new Error('Unexpected array in "slug" param');
}

/*
 * Player meta tags
 */
const updateMeta = (player: Player): void => {
    useSeoMeta({
        titleTemplate: title => `${pseudoString(player, 'pseudo')} - ${title}`,

        // index only bots (Mohex) profile page.
        // Guest should never be indexed,
        // players only if they explicitely agree (settings)
        robots: player.isBot ? 'index' : 'noindex',

        ogTitle: `${pseudoString(player, 'pseudo')}`,
        ogType: 'profile',
        ogUrl: window.location.href,
        twitterCard: 'summary',
    });

    const jsonLd: WithContext<Person> = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: pseudoString(player, 'pseudo'),
        url: window.location.href,
        identifier: pseudoString(player, 'slug'),
    };

    useJsonLd(jsonLd);
};

/*
 * Player data
 */
const { loggedInPlayer } = storeToRefs(useAuthStore());
const isMe = (): boolean => null !== loggedInPlayer.value && loggedInPlayer.value.slug === slug;

const player: Ref<null | Player> = isMe()
    ? loggedInPlayer
    : ref(null)
;

const gamesHistory: Ref<null | HostedGame[]> = ref(null);
const playerNotFound = ref(false);

(async () => {
    try {
        if (null === player.value) {
            player.value = await getPlayerBySlug(slug);
        }

        updateMeta(player.value);

        gamesHistory.value = await getPlayerGames(player.value.publicId, 'ended');
    } catch (e) {
        if (!(e instanceof ApiClientError)) {
            throw e;
        }

        playerNotFound.value = true;
    }
})();

/*
 * Current games
 */
const { hostedGameClients } = storeToRefs(useLobbyStore());

const currentGameComparator = (a: HostedGameClient, b: HostedGameClient): number => {
    // Correspondence games go after real-time games, then sorted by "started at"
    const timeA = timeControlToCadencyName(a.getGameOptions());
    const timeB = timeControlToCadencyName(b.getGameOptions());

    if (timeA !== 'correspondance' && timeB === 'correspondance')
        return -1;

    if (timeA === 'correspondance' && timeB !== 'correspondance')
        return 1;

    const startedAtA = a.getHostedGame().gameData?.startedAt;
    const startedAtB = b.getHostedGame().gameData?.startedAt;

    if (startedAtA != null && startedAtB != null)
        return startedAtB.getTime() - startedAtA.getTime();

    return 0;
};

const getCurrentGames = (): HostedGameClient[] => {
    if (null === player.value) {
        return [];
    }

    const currentGames: HostedGameClient[] = [];

    for (const hostedGameClient of Object.values(hostedGameClients.value)) {
        if ('playing' !== hostedGameClient.getState() || !hostedGameClient.hasPlayer(player.value)) {
            continue;
        }

        currentGames.push(hostedGameClient);
    }

    return currentGames.sort(currentGameComparator);
};

/*
 * Games history
 */
const hasWon = (game: HostedGame): boolean => {
    if (null === player.value) {
        throw new Error('player must be set');
    }

    if (null === game.gameData) {
        throw new Error('no gameData');
    }

    if (null === game.gameData.winner) {
        return false;
    }

    const winner = game.hostedGameToPlayers[game.gameData.winner].player;

    return winner.publicId === player.value?.publicId;
};

const getOpponent = (game: HostedGame): Player => {
    if (null === player.value) {
        throw new Error('player must be set');
    }

    let me: null | Player = null;
    let opponent: null | Player = null;

    for (const p of game.hostedGameToPlayers) {
        if (p.player.publicId === player.value.publicId) {
            me = p.player;
        } else {
            opponent = p.player;
        }
    }

    if (null === me || null === opponent) {
        throw new Error('Player not in the game, or no opponent');
    }

    return opponent;
};

const loadMoreEndedGames = async (): Promise<void> => {
    if (null === player.value || !Array.isArray(gamesHistory.value)) {
        return;
    }

    const last = gamesHistory.value[gamesHistory.value.length - 1];
    const games = await getPlayerGames(player.value.publicId, 'ended', last?.id ?? null);

    for (let i = 0; i < games.length; ++i) {
        gamesHistory.value.push(games[i]);
    }
};

const router = useRouter();

const clickLogout = async () => {
    gamesHistory.value = [];
    const newPlayer = await useAuthStore().logout();

    router.push({
        name: 'player',
        params: {
            slug: newPlayer.slug,
        },
    });
};
</script>

<template>
    <div v-if="!playerNotFound" class="container my-3">
        <div class="d-flex">
            <div class="avatar-wrapper">
                <BIconPerson class="icon img-thumbnail" />
                <AppOnlineStatus v-if="player" :player="player" class="player-status" />
            </div>
            <div>
                <h2><AppPseudo v-if="player" :player="player" /><template v-else>…</template></h2>

                <p v-if="player && !player.isGuest">{{ $t('account_created_on', { date: player?.createdAt
                    ? format(player?.createdAt, 'd MMMM Y')
                    : '…' })
                }}</p>

                <div v-if="isMe() && null !== player" class="player-btns">
                    <template v-if="player.isGuest">
                        <router-link
                            :to="{ name: 'signup' }"
                            class="btn btn-success"
                        ><BIconPersonUp /> {{ $t('create_account') }}</router-link>

                        <router-link
                            :to="{ name: 'login' }"
                            class="btn btn-primary"
                        >{{ $t('log_in') }}</router-link>
                    </template>

                    <template v-else>
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-warning"
                            @click="clickLogout()"
                        >{{ $t('log_out') }} <BIconBoxArrowRight /></button>
                    </template>

                    <router-link
                        :to="{ name: 'settings' }"
                        class="btn btn-sm btn-outline-primary"
                    ><BIconGear /> {{ $t('player_settings.title') }}</router-link>
                </div>
            </div>
        </div>

        <h3 class="mt-4">{{ $t('player_current_games') }}</h3>

        <div v-if="player" class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col"></th>
                        <th scope="col">{{ $t('game.opponent') }}</th>
                        <th scope="col">{{ $t('game.size') }}</th>
                        <th scope="col">{{ $t('game.time_control') }}</th>
                        <th scope="col">{{ $t('game.rules') }}</th>
                        <th scope="col">{{ $t('game.started') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="game in getCurrentGames()"
                        :key="game.getId()"
                    >
                        <td class="ps-0">
                            <router-link
                                :to="{ name: 'online-game', params: { gameId: game.getId() } }"
                                class="btn btn-sm btn-link"
                            >{{ $t('game.watch') }}</router-link>
                        </td>
                        <td><AppPseudoWithOnlineStatusVue :player="(game.getOtherPlayer(player) as Player)" /></td>
                        <td>{{ game.getHostedGame().gameOptions.boardsize }}</td>
                        <td><AppTimeControlLabelVue :gameOptions="game.getGameOptions()" /></td>
                        <td><AppGameRulesSummary :gameOptions="game.getGameOptions()" /></td>
                        <td>{{
                            formatDistanceToNowStrict(game.getHostedGame().gameData?.startedAt ?? 0, { addSuffix: true })
                        }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h3>{{ $t('player_game_history') }}</h3>

        <div v-if="gamesHistory && gamesHistory.length > 0" class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col"></th>
                        <th scope="col">{{ $t('game.outcome') }}</th>
                        <th scope="col">{{ $t('game.opponent') }}</th>
                        <th scope="col">{{ $t('game.size') }}</th>
                        <th scope="col">{{ $t('game.time_control') }}</th>
                        <th scope="col">{{ $t('game.rules') }}</th>
                        <th scope="col">{{ $t('game.finished') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="game in gamesHistory"
                        :key="game.id"
                    >
                        <td class="ps-0">
                            <router-link
                                :to="{ name: 'online-game', params: { gameId: game.id } }"
                                class="btn btn-sm btn-link"
                            >{{ $t('game.review') }}</router-link>
                        </td>
                        <td v-if="hasWon(game)" style="width: 7em" class="text-success">{{ $t('outcome.win') }}</td>
                        <td v-else style="width: 7em" class="text-danger">{{ $t('outcome.' + game?.gameData?.outcome ?? 'loss') }}</td>
                        <td><AppPseudoWithOnlineStatusVue :player="getOpponent(game)" /></td>
                        <td>{{ game.gameOptions.boardsize }}</td>
                        <td><AppTimeControlLabelVue :gameOptions="game.gameOptions" /></td>
                        <td><AppGameRulesSummary :gameOptions="game.gameOptions" /></td>
                        <td>{{
                            formatDistanceToNowStrict(game.gameData?.endedAt ?? 0, { addSuffix: true })
                        }}</td>
                    </tr>
                    <tr colspan="2">
                        <button
                            role="button"
                            class="btn btn-sm btn-link"
                            @click="() => loadMoreEndedGames()"
                        >{{ $t('load_more') }}</button>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div v-else class="container">
        <p class="text-center lead mt-2">{{ $t('no_such_player') }}</p>
    </div>
</template>

<style lang="stylus" scoped>
.icon
    font-size 8em
    border-radius 100%
    padding 1.25rem

.player-btns > *
    margin-bottom 0.5em
    margin-right 1em

.avatar-wrapper
    position relative
    margin-right 1em
    height 100%

    .player-status
        position absolute
        top 79%
        left 79%
        font-size 1em

td:first-child, th:first-child
    width 6em
</style>
