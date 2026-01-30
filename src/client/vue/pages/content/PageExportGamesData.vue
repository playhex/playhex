<script setup lang="ts">
import { defineOrganization, useSchemaOrg } from '@unhead/schema-org';
import { injectHead, useHead, useSeoMeta } from '@unhead/vue';
import { IconDownload } from '../../icons.js';
import { ref, watchEffect } from 'vue';

type FileStat = {
    description: string;
    filename: string;
    generated_at: string;
    filesize: number;
    filesizeUnzipped: number;
    itemsCount: number;
};

const fileStat = ref<null | false | FileStat>(null);

useHead({
    title: 'Export PlayHex games data',
});

useSeoMeta({
    description: 'Download dataset of all Hex games played on PlayHex.',
});

const head = injectHead();

watchEffect(() => {
    if (!fileStat.value) {
        return;
    }

    const baseUrl = location.protocol + '//' + location.host;

    useSchemaOrg(head, {
        '@type': 'Dataset',
        name: 'PlayHex.org Hex games',
        description: 'Hex games played on PlayHex.org. Can be player vs player, or player vs bot. Ranked or Friendly. Variable board size. All games are ended, either by regular victory, resign, timeout or forfeited.',
        alternateName: ['PlayHex games archive'],
        creator: defineOrganization({
            name: 'PlayHex',
            url: baseUrl,
            logo: baseUrl + '/images/logo.png',
        }),
        isAccessibleForFree: true,
        datePublished: fileStat.value.generated_at,
        dateModified: fileStat.value.generated_at,
        keywords: ['board game', 'hex'],
        license: 'https://creativecommons.org/publicdomain/zero/1.0/',
        temporalCoverage: '2023-11-22/..',
        version: fileStat.value.generated_at.split('.')[0],
        url: baseUrl + '/export-games-data',
        distribution: [
            {
                '@type': 'DataDownload',
                encodingFormat: 'application/json',
                contentUrl: baseUrl + fileStat.value.filename,
            },
        ],
    }, {
        tagPosition: 'head', // Should be the default, but not the case: https://github.com/unjs/unhead/issues/563
    });
});

// To make an export file available here, run command: yarn hex export-games

void (async () => {
    const response = await fetch('/export-data/manifest.json');

    if (!response.ok) {
        fileStat.value = false;
        return;
    }

    try {
        fileStat.value = await response.json();
    } catch (e) {
        fileStat.value = false;
    }
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
            <IconDownload class="me-1" />
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

    <!--
        syntax highlighted here: https://highlight.hohli.com/?theme=github-dark&language=json

        To update:
            - copy current json example from /export-games-data
            - paste it to the highlighter
            - update, highlight and paste it down here.
    -->
    <pre style="font-family:monospace;color: rgb(201, 209, 217); background-color: rgb(13, 17, 23); font-weight: 400; "><span style="color: rgb(201, 209, 217); font-weight: 400;">[</span>
    <span style="color: rgb(201, 209, 217); font-weight: 400;">{</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"id"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"ed6c004f-0307-4677-afc4-d9a93dd0106e"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"url"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"https://playhex.org/games/ed6c004f-0307-4677-afc4-d9a93dd0106e"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"boardsize"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">17</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"movesCount"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">119</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Moves can be "a1", "swap-pieces", "pass"</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"moves"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"a10 swap-pieces n4 k2 d5 d4 e4 d14 n13 n14 m14 ..."</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Time control, here is an example for Capped Fischer 10min + 5s increment, capped at 10min.</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// For byo yomi 10min + 5 x 5s, it would be: "family": "byoyomi", "options": { "initialTime": 600000, "periodsCount": 5, "periodTime": 5000 }</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"timeControl"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(201, 209, 217); font-weight: 400;">{</span>
            <span style="color: rgb(121, 192, 255); font-weight: 400;">"family"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"fischer"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
            <span style="color: rgb(121, 192, 255); font-weight: 400;">"options"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(201, 209, 217); font-weight: 400;">{</span>
                <span style="color: rgb(121, 192, 255); font-weight: 400;">"initialTime"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">300000</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
                <span style="color: rgb(121, 192, 255); font-weight: 400;">"timeIncrement"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">2000</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
                <span style="color: rgb(121, 192, 255); font-weight: 400;">"maxTime"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">300000</span>
            <span style="color: rgb(201, 209, 217); font-weight: 400;">}</span>
        <span style="color: rgb(201, 209, 217); font-weight: 400;">}</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Nicknames of players</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerRed"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"yqxud"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerBlue"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"sya11"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Whether players are "player" or "bot"</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerRedType"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"player"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerBlueType"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"player"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Ratings of players at the time the game were played. Glicko2</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Ratings are initialized with 1500, deviation 350 and volatility 0.06.</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Only for rated games: for friendly games, this info is not present</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerRedRating"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">1717.14</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerBlueRating"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">1993.47</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Ratings deviation of players at the time the game were played. Glicko2</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Lower value (&lt;100) means confident value, higher one means not sure (&gt; 200).</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// Only for rated games: for friendly games, this info is not present</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerRedRatingDeviation"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">63.9047</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"playerBlueRatingDeviation"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">64.8934</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// "red" or "blue"</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"winner"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"red"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// How the game ended:</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// - "time": loser player ran out of time</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// - "resign": loser player resigned</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// - "path": winner player won by connecting his sides</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// - "forfeit": loser may have not been here in time and has been forfeited manually, e.g in a tournament</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"outcome"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"path"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// whether swap has been allowed</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"allowSwap"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;"><span style="color: rgb(255, 123, 114); font-weight: 400;">true</span></span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// whether it is a "ranked" game (true), or friendly (false)</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"rated"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;"><span style="color: rgb(255, 123, 114); font-weight: 400;">true</span></span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// guessed handicap from moves and game settings.</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// See https://www.hexwiki.net/index.php/Handicap</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// 0: no handicap</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// 1.5: for red</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// -2: 2 for blue</span>
        <span style="color: rgb(139, 148, 158); font-weight: 400;">// "N/S" no swap because swap disabled.</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"handicap"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(121, 192, 255); font-weight: 400;">0</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>

        <span style="color: rgb(139, 148, 158); font-weight: 400;">// when game started and ended</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"startedAt"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"2025-12-27T19:12:10.070Z"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
        <span style="color: rgb(121, 192, 255); font-weight: 400;">"endedAt"</span><span style="color: rgb(201, 209, 217); font-weight: 400;">:</span> <span style="color: rgb(165, 214, 255); font-weight: 400;">"2025-12-27T19:26:04.251Z"</span>
    <span style="color: rgb(201, 209, 217); font-weight: 400;">}</span><span style="color: rgb(201, 209, 217); font-weight: 400;">,</span>
    ...
<span style="color: rgb(201, 209, 217); font-weight: 400;">]</span></pre>
</template>
