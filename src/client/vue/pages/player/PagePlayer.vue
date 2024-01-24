<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import useAuthStore from '../../../stores/authStore';
import { BIconPerson, BIconPersonUp, BIconBoxArrowRight, BIconGear } from 'bootstrap-icons-vue';
import { HostedGameData, PlayerData } from '@shared/app/Types';
import { getPlayerGames, getPlayerBySlug } from '../../../apiClient';
import { Ref, ref } from 'vue';
import { format } from 'date-fns';
import useLobbyStore from '../../../stores/lobbyStore';
import HostedGameClient from '../../../HostedGameClient';
import AppPseudo from '../../components/AppPseudo.vue';
import AppOnlineStatus from '../../components/AppOnlineStatus.vue';
import AppPseudoWithOnlineStatusVue from '../../components/AppPseudoWithOnlineStatus.vue';
import { useRoute, useRouter } from 'vue-router';

const { slug } = useRoute().params;

if (Array.isArray(slug)) {
    throw new Error('Unexpected array in "slug" param');
}

/*
 * Player data
 */
const { loggedInPlayer } = storeToRefs(useAuthStore());
const isMe = (): boolean => null !== loggedInPlayer.value && loggedInPlayer.value.slug === slug;

const player: Ref<null | PlayerData> = isMe()
    ? loggedInPlayer
    : ref(null)
;

const gamesHistory: Ref<null | HostedGameData[]> = ref(null);

(async () => {
    if (null === player.value) {
        player.value = await getPlayerBySlug(slug);
    }

    gamesHistory.value = await getPlayerGames(player.value.publicId, 'ended');
})();

/*
 * Current games
 */
const { hostedGameClients } = storeToRefs(useLobbyStore());

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

    return currentGames;
};

/*
 * Games history
 */
const hasWon = (game: HostedGameData): boolean => {
    if (null === player.value) {
        throw new Error('player must be set');
    }

    if (null === game.gameData) {
        throw new Error('no gameData');
    }

    if (null === game.gameData.winner) {
        return false;
    }

    const winner = game.gameData.players[game.gameData.winner];

    return winner.publicId === player.value?.publicId;
};

const getOpponent = (game: HostedGameData): PlayerData => {
    if (null === player.value) {
        throw new Error('player must be set');
    }

    if (null === game.opponent) {
        throw new Error('No expected to have no opponent here');
    }

    if (game.host.publicId === player.value.publicId) {
        return game.opponent;
    }

    if (game.opponent.publicId === player.value.publicId) {
        return game.host;
    }

    throw new Error('Player not in the game');
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
    <div class="container">
        <div class="d-flex">
            <div class="avatar-wrapper">
                <b-icon-person class="icon img-thumbnail" />
                <app-online-status v-if="player" :playerData="player" class="player-status" />
            </div>
            <div>
                <h2><app-pseudo v-if="player" :playerData="player" /><template v-else>…</template></h2>

                <p v-if="player && !player.isGuest">Account created on {{ player?.createdAt
                    ? format(player?.createdAt, 'd MMMM Y')
                    : '…'
                }}</p>

                <div v-if="isMe() && null !== player" class="player-btns">
                    <template v-if="player.isGuest">
                        <router-link
                            :to="{ name: 'signup' }"
                            class="btn btn-success"
                        ><b-icon-person-up /> Create account</router-link>

                        <router-link
                            :to="{ name: 'login' }"
                            class="btn btn-primary"
                        >Login</router-link>
                    </template>

                    <template v-else>
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-warning"
                            @click="clickLogout()"
                        >Logout <b-icon-box-arrow-right /></button>
                    </template>

                    <router-link
                        :to="{ name: 'settings' }"
                        class="btn btn-sm btn-outline-primary"
                    ><b-icon-gear /> Settings</router-link>
                </div>
            </div>
        </div>

        <h3 class="mt-4">Current games</h3>

        <table v-if="player" class="table">
            <tbody>
                <tr
                    v-for="game in getCurrentGames()"
                    :key="game.getId()"
                >
                    <td class="ps-0">
                        <router-link
                            :to="{ name: 'online-game', params: { gameId: game.getId() } }"
                            class="btn btn-sm btn-link"
                        >Watch</router-link>
                    </td>
                    <td>
                        <span class="me-2">Game vs </span>
                        <app-pseudo-with-online-status-vue
                            :playerData="(game.getOtherPlayer(player) as PlayerData)"
                        />
                    </td>
                    <td class="text-end">{{ game.getHostedGameData().gameOptions.boardsize }}</td>
                </tr>
            </tbody>
        </table>

        <h3>Games history</h3>

        <table class="table table-sm table-borderless">
            <tbody>
                <tr
                    v-for="game in gamesHistory"
                    :key="game.id"
                >
                    <td class="ps-0">
                        <router-link
                            :to="{ name: 'online-game', params: { gameId: game.id } }"
                            class="btn btn-sm btn-link"
                        >Review</router-link>
                    </td>
                    <td>
                        <span class="me-2 text-success" v-if="hasWon(game)">won against </span>
                        <span class="me-2 text-danger" v-else>lost against </span>
                        <app-pseudo-with-online-status-vue
                            :playerData="getOpponent(game)"
                        />
                    </td>
                </tr>
            </tbody>
        </table>

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
</style>
