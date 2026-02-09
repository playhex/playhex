<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { onMounted } from 'vue';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { PlayingGameFacade } from '../../../shared/pixi-board/facades/PlayingGameFacade.js';
import { ShadingPatternFacade } from '../../../shared/pixi-board/facades/ShadingPatternFacade.js';
import { Anchor44Facade } from '../../../shared/pixi-board/facades/Anchor44Facade.js';
import TextMark from '../../../shared/pixi-board/entities/TextMark.js';
import { PlayerSettingsFacade } from '../../services/board-view-facades/PlayerSettingsFacade.js';
import { AnimatorFacade } from '../../../shared/pixi-board/facades/AnimatorFacade.js';
import { AutoOrientationFacade } from '../../../shared/pixi-board/facades/AutoOrientationFacade.js';
import { SimulatePlayingGameFacade } from '../../../shared/pixi-board/facades/SimulatePlayingGameFacade.js';
import ConditionalMovesEditor from '../../../shared/pixi-board/conditional-moves/ConditionalMovesEditor.js';
import { ConditionalMovesFacade } from '../../../shared/pixi-board/conditional-moves/ConditionalMovesFacade.js';
import { ConditionalMovesEditorState, createConditionalMovesEditorState } from '../../../shared/pixi-board/conditional-moves/ConditionalMovesEditorState.js';

const container = ref<HTMLElement>();

const gameView = new GameView(11);
const playingGameFacade = new PlayingGameFacade(gameView, true);
const anchor44Facade = new Anchor44Facade(gameView);
const playerSettingsFacade = shallowRef<null | PlayerSettingsFacade>(null);
const animatorFacade = new AnimatorFacade(gameView);
const shadingPatternFacade = new ShadingPatternFacade(gameView);
const autoOrientationFacade = shallowRef<null | AutoOrientationFacade>(null);

playingGameFacade.addMove('b3');

shadingPatternFacade.setShadingPattern('tricolor_checkerboard', 0.5);

gameView.addEntity(new TextMark('A').setCoords({ row: 5, col: 5 }));
gameView.addEntity(new TextMark('B').setCoords({ row: 7, col: 8 }));

onMounted(async () => {
    if (!container.value) {
        throw new Error('no container');
    }

    await gameView.mount(container.value);
});

// Change bg theme when changing board theme
const bgTheme = ref<'bg-light' | 'bg-dark'>('bg-dark');

/*
 * Simulate
 */
const simulatePlayingGameFacade = shallowRef<null | SimulatePlayingGameFacade>(null);

const startSimulate = () => {
    simulatePlayingGameFacade.value = new SimulatePlayingGameFacade(playingGameFacade);
};

const stopSimulate = () => {
    if (!simulatePlayingGameFacade.value) {
        return;
    }

    simulatePlayingGameFacade.value.destroy();
    simulatePlayingGameFacade.value = null;
};

/*
 * Listen clicks on cells
 */
gameView.on('hexClicked', move => {
    if (simulatePlayingGameFacade.value) {
        simulatePlayingGameFacade.value.addSimulationMove(move);
    } else if (conditionalMovesFacade.value) {
        conditionalMovesFacade.value.clickCell(move);
    } else {
        playingGameFacade.addMove(move);
    }
});

gameView.on('hexClickedSecondary', async move => {
    if (simulatePlayingGameFacade.value) {
        playingGameFacade.addMove(move);
    } else {
        await animatorFacade.animateStone(move);
    }
});

/*
 * Conditional moves
 */
const conditionalMovesEditorStateRed = ref<ConditionalMovesEditorState>(createConditionalMovesEditorState(0));
const conditionalMovesEditorStateBlue = ref<ConditionalMovesEditorState>(createConditionalMovesEditorState(1));
const conditionalMovesEditorState = ref<null | ConditionalMovesEditorState>(null);
const editor = shallowRef<null | ConditionalMovesEditor>(null);
const conditionalMovesFacade = shallowRef<null | ConditionalMovesFacade>(null);

const enableConditionalMoves = (myIndex: 0 | 1) => {
    if (conditionalMovesFacade.value) {
        return;
    }

    conditionalMovesEditorState.value = myIndex === 0
        ? conditionalMovesEditorStateRed.value
        : conditionalMovesEditorStateBlue.value
    ;

    editor.value = new ConditionalMovesEditor(conditionalMovesEditorState.value);

    conditionalMovesFacade.value = new ConditionalMovesFacade(playingGameFacade, editor.value);
};

const disableConditionalMoves = () => {
    if (!conditionalMovesFacade.value) {
        return;
    }

    conditionalMovesFacade.value.destroy();
    conditionalMovesFacade.value = null;
};

/*
 * Debug game view events
 */
const lastHexClicked = ref('-');
gameView.on('hexClicked', move => lastHexClicked.value = move);

const lastHexSecondaryClicked = ref('-');
gameView.on('hexClickedSecondary', move => lastHexSecondaryClicked.value = move);
</script>

