<script setup lang="ts">
import { t } from 'i18next';
import { onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import { GameView } from '@playhex/pixi-board';
import { EngineGame, PlayerIndex } from '../../../../shared/game-engine/index.js';
import { GameViewFacade } from '../../../services/board-view-facades/GameViewFacade.js';
import AppGameView from '../../components/AppGameView.vue';
import AppLocalSimulationControls from '../components/AppLocalSimulationControls.vue';
import AppLocalGameExport from '../components/AppLocalGameExport.vue';
import { OfflineGameMode, offlineGamesStorage } from '../services/OfflineGamesStorage.js';
import { bindLocalBoardDisplay } from '../services/localBoardDisplay.js';
import { IconArrowLeft, IconHourglass, IconTrophyFill } from '../../icons.js';

/*
 * Reopen a recent local game from history, to review it and simulate moves.
 */

useHead({
    title: t('local_play.review'),
});

const route = useRoute();

const mode = String(route.params.mode) as OfflineGameMode;
const entry = mode === 'ai' || mode === 'local1v1'
    ? offlineGamesStorage.getHistory(mode)[Number(route.params.index)] ?? null
    : null
;

const game = entry ? EngineGame.fromData(entry.gameData) : null;
const gameView = game ? new GameView(game.getSize()) : null;
const gameViewFacade = game && gameView ? new GameViewFacade(gameView, game) : null;
const unbindBoardDisplay = gameViewFacade ? bindLocalBoardDisplay(gameViewFacade) : null;

gameViewFacade?.enableSimulationMode();

const winner = game?.getWinner() ?? null;
const timeWinner = entry?.timeoutLoser == null ? null : (1 - entry.timeoutLoser) as PlayerIndex;

onUnmounted(() => {
    unbindBoardDisplay?.();
    gameView?.destroy();
});
</script>

<template>
    <div class="local-review bg-body">
        <div class="review-header">
            <router-link class="btn btn-outline-primary" :to="{ name: 'offline-lobby' }" :title="$t('back_to_menu')">
                <IconArrowLeft />
            </router-link>

            <span v-if="entry" class="players text-truncate">
                <template v-for="playerIndex in ([0, 1] as PlayerIndex[])" :key="playerIndex">
                    <template v-if="1 === playerIndex"> – </template>
                    <strong :class="0 === playerIndex ? 'text-danger' : 'text-primary'">{{ entry.pseudos[playerIndex] }}</strong>
                    <IconTrophyFill v-if="winner === playerIndex" class="ms-1 text-warning" />
                    <IconHourglass v-if="timeWinner === playerIndex" class="ms-1 text-secondary" />
                </template>
            </span>
        </div>

        <template v-if="gameView && gameViewFacade && game && entry">
            <div class="board-area">
                <AppGameView :gameView class="board" />
            </div>

            <AppLocalSimulationControls :gameViewFacade :closable="false" />

            <div class="review-export">
                <AppLocalGameExport :game :pseudos="entry.pseudos" :orientation="gameView.getOrientation()" />
            </div>
        </template>

        <p v-else class="container my-3 text-secondary">{{ $t('local_play.game_not_found') }}</p>
    </div>
</template>

<style lang="stylus" scoped>
.local-review
    display flex
    flex-direction column
    height calc(100vh - 3rem)
    height calc(100dvh - 3rem)
    overflow hidden

.review-header
    flex-shrink 0
    display flex
    align-items center
    gap 0.75em
    height 3rem
    padding 0 0.5em

    .players
        min-width 0

.board-area
    position relative
    flex 1
    min-height 0

    .board
        position absolute
        inset 0

.review-export
    flex-shrink 0
    display flex
    justify-content center
    padding 0.25em 0.5em 0.5em
</style>
