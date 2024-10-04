<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { ref } from 'vue';

useSeoMeta({
    title: 'How to contribute',
});

const playerIsFair = ref(0);
</script>

<template>
    <h1>How to contribute</h1>

    <p>
        If you like PlayHex and want to help making it grow,
        here is a list of ideas to contribute,
        as a developer or not.
    </p>

    <h2>Translate and fix typos</h2>

    <p>
        Most of the visible text in the UI is translatable.
        These "translation strings" can be changed through an interface.
    </p>

    <p>
        Thanks to <a href="https://weblate.org" target="_blank">Weblate</a>,
        which offers free hosting for open source projects,
        you can use it to:
    </p>

    <ul>
        <li>fix typos,</li>
        <li>reword text,</li>
        <li>translate some untranslated strings that are still in English,</li>
        <li>or even translate PlayHex to your language if that has not been done yet.</li>
    </ul>

    <p>
        To do so, go to the
        <a href="https://hosted.weblate.org/engage/playhex/" target="_blank">PlayHex project on Weblate</a>
        and search for the string to fix or translate.
    </p>

    <p>
        You need a Weblate account to submit your translations.
        If you have a GitHub account, link it, so your contributions
        will be authored as your GitHub name.
    </p>

    <p>
        <a class="btn btn-success" href="https://hosted.weblate.org/engage/playhex/" target="_blank">Translate PlayHex</a>
    </p>

    <p>Here is the current translation status:</p>

    <a href="https://hosted.weblate.org/engage/playhex/" target="_blank">
        <img src="https://hosted.weblate.org/widget/playhex/multi-auto.svg" alt="Translation current status" />
    </a>

    <h2>Compute AI moves with your computer</h2>

    <p>
        If you have a not too old computer,
        you can pull a Hex AI worker and run it.
        This way, when someone plays against KataHex or MoHex,
        your computer can compute moves if no faster worker is available.
    </p>

    <router-link
        :to="{ name: 'spawn-worker' }"
        class="btn btn-success"
    >Run an AI worker for PlayHex</router-link>

    <h2>Develop</h2>

    <p>
        Fix bugs, add features you want…
    </p>

    <p>
        PlayHex is developed with these technologies:
        Node.js, socket.io, vue.js 3, typescript, pixi.js, express, typestack.
        Repositories are on GitHub:
    </p>

    <ul>
        <li><a href="https://github.com/playhex/playhex" target="_blank">playhex/playhex</a> – main repository, website, api, server, client</li>
        <li><a href="https://github.com/playhex/hex-ai-distributed" target="_blank">playhex/hex-ai-distributed</a> – distributed AI source code, calculate AI moves with peers</li>
    </ul>

    <p>
        If you don't know where to start,
        follow the <a href="https://github.com/playhex/playhex/blob/master/README.md" target="_blank">README</a>,
        try to have a running instance of PlayHex locally,
        try changing things or reproducing a bug locally,
        ask for a "easy" thing to develop,
        ask for help on how to install on Hex Discord.
    </p>

    <a href="https://github.com/playhex/playhex" class="btn btn-success" target="_blank">PlayHex on Github</a>

    <h2>Be a fair player</h2>

    <p>
        Just playing fairly, welcoming others players,
        and be kind in your chat messages is a good way
        to make PlayHex a good place for Hex.
    </p>

    <button @click="++playerIsFair" class="btn" :class="playerIsFair <= 12 ? 'btn-success' : 'btn-secondary disabled'">I'll be a fair player</button>

    <p v-if="playerIsFair > 0" class="text-success">Thanks<span v-if="playerIsFair > 1"> again</span>!</p>
    <p v-if="playerIsFair > 6" class="text-success">Wow! thanks a lot then!</p>
    <p v-if="playerIsFair > 12">Ok, stop, that's too much now…</p>
</template>
