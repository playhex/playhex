<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { AnimatorFacade, GameView } from '@playhex/pixi-board';
import type { HexMove } from '@playhex/move-notation';
import { calcRandomMove, EngineGame, type PlayerIndex } from '../../../../../shared/game-engine/index.js';
import { GameViewFacade } from '../../../../services/board-view-facades/GameViewFacade.js';
import { useTutorialControls } from '../../../composables/tutorialControls.js';
import { sanitizedT } from '../tutorialUtils.js';
import AppTutorialBotGame from '../components/AppTutorialBotGame.vue';
import AppTutorialStepEnd from '../components/AppTutorialStepEnd.vue';
import { IconInfoCircle, IconTrophy } from '../../../icons.js';

const { markCompleted } = useTutorialControls();

/*
 * Show an ended game with animated winning path, then play random bot
 */
const demoStep = ref<'example' | 'play' | 'won' | 'lost'>('example');

const exampleGame = new EngineGame(6);
exampleGame.setAllowSwap(false);
const exampleContainer = useTemplateRef<HTMLElement>('example-container');
const exampleGameView = new GameView(exampleGame.getSize());
const exampleGameViewFacade = new GameViewFacade(exampleGameView, exampleGame);

const movesDemo: HexMove[] = 'd3 c5 e4 e2 d2 d1 e1 e5 d5 d6 c6 d4 e3'.split(' ') as HexMove[];

movesDemo.forEach((move, i) => exampleGame.move(move, i % 2 as PlayerIndex));

let unmounted = false;
let playTimeout: null | ReturnType<typeof setTimeout> = null;

const animateExample = async (): Promise<void> => {
    const winningPath = exampleGame.getBoard().getShortestWinningPath();

    await new Promise(resolve => setTimeout(resolve, 500));

    if (winningPath && !unmounted) {
        await new AnimatorFacade(exampleGameView).animatePath(winningPath);
    }

    if (!unmounted) {
        playTimeout = setTimeout(() => demoStep.value = 'play', 2000);
    }
};

const randomBot = (game: EngineGame): Promise<HexMove> => calcRandomMove(game, 100);

const onEnded = (won: boolean): void => {
    demoStep.value = won ? 'won' : 'lost';

    if (won) {
        void markCompleted('rules');
    }
};

const destroyExample = (): void => {
    unmounted = true;

    if (playTimeout) {
        clearTimeout(playTimeout);
    }

    exampleGameViewFacade.getPlayerSettingsFacade().destroy();
    exampleGameView.destroy();
};

onMounted(async () => {
    if (!exampleContainer.value) {
        throw new Error('no container');
    }

    await exampleGameView.mount(exampleContainer.value);
    await animateExample();
});

onUnmounted(destroyExample);
</script>

<template>
    <h1>{{ $t('how_to_play_hex') }}</h1>

    <p v-html="sanitizedT('tutorial.hex_is_simple_and_has_two_rules')"></p>

    <h2 v-html="sanitizedT('tutorial.rule_1_connect_your_sides')"></h2>

    <p v-html="sanitizedT('tutorial.to_win_you_must_connect_with_path')"></p>

    <div v-if="demoStep === 'example'" class="card mb-3">
        <div class="card-body">
            <div ref="example-container" class="board"></div>

            <p class="text-center card-text mt-2">
                <i18next :translation="$t('tutorial.demo_0_step_example')">
                    <template #red>
                        <span class="text-danger">{{ $t('game.red') }}</span>
                    </template>
                </i18next>
            </p>
        </div>
    </div>

    <AppTutorialBotGame
        v-else
        :boardsize="6"
        :bot="randomBot"
        :allowSwap="false"
        @started="demoStep = 'play'"
        @ended="onEnded"
    >
        <template #message>
            <i18next v-if="demoStep === 'play'" :translation="$t('tutorial.demo_0_step_lets_play')">
                <template #red>
                    <span class="text-danger">{{ $t('game.red') }}</span>
                </template>
            </i18next>

            <template v-if="demoStep === 'won'">
                <IconTrophy /> {{ $t('tutorial.demo_0_step_congrats') }}
            </template>

            <template v-if="demoStep === 'lost'">
                {{ $t('tutorial.demo_0_step_lost') }}
            </template>
        </template>
    </AppTutorialBotGame>

    <div class="alert alert-info">
        <p><IconInfoCircle /> {{ $t('tutorial.stones_are_played_this_way') }}</p>

        <ul class="mb-0">
            <li v-html="sanitizedT('tutorial.each_player_place_a_stone')"></li>
            <li v-html="sanitizedT('tutorial.stones_are_never_removed')"></li>
        </ul>
    </div>

    <AppTutorialStepEnd stepId="rules" />
</template>

<style lang="stylus" scoped>
.board
    width 100%
    height 60vh
</style>
