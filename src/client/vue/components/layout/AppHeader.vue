<script setup lang="ts">
import useAuthStore from '@client/stores/authStore';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { getOtherTheme, switchTheme, themeSwitcherDispatcher } from '@client/DarkThemeSwitcher';
import useMyGamesStore from '../../../stores/myGamesStore';
import { useRouter } from 'vue-router';
import { BIconHouseFill, BIconPersonFill, BIconHexagon, BIconHexagonFill, BIconMoonStarsFill, BIconBrightnessHighFill } from 'bootstrap-icons-vue';

const { loggedInUser } = storeToRefs(useAuthStore());

let otherTheme = ref(getOtherTheme());

themeSwitcherDispatcher.on('themeSwitched', () => {
    otherTheme.value = getOtherTheme();
});

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
</script>

<template>
    <div class="menu-top">
        <div class="container-fluid">
            <nav class="d-flex">
                <router-link to="/"><b-icon-house-fill /> Home</router-link>

                <span class="my-turn-notif ms-auto me-1">
                    <component
                        :data-most="JSON.stringify(mostUrgentGame)"
                        :is="myTurnCount > 0 ? BIconHexagonFill : BIconHexagon"
                        :class="[
                            null === mostUrgentGame ? '' : (0 === mostUrgentGame.myColor
                                ? 'text-danger'
                                : 'text-primary'
                            ),
                        ]"
                    />
                    <a
                        href="#"
                        @click="goToMostUrgentGame()"
                        class="text-body"
                    >{{ myTurnCount }}</a>
                </span>
                <p class="me-3">
                    <template v-if="loggedInUser"><b-icon-person-fill /> {{ loggedInUser.pseudo }}</template>
                    <template v-else>logging in…</template>
                </p>

                <a href="#" @click="switchTheme()" class="ms-1">
                    <component :is="otherTheme === 'light' ? BIconMoonStarsFill : BIconBrightnessHighFill" />
                    switch
                </a>
            </nav>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.my-turn-notif
    display block
    position relative
    font-size 1.1em
    width 2em

    svg, a
        position absolute
        text-align center
        width 100%
        margin-top 0.22em

    a
        font-size 0.8em
        margin-top 0.15em
        text-decoration none
</style>
