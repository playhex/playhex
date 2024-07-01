<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { BIconInfoCircleFill } from 'bootstrap-icons-vue';

useSeoMeta({
    titleTemplate: title => `Hex game analysis - ${title}`,
});
</script>

<template>
    <h1>How analysis are done</h1>

    <p>
        When you finish a game, you can ask for an analysis.
        This tool will help you to get better at Hex by reviewing your games.
        <br>
        It will show you when you took or lost the advantage,
        and which move you should have played.
    </p>

    <h2>Implementation details</h2>

    <p>
        The analysis uses Katahex, a neural network trained by
        <a href="https://github.com/hzyhhzy" target="_blank">hzyhhzy</a>
        (you can find him on Hex Discord).
        Currently, only the evaluation from the neural network raw output is used.
        This allows to analyse a game in less than 20 seconds with a single average worker.
        The analysis is parallelized, so this time is divided when multiple workers are up.
    </p>

    <div class="alert alert-primary">
        <BIconInfoCircleFill /> You can also
        <router-link :to="{ name: 'spawn-worker' }">spawn a worker for PlayHex</router-link>
        to complete analysis faster.
    </div>

    <p>
        For each move, it uses the white winrate before and after the move is played,
        and if the played move is not the best one, it also play best move to take
        the white winrate after best move to calculate the points lost by not playing the best move.
    </p>

    <p>
        For swap move, it mirror the winrate, and take winrate after best move is played
        instead of swapping, then you can know what was the best move if you swapped but shouldn't.
    </p>

    <p>
        In future, multiple playouts will be run (monte-carlo tree search)
        to make the analysis more confident, and get full lines of moves.
    </p>
</template>
