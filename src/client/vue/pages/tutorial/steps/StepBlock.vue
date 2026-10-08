<script setup lang="ts">
import { sanitizedT } from '../tutorialUtils.js';
import AppTutorialDiagram from '../components/AppTutorialDiagram.vue';
import AppTutorialStepEnd from '../components/AppTutorialStepEnd.vue';
import { IconInfoCircle } from '../../../icons.js';
</script>

<template>
    <h1>{{ $t('tutorial.steps.block') }}</h1>

    <p v-html="sanitizedT('tutorial.block_no_draw')"></p>

    <p v-html="sanitizedT('tutorial.block_consequence')"></p>

    <div class="card mb-3">
        <div class="card-body">
            <AppTutorialDiagram
                :boardsize="5"
                :redStones="['c1', 'c2', 'b3', 'b4', 'b5']"
                :blueStones="['b2', 'a3', 'e3', 'd4']"
                :animatedPath="['c1', 'c2', 'b3', 'b4', 'b5']"
            />
            <p class="card-text small text-center mt-2">{{ $t('tutorial.block_diagram') }}</p>
        </div>
    </div>

    <h2>{{ $t('tutorial.block_play_towards_opponent_edges_title') }}</h2>

    <p v-html="sanitizedT('tutorial.block_play_towards_opponent_edges')"></p>

    <p>{{ $t('tutorial.block_rushing_own_edge') }}</p>

    <h2>{{ $t('tutorial.block_at_a_distance_title') }}</h2>

    <p>{{ $t('tutorial.block_at_a_distance') }}</p>

    <p class="alert alert-info"><IconInfoCircle /> {{ $t('tutorial.block_remember') }}</p>

    <AppTutorialStepEnd stepId="block" completeOnNext />
</template>
