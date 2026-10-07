<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { GameView, HexagonMark } from '@playhex/pixi-board';
import { type Move, parseMove } from '@playhex/move-notation';
import { swapMaps } from '../../../shared/swap-maps/swap-maps.js';
import { PlayerSettingsFacade } from '../../services/board-view-facades/PlayerSettingsFacade.js';

useHead({
    title: t('swap_maps.title'),
});

const availableSizes = Object.keys(swapMaps).map(Number).sort((a, b) => a - b);
const minSize = availableSizes[0];
const maxSize = availableSizes[availableSizes.length - 1];

const boardsize = ref(11);
const container = ref<HTMLElement>();
const hoveredMove = ref<null | Move>(null);
const hoveredValue = ref<null | number>(null);

let gameView: null | GameView = null;
let unmounted = false;

const createGameView = async (size: number): Promise<void> => {
    if (!container.value) {
        throw new Error('no container');
    }

    gameView?.destroy();
    gameView = null;
    hoveredMove.value = null;
    hoveredValue.value = null;

    const swapMap = swapMaps[size];
    const newGameView = new GameView(size);
    new PlayerSettingsFacade(newGameView);

    for (let row = 0; row < size; ++row) {
        for (let col = 0; col < size; ++col) {
            const winrate = swapMap[row][col];
            const color = winrate < 0.5 ? 0x0d6efd : 0xdc3545;

            const mark = new HexagonMark(color, 0.5);
            mark.setCoords({ row, col });
            mark.alpha = Math.abs(winrate * 2 - 1) ** 4; // Adds more contrast
            newGameView.addEntity(mark, 'swap_map');
        }
    }

    const onHex = (move: Move) => {
        const { row, col } = parseMove(move);

        hoveredMove.value = move;
        hoveredValue.value = swapMap[row]?.[col] ?? null;
    };

    newGameView.on('hexHovered', onHex);
    newGameView.on('hexClicked', onHex);

    await newGameView.mount(container.value);

    gameView = newGameView;
};

/**
 * Rebuild views one at a time, so a fast slider move
 * does not destroy a view while it is still mounting.
 */
let queue: Promise<void> = Promise.resolve();

const refreshGameView = (): void => {
    queue = queue.then(async () => {
        if (unmounted || gameView?.getBoardsize() === boardsize.value) {
            return;
        }

        await createGameView(boardsize.value);
    });
};

onMounted(refreshGameView);
watch(boardsize, refreshGameView);

onUnmounted(() => {
    unmounted = true;
    void queue.then(() => gameView?.destroy());
});
</script>

<template>
    <div class="container my-2">
        <h1 class="h3">{{ $t('swap_maps.title') }}</h1>

        <label for="swap-map-boardsize" class="form-label mb-0">
            {{ $t('swap_maps.board_size', { size: boardsize }) }}
        </label>
        <input
            id="swap-map-boardsize"
            v-model.number="boardsize"
            type="range"
            class="form-range"
            :min="minSize"
            :max="maxSize"
            step="1"
        >

        <div ref="container" class="board"></div>

        <p class="text-center winrate">
            <template v-if="hoveredMove !== null && hoveredValue !== null">
                <strong>{{ hoveredMove }}</strong>:
                <i18next :translation="$t('swap_maps.red_winrate')">
                    <template #red>
                        <span class="text-danger">{{ $t('game.red') }}</span>
                    </template>
                    <template #winrate>
                        <strong>{{ (hoveredValue * 100).toFixed(1) }}%</strong>
                    </template>
                </i18next>
            </template>
            <template v-else>&nbsp;</template>
        </p>

        <p>
            <i18next :translation="$t('swap_maps.explain')">
                <template #red>
                    <span class="text-danger">{{ $t('game.red') }}</span>
                </template>
                <template #blue>
                    <span class="text-primary">{{ $t('game.blue') }}</span>
                </template>
            </i18next>
        </p>

        <p class="text-body-secondary">
            <small>{{ $t('swap_maps.credits') }}</small>
        </p>
    </div>
</template>

<style lang="stylus" scoped>
.container
    max-width 50em

/*
 * Board must fit in screen with header, title, slider and win rate line,
 * whatever the screen size.
 */
.board
    width 100%
    height calc(100vh - 14rem)
    height calc(100dvh - 14rem)
    min-height 15rem

.winrate
    margin 0.25rem 0 1rem
</style>
