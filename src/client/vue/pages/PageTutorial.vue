<script setup lang="ts">
import DOMPurify from 'dompurify';
import { calcRandomMove, Game, PlayerIndex } from '../../../shared/game-engine/index.js';
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import CellAlreadyOccupiedError from '../../../shared/game-engine/errors/CellAlreadyOccupiedError.js';
import { calcDaviesMoveFor9x9Board } from '../../../shared/app/daviesBot.js';
import { apiPostGame } from '../../apiClient.js';
import { useRouter } from 'vue-router';
import useAiConfigsStore from '../../stores/aiConfigsStore.js';
import { IconBoxArrowUpRight, IconCheck, IconDiscord, IconInfoCircle, IconPeople, IconTablerSwords, IconTrophy } from '../icons.js';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import HexagonMark from '../../../shared/pixi-board/entities/HexagonMark.js';
import { HexMove } from '../../../shared/move-notation/hex-move-notation.js';
import { useGameViewFacade } from '../composables/useGameViewFacade.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { PlayerSettingsFacade } from '../../services/board-view-facades/PlayerSettingsFacade.js';

useHead({
    title: t('how_to_play_hex'),
});

// Demo 0: show full path and play random bot
const game0 = new Game(6);
game0.setAllowSwap(false);
const container0 = ref<HTMLElement>();
const demo0Step = ref(0);

const movesDemo0: HexMove[] = 'd3 c5 e4 e2 d2 d1 e1 e5 d5 d6 c6 d4 e3'.split(' ') as HexMove[];

const gameView0 = useGameViewFacade(game0);

const animation: [() => void, number][] = [];
const pause = () => {};

animation.push([pause, 2000]);

for (let i = 0; i < movesDemo0.length; ++i) {
    animation.push([
        () => game0.move(movesDemo0[i], i % 2 as PlayerIndex),
        350,
    ]);
}

animation.push([() => game0.resetGame(), 2500]);
animation.push([() => {
    demo0Step.value = 1;

    game0.on('ended', winner => {
        if (winner === 0) {
            demo0Step.value = 2;
        } else {
            demo0Step.value = 3;
        }
    });
}, 0]);

animation.push([() => {
    gameView0.getGameView().on('hexClicked', async coords => {
        if (game0.getCurrentPlayerIndex() === 1 || game0.isEnded()) {
            return;
        }

        try {
            const move = game0.moveOrSwapPieces(coords);
            game0.move(move, game0.getCurrentPlayerIndex());

            if (game0.isEnded()) {
                return;
            }

            const randomMove = await calcRandomMove(game0, 100);
            game0.move(randomMove, game0.getCurrentPlayerIndex());
        } catch (e) {
            if (e instanceof CellAlreadyOccupiedError) {
                return;
            }

            throw e;
        }
    });
}, 0]);

let animationTime = 0;

for (const [action, wait] of animation) {
    animationTime += wait;
    setTimeout(action, animationTime);
}

// Demo 1: swap and play davies 1
const gameSwap = new Game(9);
const container1 = ref<HTMLElement>();
const gameView1 = useGameViewFacade(gameSwap);
const swapTextStep = ref<'init' | 'swapped' | 'not_swapped' | 'won' | 'lost'>('init');

gameSwap.move('d6', 0);

gameSwap.on('ended', winner => {
    swapTextStep.value = winner === 1
        ? 'won'
        : 'lost'
    ;
});

gameSwap.on('played', (timestampedMove, moveIndex) => {
    if (moveIndex === 1) {
        swapTextStep.value = timestampedMove.move === 'swap-pieces'
            ? 'swapped'
            : 'not_swapped'
        ;
    }
});

gameView1.getGameView().on('hexClicked', async coords => {
    if (gameSwap.getCurrentPlayerIndex() === 0 || gameSwap.isEnded()) {
        return;
    }

    try {
        const move = gameSwap.moveOrSwapPieces(coords);
        gameSwap.move(move, gameSwap.getCurrentPlayerIndex());

        if (gameSwap.isEnded()) {
            return;
        }

        const daviesAIMove = await calcDaviesMoveFor9x9Board(gameSwap, 1, 300);
        gameSwap.move(daviesAIMove, gameSwap.getCurrentPlayerIndex());
    } catch (e) {
        if (e instanceof CellAlreadyOccupiedError) {
            return;
        }

        throw e;
    }
});

