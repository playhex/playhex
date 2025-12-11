<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages.js';

useSeoMeta({
    title: 'Hex online spielen',
});

useLandingPages();
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">Hex online spielen</h1>

        <p class="fs-5">
            Genieße das klassische Brettspiel Hex online – fordere andere Spieler heraus oder spiele gegen den Computer.
            Hex ist leicht zu lernen, aber schwer zu meistern.
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">Jetzt spielen</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Live-Spiele in Echtzeit</h2>

            <p class="mb-0">
                Spiele schnelle Echtzeit-Partien, einschließlich Blitzspiele, mit anpassbaren Zeitkontrollen.
                Aktiviere Vorauszüge für ein schnelleres Spiel. Chatte während des Spiels mit deinem Gegner.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="Hex-Spiel mit KI-Analyse"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Rundenbasierte (Korrespondenz-)Spiele</h2>

            <p class="mb-0">
                Bevorzugst du ein gemächlicheres Tempo? Spiele Korrespondenzpartien in deinem eigenen Rhythmus.
                Melde dich an, um deine Spiele auf Desktop und Mobilgerät fortzusetzen.
                Beschleunige offensichtliche Züge mit bedingten Zügen.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="Rundenbasiertes Hex-Spiel mit bedingten Zügen"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">KI-gestützte Spielanalyse</h2>

            <p class="mb-0">
                Nach jedem Spiel erhältst du eine KI-gestützte Analyse, die den Sieger zu jedem Zeitpunkt zeigt.
                Entdecke deine besten Züge, Fehler und optimale Alternativen.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="KI-Analyse einer Hex-Partie"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Gewertete Spiele & Fortschrittsverfolgung</h2>

            <p class="mb-0">
                Spiele gewertete Partien, um eine Wertung zu erhalten und gegen gleichstarke Gegner anzutreten.
                Verfolge deine Entwicklung und dein Wachstum als Hex-Spieler im Laufe der Zeit.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="Hex-Wertungshistorie eines Spielers"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Spiele auf Mobilgeräten und Desktop</h2>

            <p>
                Spiele PlayHex auf jedem Gerät.
                Die Plattform ist vollständig responsiv und für Desktop und Mobilgeräte optimiert.
                Keine Installation nötig – öffne einfach deinen Browser und leg los.
            </p>

            <p class="mb-0">
                Deine Spiele werden geräteübergreifend synchronisiert, wenn du angemeldet bist,
                sodass du eine Partie am Desktop starten und später auf dem Smartphone oder Tablet fortsetzen kannst.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="Hex auf dem Handy spielen"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">Zur Lobby</router-link>
    </div>
</template>
