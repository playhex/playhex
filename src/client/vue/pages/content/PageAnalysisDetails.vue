<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { IconInfoCircleFill } from '../../icons.js';
import { MCTS_PLAYOUTS } from '../../../../shared/app/mctsSettings.js';

useSeoMeta({
    title: 'AI game analysis',
});
</script>

<template>
    <h1>How AI analysis is done</h1>

    <p>
        If you want to see how to use and read AI analysis, see
        <router-link :to="{ name: 'guide-ai-analysis' }">AI analysis in PlayHex guide</router-link>.
    </p>

    <h2>Implementation details</h2>

    <p>
        The AI analysis uses KataHex, a neural network trained by
        <a href="https://github.com/hzyhhzy" target="_blank">hzyhhzy</a>
        (you can find him on Hex Discord). The game analysis uses the evaluation
        from the neural network raw output (without MCTS playouts). This
        allows to analyze a game in less than 20 seconds using a single average
        worker. The analysis is parallelized, so this time is split when
        multiple workers are up.
    </p>

    <div class="alert alert-primary">
        <IconInfoCircleFill /> You can also
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
        Once the game is analyzed, players can request a deep analysis
        of any move: it runs {{ MCTS_PLAYOUTS }} playouts of the Monte Carlo tree search (MCTS),
        which makes the evaluation more confident. Deeply analyzed moves are shown
        in front of the graph, other moves stay in background until they are
        deeply analyzed too.
    </p>
</template>
