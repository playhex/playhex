<script setup lang="ts">
import useAuthStore from '@client/stores/authStore';
import { storeToRefs } from 'pinia';
import useMyGamesStore from '../../../stores/myGamesStore';
import { useRouter } from 'vue-router';
import { BIconPersonFill, BIconHexagonFill, BIconHexagon } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';

const { loggedInPlayer } = storeToRefs(useAuthStore());

/*
 * My turn notification
 */
const { myTurnCount, mostUrgentGame } = storeToRefs(useMyGamesStore());
const router = useRouter();

const goToMostUrgentGame = (): void => {
    if (null === mostUrgentGame.value) {
        return;
    }

    router.push({
        name: 'online-game',
        params: {
            gameId: mostUrgentGame.value.id,
        },
    });
};

/**
 * No game => filled
 * Turn to play => filled
 * No turn to play, but I have current game => empty
 */
const isFilled = (): boolean => null === mostUrgentGame.value || myTurnCount.value > 0;

/**
 * No game => grey
 * Most urgent game => my color in this game
 */
const color = (): string => null === mostUrgentGame.value
    ? 'text-secondary'
    : (0 === mostUrgentGame.value.myColor
        ? 'text-danger'
        : 'text-primary'
    )
;
</script>

<template>
    <nav class="menu-top navbar bg-body-tertiary">
        <div class="container-fluid justify-content-space-between">
            <router-link to="/" class="navbar-brand" aria-label="Go to PlayHex lobby">Play<span class="text-danger">Hex</span></router-link>

            <span class="my-turn-notif">
                <component
                    :is="isFilled() ? BIconHexagonFill : BIconHexagon"
                    :class="color()"
                />
                <a
                    href="#"
                    @click="goToMostUrgentGame()"
                    :class="isFilled() ? 'text-white' : 'text-body'"
                >{{ myTurnCount }}</a>
            </span>

            <p class="nav-player-item">
                <template v-if="loggedInPlayer">
                    <BIconPersonFill /> <router-link :to="{ name: 'player', params: { slug: loggedInPlayer.slug } }"><AppPseudo :player="loggedInPlayer" /></router-link>
                </template>
                <template v-else>logging in…</template>
            </p>
        </div>
    </nav>
</template>

<style lang="stylus" scoped>
nav
    a
        text-decoration none

.navbar-brand
    margin-right 0

.nav-player-item
    font-size 1.1em

.my-turn-notif
    position relative
    font-size 1.7em
    width 2em
    display flex
    justify-content center
    align-items center

    svg, a
        position absolute
        text-align center
        width 100%

    a
        font-size 0.8em
        text-decoration none
</style>
