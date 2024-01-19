<script setup lang="ts">
import useAuthStore from '@client/stores/authStore';
import { storeToRefs } from 'pinia';
import useMyGamesStore from '../../../stores/myGamesStore';
import { useRouter } from 'vue-router';
import { BIconHouseFill, BIconPersonFill, BIconHexagonFill, BIconHexagon } from 'bootstrap-icons-vue';

const { loggedInUser } = storeToRefs(useAuthStore());

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
            <router-link to="/" class="navbar-brand"><b-icon-house-fill /><span class="d-none d-sm-inline"> Hex online</span></router-link>

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

            <p v-if="loggedInUser" class="nav-player-item">
                <template v-if="loggedInUser">
                    <b-icon-person-fill /> <router-link :to="{ name: 'player', params: { slug: loggedInUser.slug } }">{{ loggedInUser.pseudo }}</router-link>
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

.nav-player-item
    font-size 1.1em

.my-turn-notif
    position relative
    font-size 1.7em
    margin-top -1.5em
    width 2em

    svg, a
        position absolute
        text-align center
        width 100%

    svg
        margin-top 0.22em

    a
        font-size 0.8em
        margin-top 0.13em
        text-decoration none
</style>
