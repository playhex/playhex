<script setup lang="ts">
import useAuthStore from '../../../stores/authStore.js';
import { storeToRefs } from 'pinia';
import useMyGamesStore from '../../../stores/myGamesStore.js';
import { useRouter } from 'vue-router';
import { IconPersonFill, IconHexagonFill, IconHexagon, IconRocketTakeOff, IconDownload } from '../../icons.js';
import AppPseudo from '../AppPseudo.vue';
import { computed } from 'vue';
import AppPlayerNotifications from '../../player-notifications/AppPlayerNotifications.vue';
import { useTutorialControls } from '../../composables/tutorialControls.js';
import { useServerVersionChecker } from '../../composables/useServerVersionChecker.js';

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
    if (mostUrgentGame.value === null) {
        return;
    }

    void router.push({
        name: 'online-game',
        params: {
            gameId: mostUrgentGame.value.publicId,
        },
    });
};

/**
 * Leave focus of submenu item to not keep it open after clicking on it and page changed
 */
const leaveFocus = (): void => {
    (document.activeElement as HTMLElement)?.blur();
};

/**
 * Just adding data-bs-toggle="offcanvas" on offcanvas links
 * does not work (close offcanvas but prevent navigation).
 */
const closeOffcanvas = () => {
    const navbarToggler: null | HTMLButtonElement = document.querySelector('button.navbar-toggler');

    if (navbarToggler === null) {
        throw new Error('navbar toggle not found, cannot close offcanvas');
    }

    // do not click when button is hidden, i.e on larger devices
    // to prevent showing backdrop on large screen when click on expanded menu items
    if (navbarToggler.checkVisibility()) {
        navbarToggler.click();
    }
};

/**
 * No game => filled
 * Turn to play => filled
 * No turn to play, but I have current game => empty
 */
const isFilled = (): boolean => mostUrgentGame.value === null || myTurnCount.value > 0;

/**
 * No game => grey
 * Most urgent game => my color in this game
 */
const color = (): string => mostUrgentGame.value === null
    ? 'text-secondary'
    : (mostUrgentGame.value.myColor === 0
        ? 'text-danger'
        : 'text-primary'
    )
;

const routeName = computed<null | string>(() => {
    const { name } = router.currentRoute.value;

    if (typeof name !== 'string') {
        return null;
    }

    return name;
});

/*
 * Tutorial
 */
const { shouldDisplayLink } = useTutorialControls();

/*
 * server and client versions check
 */
const {
    clientUpToDate,
    tryUpdateClient,
} = useServerVersionChecker();
</script>

