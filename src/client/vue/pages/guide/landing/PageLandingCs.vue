<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages.js';

useSeoMeta({
    title: 'Hraj Hex online',
});

useLandingPages();
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">Hraj Hex online</h1>

        <p class="fs-5">
            Užij si klasickou deskovou hru Hex online — vyzvi ostatní hráče nebo hraj proti počítači.
            Hex je snadné na naučení, ale těžké na zvládnutí.
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">Začni hrát hned</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Živé, Reálné zápasy</h2>

            <p class="mb-0">
                Zapoj se do rychlých reálných zápasů, včetně bleskových her, s nastavitelným časem.
                Povoli předtahy pro rychlejší hru. Během hry si můžeš psát s protihráčem.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="Hra Hex s analýzou od AI"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Tahové (korespondenční) hry</h2>

            <p class="mb-0">
                Máš raději pomalejší tempo? Hraj korespondenční hry vlastním tempem.
                Přihlaš se a pokračuj ve hrách na počítači i mobilu.
                Automatizuj zřejmé tahy pomocí podmíněných tahů pro rychlejší hraní žebříků.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="Tahová hra Hex s podmíněnými tahy"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Analýza hry pomocí AI</h2>

            <p class="mb-0">
                Po každé hře obdržíš analýzu poháněnou AI, která ukáže vítězného hráče po každém tahu.
                Objev své nejlepší tahy, chyby a optimální alternativy, které jsi mohl zahrát.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="AI analýza zápasu Hex"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Hodnocené hry & sledování pokroku</h2>

            <p class="mb-0">
                Hraj hodnocené zápasy, získávej hodnocení a hraj proti hráčům podobné úrovně.
                Sleduj svůj pokrok a zlepšení jako hráč Hexu v průběhu času.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="Graf historie hodnocení hráče Hex"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Hraj na mobilu i počítači</h2>

            <p>
                Užij si PlayHex na jakémkoli zařízení.
                Platforma je plně responzivní a optimalizovaná pro počítače i mobily.
                Není potřeba instalace — stačí otevřít prohlížeč a začít hrát.
            </p>

            <p class="mb-0">
                Tvé hry se synchronizují mezi zařízeními, když jsi přihlášený.
                Můžeš tak začít hru na počítači a pokračovat později na telefonu nebo tabletu.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="Hraní Hexu na mobilu"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">Jít do lobby</router-link>
    </div>
</template>
