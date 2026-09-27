<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { IconPeopleFill, IconRobot } from '../../icons.js';
import Create1vOfflineAIOverlay from '../overlay/Create1vOfflineAIOverlay.vue';
import CreateLocal1v1Overlay from '../overlay/CreateLocal1v1Overlay.vue';
import { defineOverlay } from '@overlastic/vue';
import { useRouter } from 'vue-router';
import { OfflineAIGameOptions } from '../models/OfflineAIGameOptions.js';
import { Local1v1GameOptions } from '../models/Local1v1GameOptions.js';
import { offlineGamesStorage } from '../services/OfflineGamesStorage.js';
import AppOfflineMiniBoard from '../components/AppOfflineMiniBoard.vue';
import AppOfflineGamesHistory from '../components/AppOfflineGamesHistory.vue';
import { GameData } from '../../../../shared/game-engine/normalization.js';

useHead({
    title: t('local_play.title'),
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

/**
 * Games without any move are not worth continuing.
 */
const hasMoves = <T extends { gameData: GameData }>(game: null | T): null | T => game && game.gameData.movesHistory.length > 0 ? game : null;

const currentAIGame = hasMoves(offlineGamesStorage.getCurrentAIGame());

/*
 * Play with a friend on same device
 */
const createLocal1v1Overlay = defineOverlay(CreateLocal1v1Overlay);

const createLocal1v1AndJoinGame = async () => {
    try {
        const gameOptions = new Local1v1GameOptions();

        await createLocal1v1Overlay({
            gameOptions,
        });

        void router.push({
            name: 'play-local-1v1',
            state: {
                gameOptions: JSON.stringify(gameOptions),
            },
        });
    } catch (e) {
        // noop, player just closed popin
    }
};

const currentLocal1v1Game = hasMoves(offlineGamesStorage.getCurrentLocal1v1Game());

const local1v1Pseudos = (): [string, string] => {
    if (!currentLocal1v1Game) {
        return ['', ''];
    }

    const { seats, redSeat } = currentLocal1v1Game;

    return [seats[redSeat], seats[1 - redSeat]];
};

const aiHistory = offlineGamesStorage.getHistory('ai');
const local1v1History = offlineGamesStorage.getHistory('local1v1');
</script>

<template>
    <div class="container-fluid my-3">
        <h2>{{ $t('local_play.title') }}</h2>

        <section class="mb-5">
            <h3>{{ $t('local_play.vs_computer') }}</h3>

            <div class="row g-3 mb-3">
                <div class="play-buttons col-12 col-sm-6 col-md-4">
                    <button type="button" class="btn w-100 btn-primary" @click="() => create1vOfflineAIAndJoinGame()">
                        <IconRobot class="fs-3" />
                        <br>
                        {{ $t('new_game_vs_ai') }}
                    </button>
                </div>

                <div v-if="currentAIGame" class="col-12 col-sm-6 col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <AppOfflineMiniBoard :gameData="currentAIGame.gameData" />
                            <router-link :to="{ name: 'play-vs-offline-ai' }" class="stretched-link">{{ $t('continue_game_vs_x', { playerNickname: currentAIGame.players.find(p => p.isBot)?.pseudo ?? 'AI' }) }}</router-link>
                        </div>
                    </div>
                </div>
            </div>

            <AppOfflineGamesHistory :entries="aiHistory" mode="ai" />
        </section>

        <section class="mb-5">
            <h3>{{ $t('local_play.with_friend') }}</h3>

            <div class="row g-3 mb-3">
                <div class="play-buttons col-12 col-sm-6 col-md-4">
                    <button type="button" class="btn w-100 btn-success" @click="() => createLocal1v1AndJoinGame()">
                        <IconPeopleFill class="fs-3" />
                        <br>
                        {{ $t('local_play.new_game_with_friend') }}
                    </button>
                </div>

                <div v-if="currentLocal1v1Game" class="col-12 col-sm-6 col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <AppOfflineMiniBoard :gameData="currentLocal1v1Game.gameData" />
                            <router-link :to="{ name: 'play-local-1v1' }" class="stretched-link">{{ $t('local_play.continue_game_x_vs_y', { player1: local1v1Pseudos()[0], player2: local1v1Pseudos()[1] }) }}</router-link>
                        </div>
                    </div>
                </div>
            </div>

            <AppOfflineGamesHistory :entries="local1v1History" mode="local1v1" />
        </section>
    </div>
</template>

<style lang="stylus" scoped>
.play-buttons
    .btn
        height 100%
        min-height 6em

        @media (min-width: 992px)
            min-height 7em

h3
    font-size 1.4rem
    margin-bottom 0.75em
</style>