<template>
    <div class="container-fluid">
        <div ref="container" class="game-view-container" :class="bgTheme"></div>

        <div class="row">
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h3>Game view</h3>

                        <p>Low levels methods to manipulate the view.</p>

                        <button class="btn btn-primary" @click.prevent="gameView.toggleDisplayCoords()">Toggle coords</button>
                        <button class="btn btn-primary" @click.prevent="gameView.setTheme(themes.dark); bgTheme = 'bg-dark'">Dark</button>
                        <button class="btn btn-primary" @click.prevent="gameView.setTheme(themes.light); bgTheme = 'bg-light'">Light</button>
                        <button class="btn btn-primary" @click.prevent="gameView.setOrientation(gameView.getOrientation() + 1)">Rotate</button>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h3>Anchors 4-4</h3>

                        <p>Show dots on 4-4 cells</p>

                        <button class="btn btn-primary" @click.prevent="anchor44Facade.show44Anchors()">Show 44 dots</button>
                        <button class="btn btn-primary" @click.prevent="anchor44Facade.hide44Anchors()">Hide 44 dots</button>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h3>Shading pattern</h3>

                        <p>Change shading pattern</p>

                        <button class="btn btn-primary" @click.prevent="shadingPatternFacade.setShadingPattern('tricolor_checkerboard')">Tricolor checkerboard</button>
                        <button class="btn btn-primary" @click.prevent="shadingPatternFacade.setShadingPattern('concentrical_rings')">Concentrical rings</button>
                        <button class="btn btn-primary" @click.prevent="shadingPatternFacade.setShadingPattern(null)">None</button>
                        <button class="btn btn-primary" @click.prevent="shadingPatternFacade.setShadingPattern('tricolor_checkerboard', 1)">Tricolor checkerboard more intensity</button>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h3>Playing game</h3>

                        <p>Methods to play moves, show swap marks and last move, undo move</p>

                        <button class="btn btn-primary" @click.prevent="playingGameFacade.addMove('pass')">Pass</button>
                        <button class="btn btn-primary" @click.prevent="playingGameFacade.undoLastMove()">Undo</button>
                        <button class="btn btn-primary" @click.prevent="playingGameFacade.pauseView()">Pause view</button>
                        <button class="btn btn-primary" @click.prevent="playingGameFacade.resumeView()">Resume view</button>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h3>Simulate</h3>
                        <button v-if="!simulatePlayingGameFacade" class="btn btn-success" @click.prevent="startSimulate">Start simulate</button>
                        <div v-else>
                            <button class="btn btn-success" @click.prevent="stopSimulate">Stop simulate</button>

                            <p>Enable simulation mode. <kbd>Click</kbd> to simulate a line. <kbd>Ctrl + click</kbd> to add move not simulated, on the main line instead.</p>

                            <button class="btn btn-success" @click.prevent="simulatePlayingGameFacade.rewind()">Rewind</button>
                            <button class="btn btn-success" @click.prevent="simulatePlayingGameFacade.forward()">Forward</button>
                            <button class="btn btn-success" @click.prevent="simulatePlayingGameFacade.resetSimulationAndRewind()">Reset simulation and rewind</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h3>Conditional moves editor</h3>
                        <template v-if="!conditionalMovesFacade">
                            <button class="btn btn-success" @click.prevent="enableConditionalMoves(0)">Enable for Red</button>
                            <button class="btn btn-success" @click.prevent="enableConditionalMoves(1)">Enable for Blue</button>
                        </template>
                        <div v-else-if="conditionalMovesEditorState && editor">
                            <button class="btn btn-success" @click.prevent="disableConditionalMoves">Disable</button>

                            <p>
                                Has changes: {{ conditionalMovesEditorState.hasChanges ? 'yes' : 'no' }}
                                <br>
                                Selected line: {{ conditionalMovesEditorState.selectedLine.join(' ') }}
                                <br>
                                Submitted lines count: {{ conditionalMovesEditorState.conditionalMoves.tree.length }}
                            </p>

                            <button class="btn btn-success" @click.prevent="editor.back()">Back</button>
                            <button class="btn btn-success" @click.prevent="editor.startNewLine()">Start new line</button>
                            <button class="btn btn-success" @click.prevent="editor.cutMove()">Cut move</button>
                            <button class="btn btn-success" @click.prevent="editor.submitConditionalMoves()">Submit</button>

                            <code><pre>{{ JSON.stringify(conditionalMovesEditorState.conditionalMovesDirty.tree, undefined, 2) }}</pre></code>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <p>Last hex clicked: <code>{{ lastHexClicked }}</code></p>
        <p>Last hex secondary clicked: <code>{{ lastHexSecondaryClicked }}</code></p>

        <button v-if="!playerSettingsFacade" class="btn btn-success" @click.prevent="playerSettingsFacade = new PlayerSettingsFacade(gameView)">new PlayerSettingsFacade()</button>

        <button v-if="!autoOrientationFacade" class="btn btn-success" @click.prevent="autoOrientationFacade = new AutoOrientationFacade(gameView)">new AutoOrientationFacade()</button>
        <button v-else class="btn btn-success" @click.prevent="autoOrientationFacade.destroy(); autoOrientationFacade = null">destroy AutoOrientationFacade</button>

    </div>
</template>

<style lang="stylus" scoped>
.game-view-container
    width 80%
    height 400px
    resize both
    overflow hidden
    margin 1em auto
    border 1px solid #888

.card
    margin-bottom 1em

button
    margin-right 0.25em
    margin-bottom 0.25em
</style>
