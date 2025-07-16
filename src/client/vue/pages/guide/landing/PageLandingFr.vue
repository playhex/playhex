<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages';

useSeoMeta({
    title: 'Jouer au Hex en ligne',
});

useLandingPages();
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">Jouer au Hex en ligne</h1>

        <p class="fs-5">
            Profitez du jeu de plateau classique Hex en ligne — défiez d'autres joueurs ou affrontez une IA.
            Hex est facile à apprendre mais difficile à maîtriser.
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">Jouer maintenant</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Parties en temps réel</h2>

            <p class="mb-0">
                Participez à des parties rapides en temps réel, y compris des blitz, avec des horloges personnalisables.
                Activez les pré-coups pour jouer plus vite. Discutez avec votre adversaire pendant la partie.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="Partie de Hex avec analyse IA"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Parties au tour par tour (par correspondance)</h2>

            <p class="mb-0">
                Vous préférez un rythme plus lent ? Jouez à votre propre rythme grâce aux parties par correspondance.
                Connectez-vous pour continuer vos parties sur ordinateur et mobile.
                Automatisez les coups évidents avec des coups conditionnels pour jouer les échelles plus rapidement.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="Partie de Hex au tour par tour avec coups conditionnels"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Analyse de partie par IA</h2>

            <p class="mb-0">
                Après chaque partie, recevez une analyse générée par IA montrant le joueur gagnant à chaque coup.
                Découvrez vos meilleurs coups, vos erreurs, et les alternatives optimales que vous auriez pu jouer.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="Analyse IA d'une partie de Hex"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Parties classées & Suivi de progression</h2>

            <p class="mb-0">
                Jouez des parties classées pour obtenir une cote et affronter des joueurs de niveau similaire.
                Suivez vos progrès et votre évolution en tant que joueur de Hex au fil du temps.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="Graphique de l’historique de classement d’un joueur de Hex"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Jouez sur mobile et ordinateur</h2>

            <p>
                Profitez de PlayHex sur n’importe quel appareil.
                La plateforme est entièrement responsive et optimisée pour les ordinateurs comme pour les mobiles.
                Aucune installation requise : ouvrez simplement votre navigateur et commencez à jouer.
            </p>

            <p class="mb-0">
                Vos parties sont synchronisées sur tous vos appareils lorsque vous êtes connecté(e),
                ce qui vous permet de commencer une partie sur ordinateur et de la continuer plus tard sur téléphone ou tablette.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="Jouer au Hex sur mobile"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">Aller au lobby</router-link>
    </div>
</template>
