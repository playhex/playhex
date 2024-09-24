<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { BIconInfoCircleFill } from 'bootstrap-icons-vue';

useSeoMeta({
    title: 'AI game analysis',
});
</script>

<template>
    <h1>How AI analysis is done</h1>

    <p>
        Once you finish a game, you can ask for AI analysis.
        This tool helps you to get better at Hex by reviewing your games.
        <br>
        It shows when you took or lost the advantage, and which move you
        could've played instead.

        Note that as for now, the method used for analysis is relatively weak.
    </p>

    <h2>Implementation details</h2>

    <p>
        The AI analysis uses KataHex, a neural network trained by
        <a href="https://github.com/hzyhhzy" target="_blank">hzyhhzy</a>
        (you can find him on Hex Discord). Currently, only the evaluation from
        the neural network raw output is used (without MCTS playouts). This
        allows to analyze a game in less than 20 seconds using a single average
        worker. The analysis is parallelized, so this time is split when
        multiple workers are up.
    </p>

    <div class="alert alert-primary">
        <BIconInfoCircleFill /> You can also
        <router-link :to="{ name: 'spawn-worker' }">spawn a worker for PlayHex</router-link>
        to complete the analysis faster.
    </div>

    <p>
        For every move, it uses winrate from Blue's perspective before and
        after the move is played. If the played move is not the best one, it
        also analyzes (evaluates) the winrate of the most likely best move (move
        with the highest <a href="https://en.wikipedia.org/wiki/KataGo#Network">policy</a>).
    </p>

    <p>
        In the case of swap, it inverts the winrate and also evaluates
        the position that includes the highest-policy move instead of the swap
        move. That way, you can know what could have been the best move in case
        you swapped but shouldn't have.
    </p>

    <p>
        In the future, multiple playouts of the Monte Carlo tree search will be
        run to make the analysis more confident and to get the full lines of
        moves.
    </p>
</template>
