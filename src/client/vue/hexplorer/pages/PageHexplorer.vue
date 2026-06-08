<script setup lang="ts">
import { GameView, Hex, PlayingGameFacade, SimulatePlayingGameFacade } from '@playhex/pixi-board';
import { Graphics } from 'pixi.js';
import { onKeyDown, whenever } from '@vueuse/core';
import { computed, ref, shallowRef, useTemplateRef } from 'vue';
import { PlayerSettingsFacade } from '../../../services/board-view-facades/PlayerSettingsFacade';
import { ToolInterface } from '../tools/ToolInterface';
import { PlaceStonesAlternatelyTool } from '../tools/PlaceStonesAlternatelyTool';
import { PlaceStoneTool } from '../tools/PlaceStoneTool';
import { useHead } from '@unhead/vue';
import { coordsToMove } from '../../../../shared/move-notation/move-notation';
import { parseHexworldString } from '../../../../shared/app/hexworld';
import { HexMove } from '../../../../shared/move-notation/hex-move-notation';
import { UndoableActionsStack } from '../undoredo/undoredo';
import { $ } from 'vue-router/dist/useApi-D6ckOsFy.js';

useHead({
    title: 'Hexplorer',
});

/**
 * Actions made so far.
 * Can be undo/redo.
 */
const actionsStack = ref(new UndoableActionsStack());

const initGameViewFromUrlHash = (): { gameView: GameView, playingGameFacade: PlayingGameFacade, simulatePlayingGameFacade: SimulatePlayingGameFacade } => {
    const { hash } = document.location;

    if (hash.length <= 1) {
        const gameView = new GameView(11);
        const playingGameFacade = new PlayingGameFacade(gameView, true, [], false);
        const simulatePlayingGameFacade = new SimulatePlayingGameFacade(playingGameFacade);

        return { gameView, playingGameFacade, simulatePlayingGameFacade };
    }

    const { size, moves } = parseHexworldString(hash.substring(1));

    const gameView = new GameView(size);
    const playingGameFacade = new PlayingGameFacade(gameView, true, moves as HexMove[], false);
    const simulatePlayingGameFacade = new SimulatePlayingGameFacade(playingGameFacade);

    return { gameView, playingGameFacade, simulatePlayingGameFacade };
};

const { gameView, playingGameFacade, simulatePlayingGameFacade } = initGameViewFromUrlHash();
const gameViewElement = useTemplateRef('game-view-element');
const currentPlayer = ref<0 | 1>(0);

const currentTool = shallowRef<ToolInterface>(new PlaceStonesAlternatelyTool(gameView));
const whiteWin = ref(0.5);

const redBarHeightCss = computed(() => `${100 - whiteWin.value * 100}%`);
const blueBarHeightCss = computed(() => `${whiteWin.value * 100}%`);

new PlayerSettingsFacade(gameView);

gameView.on('hexClicked', move => {
    actionsStack.value.pushAndDo(currentTool.value.createUndoableAction(move));
});

let policyOverlays: Graphics[][] = [];

whenever(gameViewElement, async element => {
    await gameView.mount(element);

    for (let row = 0; row < gameView.getBoardsize(); ++row) {
        policyOverlays[row] = [];
        for (let col = 0; col < gameView.getBoardsize(); ++col) {
            const g = new Graphics();
            policyOverlays[row][col] = g;
            gameView.getHexByCoords({ row, col }).addChild(g);
        }
    }

    void updateAnal();
}, {
    once: true,
});


type AnalInput = {
    size: number;
    color: 'black' | 'white';
    black: string;
    white: string;
};

type AnalOutput = {
    whiteWin: number;
    policy: number[][];
};

