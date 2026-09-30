<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Spawn a Hex AI worker',
});

const hostUrl = typeof window === 'undefined' ? 'https://playhex.org' : window.location.origin;
</script>

<template>
    <h1>Spawn a Hex AI worker</h1>

    <p>
        If you have a not too old computer,
        you can run a Hex AI worker.
        This way, when someone plays against Katahex, Mohex or Davies bots, or requests a game analysis,
        your computer helps computing moves.
        To run a worker, you need:
    </p>

    <ul>
        <li>2Gb RAM,</li>
        <li>to have Docker installed: <a href="https://docs.docker.com/engine/install/" target="_blank">see Docker installation</a>,</li>
        <li>
            a worker key: ask PlayHex admins for one.
            Your keys are then shown in your <router-link :to="{ name: 'settings', hash: '#ai-worker-keys' }">settings</router-link>,
            with the command to run a worker.
        </li>
    </ul>

    <p>
        There is one worker image per AI engine: <code>playhex/worker-katahex</code>, <code>playhex/worker-mohex</code>, <code>playhex/worker-davies</code>.
        Run a Katahex worker with:
    </p>

    <p><code>docker run -d --name hex-worker --restart always -e HEX_URL={{ hostUrl }} -e AI_WORKER_KEY=&lt;key&gt; playhex/worker-katahex</code></p>

    <p>
        When started, the worker connects to PlayHex and waits for computation jobs.
        You can run multiple workers, with different engines, using the same key.
    </p>

    <p>Commands to manage your worker:</p>

    <ul class="more-spacing-list">
        <li>
            Stop your worker:<br>
            <code>docker rm -f hex-worker</code>
        </li>
        <li>
            Show worker logs (move computations, errors…):<br>
            <code>docker logs hex-worker -ft</code>
        </li>
        <li>
            Update worker:<br>
            <code>docker pull playhex/worker-katahex</code>
        </li>
    </ul>

    <p>
        See <a href="https://github.com/playhex/hex-ai-distributed" target="_blank">playhex/hex-ai-distributed project on Github</a>.
    </p>

    <p>
        You can stop the worker at any moment.
        If it was computing a move, the move will be given to another worker.
    </p>

    <h2>Meaning of "Play vs AI" warning message</h2>

    <p>
        "<small class="fst-italic text-warning">{{ $t('workers.engine_unavailable') }}</small>"
        means that no worker is up for some AI engines (Katahex, Mohex or Davies).
        Bots using these engines cannot be played until a worker for their engine is up.
        Spawning a worker should fix and remove it.
    </p>
</template>

<style lang="stylus" scoped>
.more-spacing-list li
    margin-bottom 1em
</style>
