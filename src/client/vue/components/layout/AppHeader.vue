<script setup lang="ts">
import useAuthStore from '@client/stores/authStore';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { getOtherTheme, switchTheme, themeSwitcherDispatcher } from '@client/DarkThemeSwitcher';
import useMyGamesStore from '../../../stores/myGamesStore';
import { useRouter } from 'vue-router';

const { loggedInUser } = storeToRefs(useAuthStore());

let otherTheme = ref(getOtherTheme());

themeSwitcherDispatcher.on('themeSwitched', () => {
    otherTheme.value = getOtherTheme();
});

/*
 * My games
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
                <router-link to="/"><i class="bi-house-fill"></i> Home</router-link>

                <span class="my-turn-notif ms-auto me-1">
                    <i
                        :class="[
                            myTurnCount > 0 ? 'bi-hexagon-fill' : 'bi-hexagon',
                            null === mostUrgentGame ? '' : (0 === mostUrgentGame.myColor
                                ? 'text-danger'
                                : 'text-primary'
                            ),
                        ]"
                    ></i>
                    <a
                        href="#"
                        @click="goToMostUrgentGame()"
                        class="text-white"
                    >{{ myTurnCount }}</a>
                </span>
                <p class="me-3">
                    <template v-if="loggedInUser"><i class="bi-person-fill"></i> {{ loggedInUser.pseudo }}</template>
                    <template v-else>logging in…</template>
                </p>

                <i :class="otherTheme === 'light' ? 'bi-moon-stars-fill' : 'bi-brightness-high-fill'"></i>
                <a href="#" @click="switchTheme()" class="ms-1">
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

    i, a
        position absolute
        text-align center
        width 100%

    a
        font-size 0.8em
        margin-top 0.15em
        text-decoration none
</style>