const anal = async (position: AnalInput): Promise<AnalOutput> => {
    const response = await fetch('/api/hexplorer/analyze-position', {
        method: 'post',
        body: JSON.stringify(position),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json();
};

const applyPolicy = (policy: number[][], color: 'black' | 'white'): void => {
    if (policyOverlays.length === 0) return;

    const markerColor = color === 'black' ? 0xee3333 : 0x3388ee;
    const max = Math.max(...policy.flat());

    for (let row = 0; row < gameView.getBoardsize(); ++row) {
        for (let col = 0; col < gameView.getBoardsize(); ++col) {
            const g = policyOverlays[row][col];
            g.clear();
            g.regularPoly(0, 0, Hex.INNER_RADIUS * 0.6, 6);
            g.fill({ color: markerColor });
            g.alpha = max > 0 ? policy[row][col] / max : 0;
        }
    }
};

const cachedAnal: { [cacheKey: string]: AnalOutput } = {};

const updateAnal = async () => {
    const black: string[] = [];
    const white: string[] = [];

    for (let i = 0; i < gameView.getBoardsize(); ++i) {
        for (let j = 0; j < gameView.getBoardsize(); ++j) {
            const move = coordsToMove({ row: j, col: i });
            const stone = gameView.getStone(move);

            if (!stone) {
                continue;
            }

            if (stone.getPlayerIndex() === 0) black.push(move);
            if (stone.getPlayerIndex() === 1) white.push(move);
        }
    }

    const analInput: AnalInput = {
        size: gameView.getBoardsize(),
        color: currentPlayer.value === 0 ? 'black' : 'white',
        black: black.join(' '),
        white: white.join(' '),
    };

    const cacheKey = [
        analInput.size,
        analInput.color,
        analInput.black,
        analInput.white,
    ].join('|');

    const result = cachedAnal[cacheKey] ?? (cachedAnal[cacheKey] = await anal(analInput));

    whiteWin.value = result.whiteWin;
    applyPolicy(result.policy, currentPlayer.value === 0 ? 'black' : 'white');
};

gameView.on('hexClicked', () => {
    void updateAnal();
});

/**
 * Custom mode allow place any stone anywhere.
 * Once in custom mode, simulated playing game is no longer used,
 * and can get back to normal mode only by undoing actions.
 */
const modeCustom = ref<boolean>(false);

const goCustomMode = () => {
    actionsStack.value.pushAndDo({
        do: () => {
            modeCustom.value = true;
        },
        undo: () => {
            modeCustom.value = false;
        },
    });
};

// ctrl+Z/Y
onKeyDown(
    e => (e.ctrlKey || e.metaKey) && e.key === 'z',
    e => {
        e.preventDefault();
        actionsStack.value.undo();
    },
);

onKeyDown(
    e => (e.ctrlKey || e.metaKey) && e.key === 'y',
    e => {
        e.preventDefault();
        actionsStack.value.redo();
    },
);

// left/right
onKeyDown(
    'ArrowLeft',
    e => {
        if (modeCustom.value) {
            return;
        }

        e.preventDefault();
        simulatePlayingGameFacade.rewind();
        currentPlayer.value = simulatePlayingGameFacade.getCurrentPlayerIndex();
        void updateAnal();
    },
);

onKeyDown(
    'ArrowRight',
    e => {
        if (modeCustom.value) {
            return;
        }

        e.preventDefault();
        simulatePlayingGameFacade.forward();
        currentPlayer.value = simulatePlayingGameFacade.getCurrentPlayerIndex();
        void updateAnal();
    },
);
</script>

<template>
    <div class="layout bg-body">
        <div class="left-analysis-bar">
            <div class="advantage advantage-blue bg-primary"></div>
            <div class="advantage advantage-red bg-danger"></div>
        </div>
        <div ref="game-view-element" class="game-view"></div>
    </div>

    <div class="bottom-menu">
        <button
            v-if="!modeCustom"
            @click="goCustomMode"
            class="btn btn-outline-warning"
        >go custom mode</button>

        <p v-else>custom mode</p>

        <template v-if="modeCustom">
            <button
                @click="actionsStack.undo()"
                class="btn btn-outline-warning"
                :disabled="!actionsStack.canUndo()"
            >undo</button>

            <button
                @click="actionsStack.redo()"
                class="btn btn-outline-warning"
                :disabled="!actionsStack.canRedo()"
            >redo</button>

            <button
                @click="currentTool = new PlaceStonesAlternatelyTool(gameView)"
                class="btn btn-outline-success"
            >alt</button>

            <button
                @click="currentTool = new PlaceStoneTool(gameView, 0)"
                class="btn btn-outline-danger"
            >red</button>

            <button
                @click="currentTool = new PlaceStoneTool(gameView, 1)"
                class="btn btn-outline-primary"
            >blue</button>

            <button
                @click="currentPlayer = currentPlayer === 0 ? 1 : 0; updateAnal()"
                class="btn"
                :class="currentPlayer === 0 ? 'btn-outline-danger' : 'btn-outline-primary'"
            >current: {{ currentPlayer }}</button>
        </template>

        <template v-else>
            <button
                @click="simulatePlayingGameFacade.rewind()"
                class="btn btn-outline-primary"
            >back</button>

            <button
                @click="simulatePlayingGameFacade.forward()"
                class="btn btn-outline-primary"
            >forward</button>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
.layout
    display flex

    .left-analysis-bar
        display block
        width 2rem
        height calc(100dvh - 6rem)

        .advantage
            display flex
            width 1rem
            transition-property height
            transition-duration 200ms

        .advantage-red
            height v-bind(redBarHeightCss)

        .advantage-blue
            height v-bind(blueBarHeightCss)

    .game-view
        width calc(100vw - 2rem)
        height calc(100vh - 6rem) // (fallback if dvh is not supported)
        height calc(100dvh - 6rem) // 6rem = header and bottom game menu height

.bottom-menu
    height 3rem
    display flex
    justify-content center
    gap 0.25em
    align-items center
</style>
