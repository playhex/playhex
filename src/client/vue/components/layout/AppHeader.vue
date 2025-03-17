<script setup lang="ts">
import useAuthStore from '../../../stores/authStore';
import { storeToRefs } from 'pinia';
import useMyGamesStore from '../../../stores/myGamesStore';
import { useRouter } from 'vue-router';
import { BIconPersonFill, BIconHexagonFill, BIconHexagon } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';

const { loggedInPlayer } = storeToRefs(useAuthStore());

/* global SITE_TITLE_SUFFIX */
// @ts-ignore: SITE_TITLE_SUFFIX replaced at build time by webpack.
const siteTitleSuffix: undefined | string = SITE_TITLE_SUFFIX;

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
            gameId: mostUrgentGame.value.publicId,
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
            <router-link to="/" class="navbar-brand" aria-label="Go to PlayHex lobby">Play<span class="text-danger">Hex</span><small v-if="siteTitleSuffix" class="text-body-secondary"> - {{ siteTitleSuffix }}</small></router-link>

            <span class="my-turn-notif">
                <component
                    :is="isFilled() ? BIconHexagonFill : BIconHexagon"
                    class="hexagon"
                    :class="color()"
                />
                <button
                    class="btn-my-turn btn btn-link"
                    @click="goToMostUrgentGame()"
                    :class="isFilled() ? 'text-white' : 'text-body'"
                >{{ myTurnCount }}</button>
            </span>

            <p class="nav-player-item">
                <template v-if="loggedInPlayer">
                    <BIconPersonFill />
                    <span>&nbsp;</span>
                    <router-link :to="{ name: 'player', params: { slug: loggedInPlayer.slug } }">
                        <AppPseudo :player="loggedInPlayer" />
                    </router-link>
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
    font-size 2em
    width 2em
    display flex
    justify-content center
    align-items center

    svg, .btn-my-turn
        position absolute
        text-align center
        width 100%

    .btn-my-turn
        margin-top -0.05em
        font-size 0.8em
        text-decoration none

    .hexagon
        transform: rotate(30deg)
</style>
