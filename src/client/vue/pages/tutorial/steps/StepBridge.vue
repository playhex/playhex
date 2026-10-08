<script setup lang="ts">
import { bridgePuzzles } from '../../../../../shared/app/tutorial/tutorialPuzzles.js';
import { useTutorialControls } from '../../../composables/tutorialControls.js';
import { sanitizedT } from '../tutorialUtils.js';
import AppTutorialDiagram from '../components/AppTutorialDiagram.vue';
import AppTutorialPuzzles from '../components/AppTutorialPuzzles.vue';
import AppTutorialStepEnd from '../components/AppTutorialStepEnd.vue';
import { IconInfoCircle } from '../../../icons.js';

const { markCompleted } = useTutorialControls();
</script>

<template>
    <h1>{{ $t('tutorial.steps.bridge') }}</h1>

    <p v-html="sanitizedT('tutorial.bridge_intro')"></p>

    <div class="row g-3 mb-3">
        <div class="col-sm-6">
            <div class="card h-100">
                <div class="card-body">
                    <AppTutorialDiagram :boardsize="5" :redStones="['c2', 'b4']" :highlightedCells="['b3', 'c3']" />
                    <p class="card-text small text-center mt-2">{{ $t('tutorial.bridge_diagram') }}</p>
                </div>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="card h-100">
                <div class="card-body">
                    <AppTutorialDiagram :boardsize="5" :redStones="['b4']" :highlightedCells="['a5', 'b5']" />
                    <p class="card-text small text-center mt-2">{{ $t('tutorial.bridge_edge_diagram') }}</p>
                </div>
            </div>
        </div>
    </div>

    <p v-html="sanitizedT('tutorial.bridge_how_to_defend')"></p>

    <p class="alert alert-info"><IconInfoCircle /> {{ $t('tutorial.bridge_why_useful') }}</p>

    <h2>{{ $t('tutorial.puzzles_title') }}</h2>

    <AppTutorialPuzzles :puzzles="bridgePuzzles" @allSolved="markCompleted('bridge')" />

    <AppTutorialStepEnd stepId="bridge" />
</template>
