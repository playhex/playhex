<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Spawn a Hex AI worker',
});
</script>

<template>
    <h1>Spawn a Hex AI worker</h1>

    <p>
        If you have a not too old computer,
        you can pull a Hex AI worker, and run it.
        This way, when someone plays against Katahex or Mohex,
        your computer can compute moves if no faster worker is available.
        To run a worker, you need:
    </p>

    <ul>
        <li>2Gb RAM,</li>
        <li>to have Docker installed: <a href="https://docs.docker.com/engine/install/" target="_blank">see Docker installation</a>,</li>
        <li>
            pull and run a worker with:<br>
            <code>docker run -d --name hex-worker --restart always alcalyn/hex-distributed-ai-worker:standalone</code>
        </li>
    </ul>

    <p>
        When started, this image will run Katahex and Mohex,
        connect to PlayHex, and wait for computation jobs.
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
            <code>docker pull alcalyn/hex-distributed-ai-worker:standalone</code>
        </li>
    </ul>

    <p>
        See <a href="https://github.com/playhex/hex-ai-distributed" target="_blank">playhex/hex-ai-distributed project on Github</a>.
    </p>

    <p>
        You can stop the worker at any moment.
        If it was computing a move, the move will be reaffected to another worker.
    </p>

    <p>
        If you prefer graphical interface, you can also try Docker Desktop.
        You need to search and pull the <code>alcalyn/hex-distributed-ai-worker:standalone</code> image,
        then run it as a container.
    </p>

    <h2>Meaning of "Play vs AI" warning messages</h2>

    <p>
        When creating an AI game, you may see a warning message.
        Spawning a worker should fix and remove it.
        But here is the meaning of these messages:
    </p>

    <p>
        "<small class="fst-italic text-warning">{{ $t('workers.slow_worker') }}</small>"
        means that there is no workers up, except "secondary" workers, which are hosted
        on slow servers. In this case, only low levels of Mohex and Katahex intuition are availables,
        because it is possible to compute moves in some seconds even on slow server.
        Katahex intuition still take several seconds (i.e 30 seconds) on its first move
        to reconfigure when changing board size.
    </p>

    <p>
        "<small class="fst-italic text-danger">{{ $t('workers.no_worker') }}</small>"
        means that no worker is up, even the secondary worker.
        So impossible to run any AI that normally runs on distributed network.
        Only AI that runs directly on server are available
        (currently only random bots, maybe in future some easy AI that don't need a powerful computer).
    </p>
</template>

<style lang="stylus" scoped>
.more-spacing-list li
    margin-bottom 1em
</style>
