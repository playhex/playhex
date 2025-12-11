<script setup lang="ts">
import { useHead, useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages.js';

useSeoMeta({
    title: 'Play Hex Online',
});

useLandingPages();

useHead({
    link: [
        {
            rel: 'canonical',
            href: '/landing',
        },
    ],
});
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">Play Hex Online</h1>

        <p class="fs-5">
            Enjoy the classic Hex board game online — challenge other players or face off against a computer opponent.
            Hex is easy to learn but challenging to master.
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">Start playing now</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Live, Real-Time Matches</h2>

            <p class="mb-0">
                Engage in fast-paced real-time matches, including blitz games, with customizable time controls.
                Enable pre-moves for faster play. Chat with your opponent during the game.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="Hex game with AI analysis"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Turn-Based (Correspondence) Games</h2>

            <p class="mb-0">
                Prefer a slower pace? Play correspondence games at your own rhythm.
                Sign in to continue your games across desktop and mobile.
                Automate obvious plays with conditional moves to play ladders faster.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="Turn-based Hex game with conditional moves"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">AI-Powered Game Analysis</h2>

            <p class="mb-0">
                After each game, receive an AI-powered review showing the winning player at each move.
                Discover your strongest moves, blunders, and the optimal alternatives you could have played.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="AI review of a Hex match"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Ranked Games & Progress Tracking</h2>

            <p class="mb-0">
                Play ranked matches to earn a rating and get matched with players of similar skill.
                Track your improvement and growth as a Hex player over time.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="Hex player rating history chart"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Play on Mobile and Desktop</h2>

            <p>
                Enjoy PlayHex on any device.
                The platform is fully responsive and optimized for both desktop and mobile.
                No installation required; just open your browser and start playing.
            </p>

            <p class="mb-0">
                Your games are synced across devices when you're logged in,
                allowing you to start a match on your desktop and continue it later on your phone or tablet.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="Play Hex on mobile"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">Go to lobby</router-link>
    </div>
</template>