// Swap map
const container2 = ref<HTMLElement>();
const gameView2 = new GameView(11);
new PlayerSettingsFacade(gameView2);
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
        const alpha = Math.abs(winrate / 50 - 1);

        const mark = new HexagonMark(color, 0.5);
        mark.setCoords({ row, col });
        mark.alpha = alpha;
        mark.alpha **= 4; // Adds more contrast
        gameView2.addEntity(mark, 'swap_map');
    }
}

onMounted(async () => {
    if (!container0.value) {
        throw new Error('no container0');
    }

    if (!container1.value) {
        throw new Error('no container1');
    }

    if (!container2.value) {
        throw new Error('no container2');
    }

    await gameView0.getGameView().mount(container0.value);
    await gameView1.getGameView().mount(container1.value);
    await gameView2.mount(container2.value);
});

const router = useRouter();
const { aiConfigs } = storeToRefs(useAiConfigsStore());

const playVsAI = async () => {
    const firstAiConfig = aiConfigs.value[0]; // Should be the easiest AI

    const hostedGame = await apiPostGame({
        boardsize: 11,
        opponentType: 'ai',
        ranked: false,
        opponentPublicId: firstAiConfig.player.publicId,
        timeControlType: {
            family: 'fischer',
            options: {
                initialTime: 1800000,
                timeIncrement: 10000,
            },
        },
    });

    await router.push({
        name: 'online-game',
        params: {
            gameId: hostedGame.publicId,
        },
    });
};

const playVsPlayer = async () => {
    const hostedGame = await apiPostGame({
        boardsize: 11,
        opponentType: 'player',
        ranked: false,
        timeControlType: {
            family: 'fischer',
            options: {
                initialTime: 600000,
                timeIncrement: 5000,
            },
        },
    });

    await router.push({
        name: 'online-game',
        params: {
            gameId: hostedGame.publicId,
        },
    });
};

const sanitizedT = (key: string, allowedTags: string[] = ['strong']): string => {
    return DOMPurify.sanitize(
        t(key),
        { ALLOWED_TAGS: allowedTags },
    );
};
</script>

