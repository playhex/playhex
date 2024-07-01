<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { ref } from 'vue';

useSeoMeta({
    titleTemplate: title => `How to contribute - ${title}`,
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

    <h2>Translating and typo fixes</h2>

    <p>
        Most of visible texts on UI are translatable.
        These "translation strings" can be changed through an interface.
    </p>

    <p>
        Thanks to <a href="https://weblate.org" target="_blank">Weblate</a>,
        which offers free hosting for open source projects,
        you can use it to:
    </p>

    <ul>
        <li>fix typo in texts,</li>
        <li>reword a text,</li>
        <li>translate some untranslated texts that are still in english,</li>
        <li>or even translate PlayHex in your language if not yet done.</li>
    </ul>

    <p>
        To do so, go to
        <a href="https://hosted.weblate.org/projects/playhex/" target="_blank">PlayHex project on Weblate</a>,
        then you can search for the string to fix, translate…
    </p>

    <p>
        You need a Weblate account to submit your translations.
        If you have a Github account, link it, so your contributions
        will be authored as your Github name.
    </p>

    <p>
        <a class="btn btn-success" href="https://hosted.weblate.org/projects/playhex/" target="_blank">Translate PlayHex</a>
    </p>

    <p>Here is the current translation status:</p>

    <a href="https://hosted.weblate.org/engage/playhex/" target="_blank">
        <img src="https://hosted.weblate.org/widget/playhex/multi-auto.svg" alt="Translation current status" />
    </a>

    <h2>Compute AI moves with your computer</h2>

    <p>
        If you have a not too old computer,
        you can pull a Hex AI worker, and run it.
        This way, when someone plays against Katahex or Mohex,
        your computer can compute moves if no faster worker is available.
    </p>

    <router-link
        :to="{ name: 'spawn-worker' }"
        class="btn btn-success"
    >Run an AI worker for PlayHex</router-link>

    <h2>Develop</h2>

    <p>
        Fix bugs, adding features you want…
    </p>

    <p>PlayHex is developed with these technologies:
        Nodejs, socket.io, vuejs 3, typescript, pixi.js, express, typestack.
        Repositories are on Github:
    </p>

    <ul>
        <li><a href="https://github.com/alcalyn/hex" target="_blank">alcalyn/hex</a> – main repository, website, api, server, client</li>
        <li><a href="https://github.com/alcalyn/hex-ai-distributed" target="_blank">alcalyn/hex-ai-distributed</a> – distributed AI source code, calculate AI moves with peers</li>
    </ul>

    <p>
        I like developing PlayHex, but I also like helping others learning development and contribute.
        If you don't know where to start,
        follow the <a href="https://github.com/alcalyn/hex/blob/master/README.md" target="_blank">README</a>,
        try to have a running instance of PlayHex locally,
        try changing things or reproducing a bug locally,
        ask for a "easy" thing to develop,
        ask for help on how to install (I'm on the Hex Discord).
    </p>

    <a href="https://github.com/alcalyn/hex" class="btn btn-success" target="_blank">PlayHex on Github</a>

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
