<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { BIconDownload } from 'bootstrap-icons-vue';
import { ref } from 'vue';

useHead({
    title: 'Export PlayHex games data',
});

type FileStat = {
    description: string;
    filename: string;
    generated_at: string;
    filesize: number;
    filesizeUnzipped: number;
    itemsCount: number;
};

const fileStat = ref<null | false | FileStat>(null);

// To make an export file available here, run command: yarn hex export-games

(async () => {
    const response = await fetch('/export-data/manifest.json');

    if (!response.ok) {
        fileStat.value = false;
        return;
    }

    fileStat.value = await response.json();
})();

const getFilename = (filename: string): string => filename.split('/').pop() ?? filename;
const getFilesize = (size: number): string => {
    let v = size;
    let unit = 0;

    while (v >= 1024) {
        v /= 1024;
        ++unit;
    }

    return v.toFixed(1) + ' ' + ['B', 'KiB', 'MiB', 'GiB', 'TiB'][unit];
};
</script>

<template>
    <h1>Export PlayHex games data</h1>

    <p v-if="null === fileStat">Loading…</p>
    <p v-else-if="false === fileStat">Error while listing files.</p>
    <div v-else>
        <p>{{ fileStat.description }}</p>
        <a
            :href="fileStat.filename"
            class="btn btn-success"
        >
            <BIconDownload class="me-1" />
            {{ getFilename(fileStat.filename) }}
        </a>
        <p>
            <small>Size: {{ getFilesize(fileStat.filesize) }}</small>
            <br>
            <small>Unzipped: {{ getFilesize(fileStat.filesizeUnzipped) }}</small>
            <br>
            <small>Number of games: {{ fileStat.itemsCount }}</small>
            <br>
            <small>Generated at: {{ fileStat.generated_at }}</small>
        </p>
    </div>

    <p>This is a json file structured like this:</p>

    <!-- syntax highlighted here: https://highlight.hohli.com/?theme=github-dark&language=json -->
    <pre style="font-family:monospace;color: rgb(201, 209, 217); background-color: rgb(13, 17, 23); font-weight: 400; "><span style="color: rgb(201, 209, 217); font-weight: 400;">[</span>
    <span style="color: rgb(201, 209, 217); font-weight: 400;">{</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"id"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"3c93274a-31ef-4fd8-9803-1edd71ba35cf"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"url"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"https://playhex.org/games/3c93274a-31ef-4fd8-9803-1edd71ba35cf"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"boardsize"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">11</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"movesCount"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">34</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Moves can be "a1", "swap-pieces", "pass"</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"moves"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"j2 swap-pieces f6 c8 h8 e7 g7 f7 ..."</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Nicknames of players</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerRed"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"JRM"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerBlue"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"Mohex 1.5"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Whether players are "player" or "bot"</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerRedType"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"player"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerBlueType"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"bot"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// "red" or "blue"</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"winner"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"blue"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// How the game ended:</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// - "time": loser player ran out of time</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// - "resign": loser player resigned</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// - "path": winner player won by connecting his sides</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"outcome"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"resign"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// whether swap has been allowed</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"allowSwap"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;"><span style="color: rgb(255, 123, 114); font-weight: 400;">true</span></span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// whether it is a "ranked" game</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"rated"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;"><span style="color: rgb(255, 123, 114); font-weight: 400;">false</span></span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// guessed handicap from moves and game settings.</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// 0: no handicap</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// 1.5: for red</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// -2: 2 for blue</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// "N/S" no swap because swap disabled.</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// See https://www.hexwiki.net/index.php/Handicap</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"handicap"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">0</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// when game started and ended</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"startedAt"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"2025-01-13T14:13:55.582Z"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"endedAt"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"2025-01-13T14:21:50.415Z"</span>
    <span style="color: rgb(201, 209, 217); font-weight: 400;">}</span>
    ...
<span style="color: rgb(201, 209, 217); font-weight: 400;">]</span></pre>
</template>