<template>
    <div class="container my-3">
        <h1>{{ $t('how_to_play_hex') }}</h1>

        <p v-html="sanitizedT('tutorial.hex_is_simple_and_has_two_rules')"></p>

        <h2 v-html="sanitizedT('tutorial.rule_1_connect_your_sides')"></h2>

        <p v-html="sanitizedT('tutorial.to_win_you_must_connect_with_path')"></p>

        <div class="card mb-3">
            <div class="card-body">
                <div ref="container0" class="board"></div>

                <p class="text-center card-text">
                    <i18next v-if="demo0Step === 0" :translation="$t('tutorial.demo_0_step_example')">
                        <template #red>
                            <span class="text-danger">{{ $t('game.red') }}</span>
                        </template>
                    </i18next>

                    <i18next v-if="demo0Step === 1" :translation="$t('tutorial.demo_0_step_lets_play')">
                        <template #red>
                            <span class="text-danger">{{ $t('game.red') }}</span>
                        </template>
                    </i18next>

                    <template v-if="demo0Step === 2">
                        <IconTrophy /> {{ $t('tutorial.demo_0_step_congrats') }}
                    </template>

                    <template v-if="demo0Step === 3">
                        Haha…
                    </template>
                </p>
            </div>
        </div>

        <p><IconInfoCircle /> {{ $t('tutorial.stones_are_played_this_way') }}</p>

        <ul>
            <li v-html="sanitizedT('tutorial.each_player_place_a_stone')"></li>
            <li v-html="sanitizedT('tutorial.stones_are_never_removed')"></li>
        </ul>


        <h2>{{ $t('tutorial.rule_2_swap') }}</h2>

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

        <div class="card mb-3">
            <div class="card-body">
                <div ref="container1" class="board"></div>

                <p class="text-center card-text">
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
                </p>
            </div>
        </div>

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

                <div ref="container2" class="board"></div>

                <p class="text-center text-body-secondary card-text">
                    <small><a href="https://zhuanlan.zhihu.com/p/476464087" target="_blank">{{ $t('tutorial.swap_map_credits') }}</a></small>
                </p>
            </div>
        </div>

        <p class="lead text-center congrats"><IconCheck /> {{ $t('tutorial.congrats_you_know_play_hex') }}</p>


        <h2>{{ $t('tutorial.what_to_do_next') }}</h2>

        <div class="row what-next g-3">
            <div class="col-sm-6 mt-3">
                <div class="card h-100">
                    <div class="card-body">
                        <p class="card-text">
                            <IconTablerSwords class="display-4" />
                            <br>
                            {{ $t('tutorial.play_vs_ai_desc') }}
                        </p>

                        <button
                            @click="playVsAI"
                            class="btn btn-lg btn-success stretched-link"
                            type="button"
                            style="margin-bottom: 0"
                            :disabled="aiConfigs.length === 0"
                        >{{ $t('tutorial.play_vs_ai_button') }}</button>
                    </div>
                </div>
            </div>
            <div class="col-sm-6 mt-3">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="row g-0">
                            <div class="col-md-3 d-none d-md-block">
                                <img
                                    src="/images/links/500-puzzles.png"
                                    alt="500 Hex puzzles by Matthew Seymour"
                                    class="img-fluid mb-2"
                                />
                            </div>
                            <div class="col-md-9 gx-3">
                                <p>
                                    {{ $t('tutorial.do_some_puzzle_desc') }}
                                    <br>
                                    <small class="text-body-secondary">{{ $t('tutorial.do_some_puzzle_credits') }}</small>
                                </p>
                            </div>
                        </div>

                        <a
                            class="btn btn-lg btn-success stretched-link"
                            href="http://www.mseymour.ca/hex_puzzle/"
                            target="_blank"
                        >{{ $t('tutorial.do_some_puzzle_button') }} <IconBoxArrowUpRight /></a>
                    </div>
                </div>
            </div>
        </div>

        <p class="mt-4">{{ $t('tutorial.you_can_also') }}</p>

        <div class="what-next-also">
            <button
                @click="playVsPlayer"
                class="btn btn-success"
                type="button"
                style="margin-bottom: 0"
                :disabled="aiConfigs.length === 0"
            ><IconPeople class="fs-3" /><br>{{ $t('tutorial.play_1v1') }}</button>

            <a
                href="https://discord.gg/59SJ9KwvVq"
                target="_blank"
                class="btn btn-outline-primary align-middle"
            ><IconDiscord class="fs-3" /><br>{{ $t('tutorial.join_hex_discord') }}</a>

            <a
                href="https://www.hexwiki.net/index.php/Strategy_roadmap"
                target="_blank"
                class="btn btn-outline-primary"
            >{{ $t('tutorial.what_should_i_learn_now') }} <IconBoxArrowUpRight /></a>

            <a
                href="http://www.mseymour.ca/hex_book/hexstrat.html"
                target="_blank"
                class="btn btn-outline-primary"
            >{{ $t('tutorial.read_strategy_guide') }} <IconBoxArrowUpRight /></a>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.what-next
    .card-body
        text-align center
        display flex
        flex-direction column
        justify-content space-between

.what-next-also
    display flex
    justify-content space-between
    gap 1em
    flex-direction row
    flex-wrap wrap

    > *
        min-height 6em
        flex 1 0 40%

        @media (min-width: 576px)
            flex 1 0 20%

    a
        display flex
        flex-direction column
        text-align center
        justify-content center
        align-items center

.congrats
    margin-top 2em
    margin-bottom 3em

.container
    max-width 50em

    p
        font-size 1.2em

        &.lead
            font-size 1.5em

h2
    margin-top 1em
    margin-bottom 0.5em

.board
    width 100%
    height 60vh
</style>
