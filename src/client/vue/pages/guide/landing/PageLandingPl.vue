<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages.js';

useSeoMeta({
    title: 'Graj w Hex Online',
});

useLandingPages();
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">Graj w Hex Online</h1>

        <p class="fs-5">
            Ciesz się klasyczną grą planszową Hex online — zmierz się z innymi graczami lub graj przeciwko komputerowi.
            Hex jest łatwy do nauczenia, ale trudny do opanowania.
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">Zacznij grać teraz</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Rozgrywki na żywo, w czasie rzeczywistym</h2>

            <p class="mb-0">
                Weź udział w dynamicznych meczach na żywo, w tym partiach błyskawicznych, z możliwością dostosowania czasu gry.
                Włącz ruchy wstępne, aby grać szybciej. Rozmawiaj z przeciwnikiem w trakcie rozgrywki.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="Gra Hex z analizą AI"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Gry turowe (korespondencyjne)</h2>

            <p class="mb-0">
                Wolisz wolniejsze tempo? Graj w gry korespondencyjne we własnym rytmie.
                Zaloguj się, aby kontynuować rozgrywki na komputerze i telefonie.
                Automatyzuj oczywiste ruchy za pomocą ruchów warunkowych i szybciej pokonuj drabinki.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="Gra Hex turowa z ruchami warunkowymi"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Analiza partii wspierana przez AI</h2>

            <p class="mb-0">
                Po każdej grze otrzymasz analizę wspieraną przez AI pokazującą, kto miał przewagę w każdym ruchu.
                Odkryj swoje najlepsze posunięcia, błędy i optymalne alternatywy, które mogłeś wykonać.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="Analiza AI partii Hex"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Rankingi i śledzenie postępów</h2>

            <p class="mb-0">
                Graj w mecze rankingowe, aby zdobywać punkty i grać z osobami o podobnym poziomie umiejętności.
                Śledź swój rozwój i postępy jako gracz Hex.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="Wykres historii rankingu gracza Hex"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Graj na telefonie i komputerze</h2>

            <p>
                Ciesz się PlayHex na dowolnym urządzeniu.
                Platforma jest w pełni responsywna i zoptymalizowana zarówno dla komputerów, jak i telefonów.
                Nie wymaga instalacji — po prostu otwórz przeglądarkę i zacznij grać.
            </p>

            <p class="mb-0">
                Twoje gry są synchronizowane między urządzeniami po zalogowaniu,
                co pozwala rozpocząć partię na komputerze i kontynuować ją później na telefonie lub tablecie.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="Gra Hex na telefonie"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">Przejdź do lobby</router-link>
    </div>
</template>
