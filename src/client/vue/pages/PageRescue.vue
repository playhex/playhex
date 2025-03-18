<script setup lang="ts">
import { onBeforeMount, onUnmounted, ref, Ref } from 'vue';
import AppBoard from '../components/AppBoard.vue';
import GameView from '../../../shared/pixi-board/GameView.js';
import { Game, Move } from '../../../shared/game-engine/index.js';
import { Player } from '../../../shared/app/models/index.js';
import { apiGetServerInfo } from '../../apiClient.js';
import { CustomizedGameView } from '../../services/CustomizedGameView.js';
import { shallowRef } from 'vue';
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    robots: 'noindex',
});

type LoggedError = {
    type: string;
    message: string;
};

const loggedErrors: Ref<LoggedError[]> = ref([]);

const onErrorListener = (error: ErrorEvent): void => {
    loggedErrors.value.push({
        type: 'error',
        message: error.message,
    });
};

const onUnhandledRejectionListener = (error: PromiseRejectionEvent): void => {
    loggedErrors.value.push({
        type: 'error',
        message: error.reason,
    });
};

/*
 * Capture js errors
 */
onBeforeMount(() => {
    window.addEventListener('error', onErrorListener);
    window.addEventListener('unhandledrejection', onUnhandledRejectionListener);
});

onUnmounted(() => {
    window.removeEventListener('error', onErrorListener);
    window.removeEventListener('unhandledrejection', onUnhandledRejectionListener);
});

/*
 * Check version diff between server and client
 */

/* global VERSION */
// @ts-ignore: VERSION replaced at build time by webpack.
const clientVersion: string = VERSION;

const serverVersion = ref<null | string>(null);

(async () => {
    serverVersion.value = (await apiGetServerInfo()).version;
})();

/*
 * Empty all service worker cached resources
 */
const cacheKeysFound = ref<null | number>(null);
const cacheKeysDeleted = ref<null | number>(null);
const reloading = ref(false);

(async () => {
    const cache = await caches.open('cache');
    const keys = await cache.keys();

    cacheKeysFound.value = keys.length;
})();

const clearCache = async () => {
    cacheKeysFound.value = null;
    cacheKeysDeleted.value = 0;

    const cache = await caches.open('cache');
    const keys = await cache.keys();

    cacheKeysFound.value = keys.length;

    for (const key of keys) {
        await cache.delete(key);
        ++cacheKeysDeleted.value;
    }

    reloading.value = true;
    setTimeout(() => window.location.reload(), 1000);
};

/*
 * Test board rendering
 */
const game = new Game(3);
const gameView = shallowRef<null | GameView>(new CustomizedGameView(game));
game.move(new Move(1, 1), 0);

const players = ['A', 'B'].map(pseudo => {
    const player = new Player();

    player.pseudo = pseudo;
    player.createdAt = new Date();
    player.isBot = false;
    player.isGuest = false;
    player.publicId = 'nope';

    return player;
});
</script>

<template>
    <div class="container">
        <h1>Rescue page</h1>

        <h2>Versions</h2>

        <p>Client version: {{ clientVersion }}</p>
        <p>Server version: {{ serverVersion }}</p>

        <p v-if="null !== serverVersion && clientVersion !== serverVersion" class="text-warning">Client seems not up to date, try clearing the cache.</p>
        <p v-else class="text-success">Client seems up to date.</p>

        <h2>Cache</h2>

        <button class="btn btn-lg btn-primary" @click="clearCache()">Clear cache</button>

        <p>
            <small v-if="null !== cacheKeysFound">{{ cacheKeysFound }} cache keys found</small>
            <br>
            <small v-if="null !== cacheKeysDeleted">{{ cacheKeysDeleted }} deleted<template v-if="reloading">. Reloading...</template></small>
        </p>

        <h2>Hex board rendering</h2>

        <p>Displaying Hex board:</p>

        <div class="board-container">
            <AppBoard
                v-if="gameView"
                :gameView="(gameView as GameView)"
                :players="players"
            />
        </div>

        <p>You should see a 3x3 board above.</p>

        <h2>Logged errors</h2>

        <p :class="loggedErrors.length > 0 ? 'text-warning' : 'text-success'">{{ loggedErrors.length }} error(s) on this page.</p>

        <p v-for="loggedError, index in loggedErrors" :key="index">{{ loggedError.type }}: {{ loggedError.message }}</p>
    </div>
</template>

<style lang="stylus" scoped>
.board-container
    width 200px
    height 200px
</style>
