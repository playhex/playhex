<script lang="ts" setup>
/* eslint-env browser */
import { storeToRefs } from 'pinia';
import useAuthStore from '../../../stores/authStore.js';
import { BIconPerson, BIconPersonUp, BIconBoxArrowRight, BIconGear, BIconTrophyFill } from 'bootstrap-icons-vue';
import { HostedGame, Player, PlayerStats, Rating } from '../../../../shared/app/models/index.js';
import { getPlayerBySlug, apiGetPlayerStats, apiGetPlayerCurrentRatings, getGames } from '../../../apiClient.js';
import { Ref, ref, useTemplateRef, watch } from 'vue';
import type { ComponentExposed } from 'vue-component-type-helpers';
import { format } from 'date-fns';
import useLobbyStore from '../../../stores/lobbyStore.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppOnlineStatus from '../../components/AppOnlineStatus.vue';
import AppTimeControlLabel from '../../components/AppTimeControlLabel.vue';
import AppGameRulesSummary from '../../components/AppGameRulesSummary.vue';
import AppPlayerStats from '../../components/AppPlayerStats.vue';
import AppPlayerRatingChart from '../../components/AppPlayerRatingChart.vue';
import AppTablePlayerRating from '../../components/AppTablePlayerRating.vue';
import AppSearchGamesParameters from '../../components/AppSearchGamesParameters.vue';
import { useRoute, useRouter } from 'vue-router';
import { injectHead, useSeoMeta } from '@unhead/vue';
import { definePerson, useSchemaOrg } from '@unhead/schema-org';
import { pseudoString } from '../../../../shared/app/pseudoUtils.js';
import { formatDistanceToNowStrict } from 'date-fns';
import { timeControlToCadencyName } from '../../../../shared/app/timeControlUtils.js';
import useServerDateStore from '../../../stores/serverDateStore.js';
import { watchEffect } from 'vue';
import { RatingCategory } from '../../../../shared/app/ratingUtils.js';
import { Directive } from 'vue';
import SearchGamesParameters from '../../../../shared/app/SearchGamesParameters.js';
import { getOtherPlayer, hasPlayer } from '../../../../shared/app/hostedGameUtils.js';
import { useSearchGamesPagination } from '../../composables/searchGamesPagination.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';

const { slug } = useRoute().params;

if (Array.isArray(slug)) {
    throw new Error('Unexpected array in "slug" param');
}

const head = injectHead();

/*
 * Player meta tags
 */
