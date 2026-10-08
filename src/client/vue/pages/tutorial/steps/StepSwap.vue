<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { GameView, HexagonMark } from '@playhex/pixi-board';
import type { HexMove } from '@playhex/move-notation';
import type { EngineGame } from '../../../../../shared/game-engine/index.js';
import { calcDaviesMoveFor9x9Board } from '../../../../../shared/app/daviesBot.js';
import { PlayerSettingsFacade } from '../../../../services/board-view-facades/PlayerSettingsFacade.js';
import { useTutorialControls } from '../../../composables/tutorialControls.js';
import { sanitizedT } from '../tutorialUtils.js';
import AppTutorialBotGame from '../components/AppTutorialBotGame.vue';
import AppTutorialStepEnd from '../components/AppTutorialStepEnd.vue';
import { IconInfoCircle } from '../../../icons.js';

const { markCompleted } = useTutorialControls();

// Swap, then play Davies 1
const swapTextStep = ref<'init' | 'swapped' | 'not_swapped' | 'won' | 'lost'>('init');

const daviesBot = (game: EngineGame): Promise<HexMove> => calcDaviesMoveFor9x9Board(game, 1, 300);

const onPlayed = (move: HexMove, moveIndex: number): void => {
    if (moveIndex === 1) {
        swapTextStep.value = move === 'swap-pieces'
            ? 'swapped'
            : 'not_swapped'
        ;
    }
};

const onEnded = (won: boolean): void => {
    swapTextStep.value = won ? 'won' : 'lost';

    if (won) {
        void markCompleted('swap');
    }
};

// Swap map
const container = useTemplateRef<HTMLElement>('container');
const gameView = new GameView(11);
const playerSettingsFacade = new PlayerSettingsFacade(gameView);
const showSwapMap = ref(false);

/**
 * From https://zhuanlan.zhihu.com/p/476464087
 * 11x11 board swap map
 */
const swapMap11 = [
    [ 0.2,  0.2,  0.2,  0.1,  0.1,  0.1,  0.1,  0.1,  0.1,  0.1, 93.3],
    [ 5.0,  4.5, 14.0,  1.4,  0.6,  0.8,  2.0,  2.1,  7.7, 99.7, 97.5],
    [ 5.0, 99.4, 98.9, 97.2, 97.2, 96.8, 96.0, 97.1, 99.9, 94.6,  3.7],
    [93.8, 91.4, 99.9, 99.8, 99.5, 99.8, 99.2,100.0, 99.7, 99.8, 93.4],
    [95.7, 99.0, 99.1, 99.9, 99.9, 99.8, 99.8, 99.9, 99.9, 99.5, 96.3],
    [91.7, 99.8, 99.7, 99.8, 99.9, 99.9, 99.8, 99.9, 99.7, 99.8, 91.7],
    [96.3, 99.5, 99.9, 99.9, 99.9, 99.9, 99.8, 99.9, 99.1, 99.0, 95.7],
    [93.4, 99.8, 99.7,100.0, 99.2, 99.8, 99.5, 99.8, 99.9, 91.4, 93.8],
    [ 3.7, 94.6, 99.9, 97.1, 96.0, 96.8, 97.2, 97.2, 98.9, 99.4,  5.0],
    [97.5, 99.7,  7.7,  2.1,  2.0,  0.8,  0.6,  1.4, 14.0,  4.5,  5.0],
    [93.3,  0.1,  0.1,  0.1,  0.1,  0.1,  0.1,  0.1,  0.1,  0.2,  0.2],
] as const;

for (let row = 0; row < 11; ++row) {
    for (let col = 0; col < 11; ++col) {
        const winrate = swapMap11[row][col];
        const color = winrate < 50 ? 0x0d6efd : 0xdc3545;

        const mark = new HexagonMark(color, 0.5);
        mark.setCoords({ row, col });
        mark.alpha = Math.abs(winrate / 50 - 1);
        mark.alpha **= 4; // Adds more contrast
        gameView.addEntity(mark, 'swap_map');
    }
}

onMounted(async () => {
    if (!container.value) {
        throw new Error('no container');
    }

    await gameView.mount(container.value);
});

onUnmounted(() => {
    playerSettingsFacade.destroy();
    gameView.destroy();
});
</script>

