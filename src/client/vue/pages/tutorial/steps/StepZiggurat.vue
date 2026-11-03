<script setup lang="ts">
import { zigguratPuzzles } from '../../../../../shared/app/tutorial/tutorialPuzzles.js';
import { useTutorialControls } from '../../../composables/tutorialControls.js';
import { sanitizedT } from '../tutorialUtils.js';
import AppTutorialDiagram from '../components/AppTutorialDiagram.vue';
import AppTutorialPuzzles from '../components/AppTutorialPuzzles.vue';
import AppTutorialStepEnd from '../components/AppTutorialStepEnd.vue';
import { IconInfoCircle } from '../../../icons.js';

const { markCompleted } = useTutorialControls();
</script>

<template>
    <h1>{{ $t('tutorial.steps.ziggurat') }}</h1>

    <p v-html="sanitizedT('tutorial.ziggurat_intro')"></p>

    <div class="card mb-3">
        <div class="card-body">
            <p class="card-text small text-center mb-2">{{ $t('tutorial.ziggurat_diagram') }}</p>
            <AppTutorialDiagram
                :boardsize="5"
                :redStones="['c3']"
                :highlightedCells="['d3', 'b4', 'c4', 'd4', 'a5', 'b5', 'c5', 'd5']"
            />
        </div>
    </div>

    <p v-html="sanitizedT('tutorial.ziggurat_how_it_works')"></p>

    <div class="row g-3 mb-3">
        <div class="col-sm-6">
            <div class="card h-100">
                <div class="card-body d-flex flex-column justify-content-between">
                    <p class="card-text small text-center mb-2">{{ $t('tutorial.ziggurat_defense_1') }}</p>
                    <AppTutorialDiagram
                        :boardsize="5"
                        :redStones="['c3', 'b4']"
                        :blueStones="['c4']"
                        :highlightedCells="['a5', 'b5']"
                        :animatedPath="['b4']"
                    />
                </div>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="card h-100">
                <div class="card-body d-flex flex-column justify-content-between">
                    <p class="card-text small text-center mb-2">{{ $t('tutorial.ziggurat_defense_2') }}</p>
                    <AppTutorialDiagram
                        :boardsize="5"
                        :redStones="['c3', 'd4']"
                        :blueStones="['b5']"
                        :highlightedCells="['d3', 'c4', 'c5', 'd5']"
                        :animatedPath="['d4']"
                    />
                </div>
            </div>
        </div>
    </div>

    <p class="alert alert-info"><IconInfoCircle /> {{ $t('tutorial.ziggurat_mirror') }}</p>

    <h2>{{ $t('tutorial.puzzles_title') }}</h2>

    <AppTutorialPuzzles :puzzles="zigguratPuzzles" @allSolved="markCompleted('ziggurat')" />

    <AppTutorialStepEnd stepId="ziggurat" />
</template>