const updateMeta = (player: Player): void => {
    useSeoMeta({
        title: pseudoString(player, 'pseudo'),

        // index only bots (Mohex) profile page.
        // Guest should never be indexed,
        // players only if they explicitely agree (settings)
        robots: player.isBot ? 'index' : 'noindex',

        ogTitle: `${pseudoString(player, 'pseudo')}`,
        ogType: 'profile',
        ogUrl: window.location.href,
        twitterCard: 'summary',
    }, { head });

    useSchemaOrg(head, [
        definePerson({
            name: pseudoString(player, 'pseudo'),
            url: window.location.href,
        }),
    ]);
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

const playerNotFound = ref(false);

(async () => {
    try {
        if (null === player.value) {
            player.value = await getPlayerBySlug(slug);
        }

        updateMeta(player.value);
    } catch (e) {
        if (e instanceof DomainHttpError) {
            if ('player_not_found' === e.type) {
                playerNotFound.value = true;
                return;
            }
        }

        throw e;
    }
})();

/*
 * Current games
 */
const { hostedGames } = storeToRefs(useLobbyStore());

const currentGameComparator = (a: HostedGame, b: HostedGame): number => {
    // Correspondence games go after real-time games, then sorted by "started at"
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

    return 0;
};

const getCurrentGames = (): HostedGame[] => {
    if (null === player.value) {
        return [];
    }

    const currentGames: HostedGame[] = [];

    for (const hostedGame of Object.values(hostedGames.value)) {
        if ('playing' !== hostedGame.state || !hasPlayer(hostedGame, player.value)) {
            continue;
        }

        currentGames.push(hostedGame);
    }

    return currentGames.sort(currentGameComparator);
};

/*
 * Games history
 */
const gamesHistory = ref<null | HostedGame[]>(null);
const totalResults = ref<null | number>(null);
const DEFAULT_PAGE_SIZE = 15;

const searchGamesParameters = ref<SearchGamesParameters>({
    players: null === player.value
        ? undefined
        : [{ publicId: player.value.publicId }]
    ,
    opponentType: 'player',
    states: ['ended'],
    endedAtSort: 'desc',
    paginationPageSize: DEFAULT_PAGE_SIZE,
});

const { totalPages, goPagePrevious, goPageNext } = useSearchGamesPagination(
    searchGamesParameters,
    totalResults,
    DEFAULT_PAGE_SIZE,
);

// Set filter to current player, but keep same filter if already set on this player
watch(player, newPlayer => {
    if (null === newPlayer) {
        return;
    }

    if (undefined === searchGamesParameters.value.players
        || searchGamesParameters.value.players.every(p => p.publicId !== newPlayer.publicId)
    ) {
        searchGamesParameters.value.players = [
            { publicId: newPlayer.publicId },
        ];
    }
});

// Update games list when filters change
watchEffect(async () => {
    // Do not search yet to prevent having games without current player,
    // which is impossible to display in this page table because we need to display the opponent to currentPlayer
    if (undefined === searchGamesParameters.value.players || 0 === searchGamesParameters.value.players.length) {
        return;
    }

    const { results, count } = await getGames(searchGamesParameters.value);

    gamesHistory.value = results;
    totalResults.value = count;
});

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

/**
 * ping and date shift
 */
const { pingTime, medianShift } = storeToRefs(useServerDateStore());

/*
 * Player stats
 */
const playerStats = ref<null | PlayerStats>(null);

watchEffect(async () => {
    if (null === player.value) {
        playerStats.value = null;
        return;
    }

    playerStats.value = await apiGetPlayerStats(player.value.publicId);
});

const playerCurrentRatings = ref<null | Partial<Record<RatingCategory, Rating>>>(null);

watchEffect(async () => {
    if (null === player.value) {
        playerStats.value = null;
        return;
    }

    playerCurrentRatings.value = null;
    const ratings = await apiGetPlayerCurrentRatings(player.value.publicId);

    if (null === ratings) {
        return;
    }

    playerCurrentRatings.value = {};

    for (const rating of ratings) {
        playerCurrentRatings.value[rating.category] = rating;
    }
});

const ratingChart = useTemplateRef<ComponentExposed<typeof AppPlayerRatingChart>>('ratingChart');

const showRatingCategory = (category: RatingCategory): void => {
    if (!ratingChart.value) {
        return;
    }

    ratingChart.value.showRatingCategory(category);
};

const vRating: Directive<HTMLElement, RatingCategory> = {
    mounted: (el, binding) => {
        el.classList.add('clickable-rating');
        el.addEventListener('click', () => {
            showRatingCategory(binding.value);
        });
    },
};

const timeRangeUpdated = (from: null | Date, to: null | Date) => {
    let isZoomed = from || to;

    if (from) {
        searchGamesParameters.value.fromEndedAt = from;
    }

    if (to) {
        searchGamesParameters.value.toEndedAt = to;
    }

    if (isZoomed) {
        searchGamesParameters.value.ranked = true;
        searchGamesParameters.value.opponentType = undefined;
        searchGamesParameters.value.endedAtSort = 'asc';
        searchGamesParameters.value.states = ['ended'];
    } else {
        searchGamesParameters.value.fromEndedAt = undefined;
        searchGamesParameters.value.toEndedAt = undefined;
        searchGamesParameters.value.endedAtSort = 'desc';
    }
};
</script>

<template>
    <div v-if="!playerNotFound" class="container-fluid my-3">
        <div class="d-flex mb-4">
            <div class="avatar-wrapper">
                <BIconPerson class="icon img-thumbnail" />
                <AppOnlineStatus v-if="player" :player class="player-status" />
            </div>
            <div>
                <h2><AppPseudo v-if="player" :player /><template v-else>…</template></h2>

                <p v-if="player && !player.isGuest" class="mb-0">{{ $t('account_created_on', { date: player?.createdAt
                    ? format(player?.createdAt, 'd MMMM y')
                    : '…' })
                }}</p>

                <p v-if="isMe()" class="text-body-secondary">
                    <small>
                        {{ $t('ping.ping_ms', { ms: pingTime }) }}
                        –
                        {{ $t('ping.date_shift_ms', { ms: medianShift }) }}
                    </small>
                </p>

                <div v-if="isMe() && null !== player" class="player-btns mt-3">
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

        <AppPlayerStats v-if="playerStats" :playerStats />

        <h3 class="mt-4">{{ $t('rating') }}</h3>

        <div class="row">
            <div class="col-lg-6 col-xl-5">
                <div class="table-responsive">
                    <table v-if="playerCurrentRatings" class="table table-bordered ratings-table">
                        <tbody class="text-nowrap">
                            <tr>
                                <td rowspan="2" colspan="2" class="text-center mb-0" v-rating="'overall'">
                                    <strong>{{ $t('overall') }}</strong>
                                    <br>
                                    <AppTablePlayerRating :rating="playerCurrentRatings.overall" class="lead" />
                                </td>
                                <th v-rating="'blitz'">{{ $t('time_cadency.blitz') }}</th>
                                <th v-rating="'normal'">{{ $t('time_cadency.normal') }}</th>
                                <th v-rating="'correspondence'">{{ $t('time_cadency.correspondence') }}</th>
                            </tr>
                            <tr>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings.blitz" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings.normal" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings.correspondence" /></td>
                            </tr>
                            <tr>
                                <th v-rating="'small'">{{ $t('boardsize.small') }}</th>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings.small" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['small.blitz']" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['small.normal']" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['small.correspondence']" /></td>
                            </tr>
                            <tr>
                                <th v-rating="'medium'">{{ $t('boardsize.medium') }}</th>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings.medium" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['medium.blitz']" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['medium.normal']" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['medium.correspondence']" /></td>
                            </tr>
                            <tr>
                                <th v-rating="'large'">{{ $t('boardsize.large') }}</th>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings.large" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['large.blitz']" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['large.normal']" /></td>
                                <td><AppTablePlayerRating :rating="playerCurrentRatings['large.correspondence']" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="col-lg-6 col-xl-7">
                <AppPlayerRatingChart ref="ratingChart" v-if="player" :player @timeRangeUpdated="timeRangeUpdated" />
            </div>
        </div>

        <h3 class="mt-4">{{ $t('player_current_games') }}</h3>

        <div v-if="player" class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col"></th>
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
                        :key="game.publicId"
                    >
                        <td class="ps-0">
                            <router-link
                                :to="{ name: 'online-game', params: { gameId: game.publicId } }"
                                class="btn btn-sm btn-link"
                            >{{ $t('game.watch') }}</router-link>
                        </td>
                        <td>
                            <span v-if="game.gameOptions.ranked" class="text-warning"><BIconTrophyFill /> <span class="d-none d-md-inline">{{ $t('ranked') }}</span></span>
                        </td>
                        <td><AppPseudo rating onlineStatus :player="getOtherPlayer(game, player)!" /></td>
                        <td>{{ game.gameOptions.boardsize }}</td>
                        <td><AppTimeControlLabel :timeControlBoardsize="game.gameOptions" /></td>
                        <td><AppGameRulesSummary :gameOptions="game.gameOptions" /></td>
                        <td>{{
                            formatDistanceToNowStrict(game.gameData?.startedAt ?? 0, { addSuffix: true })
                        }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h3>{{ $t('player_game_history') }}</h3>

        <AppSearchGamesParameters :searchGamesParameters />

        <p v-if="null !== totalResults">{{ $t('n_total_games', { count: totalResults }) }}</p>
        <p v-else>…</p>

        <div class="mt-3">
            <button @click="goPagePrevious" class="btn btn-outline-primary" :class="{ disabled: (searchGamesParameters.paginationPage ?? 0) < 1 }">{{ $t('previous') }}</button>
            <span class="mx-3">{{ $t('page_page_of_max', { page: (searchGamesParameters.paginationPage ?? 0) + 1, max: totalPages }) }}</span>
            <button @click="goPageNext" class="btn btn-outline-primary" :class="{ disabled: (searchGamesParameters.paginationPage ?? 0) + 1 >= totalPages }">{{ $t('next') }}</button>
        </div>

        <div v-if="gamesHistory && gamesHistory.length > 0" class="table-responsive">
            <table class="table mb-0">
                <thead>
                    <tr>
                        <th scope="col"></th>
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
                        :key="game.publicId"
                    >
                        <td class="ps-0">
                            <router-link
                                :to="{ name: 'online-game', params: { gameId: game.publicId } }"
                                class="btn btn-sm btn-link"
                            >{{ $t('game.review') }}</router-link>
                        </td>
                        <td>
                            <span v-if="game.gameOptions.ranked" class="text-warning"><BIconTrophyFill /> <span class="d-none d-md-inline">{{ $t('ranked') }}</span></span>
                        </td>

                        <td v-if="'canceled' === game.state" style="width: 7em">{{ $t('game_state.canceled') }}</td>
                        <td v-else-if="hasWon(game)" style="width: 7em" class="text-success">{{ $t('outcome.win') }}</td>
                        <td v-else style="width: 7em" class="text-danger">{{ $t('outcome.' + (game?.gameData?.outcome ?? 'loss')) }}</td>

                        <td v-if="game.hostedGameToPlayers.length < 2">-</td>
                        <td v-else><AppPseudo rating onlineStatus :player="getOpponent(game)" /></td>

                        <td>{{ game.gameOptions.boardsize }}</td>
                        <td><AppTimeControlLabel :timeControlBoardsize="game.gameOptions" /></td>
                        <td><AppGameRulesSummary :gameOptions="game.gameOptions" /></td>
                        <td>{{
                            game.gameData?.endedAt ? format(game.gameData.endedAt, 'd MMMM yyyy p') : '-'
                        }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="gamesHistory && gamesHistory.length > 0" class="mt-3">
            <button @click="goPagePrevious" class="btn btn-outline-primary" :class="{ disabled: (searchGamesParameters.paginationPage ?? 0) < 1 }">{{ $t('previous') }}</button>
            <span class="mx-3">{{ $t('page_page_of_max', { page: (searchGamesParameters.paginationPage ?? 0) + 1, max: totalPages }) }}</span>
            <button @click="goPageNext" class="btn btn-outline-primary" :class="{ disabled: (searchGamesParameters.paginationPage ?? 0) + 1 >= totalPages }">{{ $t('next') }}</button>
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
        top 77%
        left 77%
        font-size 1.25em

td:first-child, th:first-child
    width 6em

.ratings-table
    th
        text-overflow ellipsis
        overflow hidden
        max-width 7em

.clickable-rating
    cursor pointer

    &:hover
        text-decoration underline
</style>