<template>
    <h1>{{ $t('tutorial.rule_2_swap') }}</h1>

    <p>
        <i18next :translation="$t('tutorial.red_has_strong_advantage')">
            <template #red>
                <span class="text-danger">{{ $t('game.red') }}</span>
            </template>
        </i18next>
    </p>

    <p v-html="sanitizedT('tutorial.we_use_swap_rule')"></p>

    <p>
        <i18next :translation="$t('tutorial.on_first_turn_blue_can_swap')">
            <template #red>
                <span class="text-danger">{{ $t('game.red') }}</span>
            </template>
            <template #blue>
                <span class="text-primary">{{ $t('game.blue') }}</span>
            </template>
        </i18next>
    </p>

    <AppTutorialBotGame
        :boardsize="9"
        :bot="daviesBot"
        :playerIndex="1"
        openingMove="d6"
        @started="swapTextStep = 'init'"
        @played="onPlayed"
        @undone="movesCount => movesCount <= 1 && (swapTextStep = 'init')"
        @ended="onEnded"
    >
        <template #message>
            <i18next v-if="swapTextStep === 'init'" :translation="$t('tutorial.you_play_blue_swap_it')">
                <template #red>
                    <span class="text-danger">{{ $t('game.red') }}</span>
                </template>
                <template #blue>
                    <span class="text-primary">{{ $t('game.blue') }}</span>
                </template>
            </i18next>

            <template v-if="swapTextStep === 'swapped'">{{ $t('tutorial.swapped') }}</template>
            <template v-if="swapTextStep === 'not_swapped'">{{ $t('tutorial.not_swapped') }}</template>
            <template v-if="swapTextStep === 'won'">{{ $t('tutorial.swap_won') }}</template>
            <template v-if="swapTextStep === 'lost'">{{ $t('tutorial.swap_lost') }}</template>
        </template>
    </AppTutorialBotGame>

    <p><IconInfoCircle /> {{ $t('tutorial.swap_rule_keeps_games_balanced') }}</p>

    <ul>
        <li>
            <i18next :translation="$t('tutorial.red_strong_get_swapped')">
                <template #red>
                    <span class="text-danger">{{ $t('game.red') }}</span>
                </template>
                <template #blue>
                    <span class="text-primary">{{ $t('game.blue') }}</span>
                </template>
            </i18next>
        </li>
        <li>
            <i18next :translation="$t('tutorial.red_weak_dont_get_swapped')">
                <template #red>
                    <span class="text-danger">{{ $t('game.red') }}</span>
                </template>
                <template #blue>
                    <span class="text-primary">{{ $t('game.blue') }}</span>
                </template>
            </i18next>
        </li>
    </ul>

    <p>
        <i18next :translation="$t('tutorial.so_red_should_open_fair_move')">
            <template #red>
                <span class="text-danger">{{ $t('game.red') }}</span>
            </template>
        </i18next>
    </p>

    <p><strong>{{ $t('tutorial.what_is_a_fair_opening_move') }}</strong></p>

    <p v-html="sanitizedT('tutorial.center_too_strong_open_sides')"></p>

    <button
        v-if="!showSwapMap"
        @click="showSwapMap = true"
        class="btn btn-link p-0"
    >{{ $t('tutorial.show_swap_map') }}</button>

    <div v-show="showSwapMap" class="card">
        <div class="card-body">
            <p class="text-center card-text">
                <i18next :translation="$t('tutorial.swap_map_explain')">
                    <template #red>
                        <span class="text-danger">{{ $t('game.red') }}</span>
                    </template>
                    <template #blue>
                        <span class="text-primary">{{ $t('game.blue') }}</span>
                    </template>
                </i18next>
            </p>

            <div ref="container" class="board"></div>

            <p class="text-center text-body-secondary card-text">
                <small><a href="https://zhuanlan.zhihu.com/p/476464087" target="_blank">{{ $t('tutorial.swap_map_credits') }}</a></small>
            </p>
        </div>
    </div>

    <p class="lead text-center mt-4"><strong>{{ $t('tutorial.congrats_you_know_play_hex') }}</strong></p>

    <AppTutorialStepEnd stepId="swap" />
</template>

<style lang="stylus" scoped>
.board
    width 100%
    height 60vh
</style>