<template>
    <nav class="navbar navbar-expand-sm bg-body-secondary menu-top shadow-sm">
        <div class="container-fluid">

            <!-- PlayHex -->
            <router-link :to="{ name: 'home' }" class="navbar-brand" aria-label="Go to PlayHex lobby">
                Play<span class="text-danger">Hex</span>
                <small v-if="siteTitleSuffix" class="text-body-secondary"> - {{ siteTitleSuffix }}</small>
            </router-link>

            <div class="d-sm-none flex-grow-1">
                <!-- Toggle button in small devices -->
                <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar" aria-controls="offcanvasNavbar" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
            </div>

            <!-- Menu, collapses into offcanvas on small devices -->
            <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasNavbar" aria-labelledby="offcanvasNavbarLabel">
                <div class="offcanvas-header py-0">

                    <!-- PlayHex in offcanvas -->
                    <router-link :to="{ name: 'home' }" @click="closeOffcanvas" class="navbar-brand" aria-label="Go to PlayHex lobby">
                        Play<span class="text-danger">Hex</span>
                        <small v-if="siteTitleSuffix" class="text-body-secondary"> - {{ siteTitleSuffix }}</small>
                    </router-link>

                    <!-- Close offcanvas -->
                    <button type="button" class="btn-close p-4" data-bs-dismiss="offcanvas" aria-label="Close"></button>

                </div>
                <div class="offcanvas-body">

                    <!-- Header menu items-->
                    <ul class="navbar-nav flex-grow-1 pe-3">

                        <li class="nav-item has-submenu">
                            <router-link
                                :to="{ name: 'home' }"
                                :class="{ active: routeName === 'home' || routeName === 'playing-games' || routeName === 'games-archive' }"
                                class="nav-link"
                                @click="closeOffcanvas(); leaveFocus()"
                            >{{ $t('nav_games') }}</router-link>

                            <ul class="nav-submenu">
                                <li>
                                    <router-link
                                        :to="{ name: 'home' }"
                                        :class="{ active: routeName === 'home' }"
                                        class="nav-link"
                                        @click="closeOffcanvas(); leaveFocus()"
                                    >{{ $t('nav_lobby') }}</router-link>
                                </li>
                                <li>
                                    <router-link
                                        :to="{ name: 'playing-games' }"
                                        :class="{ active: routeName === 'playing-games' }"
                                        class="nav-link"
                                        @click="closeOffcanvas(); leaveFocus()"
                                    >{{ $t('nav_observe') }}</router-link>
                                </li>
                                <li>
                                    <router-link
                                        :to="{ name: 'games-archive' }"
                                        :class="{ active: routeName === 'games-archive' }"
                                        class="nav-link"
                                        @click="closeOffcanvas(); leaveFocus()"
                                    >{{ $t('nav_archives') }}</router-link>
                                </li>
                            </ul>
                        </li>

                        <li class="nav-item">
                            <router-link
                                :to="{ name: 'tournaments' }"
                                :class="{ active: routeName?.startsWith('tournament') }"
                                class="nav-link"
                                @click="closeOffcanvas"
                            >{{ $t('tournaments') }}</router-link>
                        </li>

                    </ul>

                </div>
            </div>

            <div class="d-flex">
                <!-- Tutorial -->
                <router-link
                    v-if="shouldDisplayLink"
                    :to="{ name: 'tutorial' }"
                    class="btn btn-sm btn-info"
                >
                    <IconRocketTakeOff />
                    <span class="d-none d-sm-inline">&nbsp;{{ $t('tutorial.label') }}</span>
                </router-link>

                <!-- update app if versions mismatch -->
                <button
                    v-if="!clientUpToDate"
                    @click="tryUpdateClient"
                    class="btn btn-sm btn-success ms-2"
                    title="New version available! Refresh to update"
                >
                    <IconDownload />
                </button>

                <!-- My turn notif -->
                <span class="my-turn-notif">
                    <component
                        :is="isFilled() ? IconHexagonFill : IconHexagon"
                        class="hexagon"
                        :class="color()"
                    />
                    <button
                        class="btn-my-turn btn btn-link"
                        @click="goToMostUrgentGame()"
                        :class="isFilled() ? 'text-white' : 'text-body'"
                    >{{ myTurnCount }}</button>
                </span>

                <!-- Player notifications -->
                <AppPlayerNotifications />

                <!-- Player nickname -->
                <p class="nav-player-item">
                    <template v-if="loggedInPlayer">
                        <router-link :to="{ name: 'player', params: { slug: loggedInPlayer.slug } }" class="link-body-emphasis">
                            <IconPersonFill style="font-size: 1.5em" />
                            <AppPseudo :player="loggedInPlayer" classes="d-none d-sm-inline" />
                        </router-link>
                    </template>
                    <template v-else>{{ $t('logging_in') }}</template>
                </p>
            </div>
        </div>
    </nav>
</template>

<style lang="stylus" scoped>
nav
    a
        text-decoration none

.navbar-toggler
    font-size 1em

.has-submenu
    position relative

    .nav-submenu
        position static
        box-shadow none
        padding 0
        padding-left 1em
        white-space nowrap
        list-style none

        @media (min-width: 576px)
            display none
            position absolute
            top 100%
            left -1em
            padding 0.5em 1em
            margin 0
            background var(--bs-secondary-bg)
            box-shadow 0 4px 6px rgba(0, 0, 0, 0.1)

    &:hover .nav-submenu,
    &:focus-within .nav-submenu
        display block

.nav-player-item
    font-size 1.1em

.my-turn-notif
    position relative
    font-size 2em
    width 1.5em
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
