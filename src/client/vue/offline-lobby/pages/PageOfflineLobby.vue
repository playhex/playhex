<script setup lang="ts">
/* eslint-env browser */
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { IconRobot } from '../../icons.js';
import Create1vOfflineAIOverlay from '../overlay/Create1vOfflineAIOverlay.vue';
import { defineOverlay } from '@overlastic/vue';
import { useRouter } from 'vue-router';
import { OfflineAIGameOptions } from '../models/OfflineAIGameOptions.js';
import { offlineGamesStorage } from '../services/OfflineGamesStorage.js';
import { Game } from '../../../../shared/game-engine/index.js';
import { CustomizedGameView } from '../../../services/CustomizedGameView.js';
import { onMounted, ref } from 'vue';

useHead({
    title: t('lobby_title'),
});

const router = useRouter();

/*
* Play vs AI offline
*/
const create1vOfflineAIOverlay = defineOverlay(Create1vOfflineAIOverlay);

const create1vOfflineAIAndJoinGame = async () => {
    try {
        const gameOptions = new OfflineAIGameOptions();

        await create1vOfflineAIOverlay({
            gameOptions,
        });

        void router.push({
            name: 'play-vs-offline-ai',
            state: {
                gameOptions: JSON.stringify(gameOptions),
            },
        });
    } catch (e) {
        // noop, player just closed popin
    }
};

const currentGame = offlineGamesStorage.getCurrentGame();
const pixiApp = ref<HTMLElement>();

onMounted(() => {
    if (!currentGame) {
        return;
    }

    const game = Game.fromData(currentGame.gameData);
    const gameView = new CustomizedGameView(game);

    if (!pixiApp.value) {
        throw new Error('No ref="pixiApp" element');
    }

    void gameView.mount(pixiApp.value);
});
</script>

<template>
    <div class="container-fluid my-3">
        <h2>{{ $t('play_offline') }}</h2>

        <div class="play-buttons row mb-4">
            <div class="col col-sm-6 col-md-4">
                <button type="button" class="btn w-100 btn-primary" @click="() => create1vOfflineAIAndJoinGame()">
                    <IconRobot class="fs-3" />
                    <br>
                    {{ $t('new_game_vs_ai') }}
                </button>
            </div>
        </div>

        <div v-if="currentGame" class="row">
            <div class="col col-sm-6 col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <div class="board-container" ref="pixiApp"></div>
                        <router-link :to="{ name: 'play-vs-offline-ai' }" class="stretched-link">{{ $t('continue_game_vs_x', { playerNickname: currentGame.players.find(p => p.isBot)?.pseudo ?? 'AI' }) }}</router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.play-buttons
    .btn
        min-height 6em

        @media (min-width: 992px)
            min-height 7em

h4
    margin-top 1em

tr
    td:first-child, th:first-child
        padding-left 0

    td:last-child, th:last-child
        padding-right 0

.board-container
    width 12em
    height 8em
    display block
    margin auto
</style>
