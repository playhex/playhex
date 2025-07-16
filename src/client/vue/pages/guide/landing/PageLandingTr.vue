<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages';

useSeoMeta({
    title: 'Hex Oyna - Çevrimiçi',
});

useLandingPages();
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">Hex Oyna - Çevrimiçi</h1>

        <p class="fs-5">
            Klasik Hex tahtası oyununu çevrimiçi olarak oynayın — diğer oyunculara meydan okuyun veya bilgisayara karşı oynayın.
            Hex öğrenmesi kolay, ustalaşması zor bir oyundur.
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">Hemen oynamaya başla</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Canlı, Gerçek Zamanlı Maçlar</h2>

            <p class="mb-0">
                Hızlı tempolu, gerçek zamanlı maçlara katılın — blitz oyunları dahil olmak üzere özelleştirilebilir süre kontrolleriyle oynayın.
                Daha hızlı oyun için ön hamleleri etkinleştirin. Oyun sırasında rakibinizle sohbet edin.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="Yapay zekâ analizli Hex oyunu"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Hamle Tabanlı (Yazışmalı) Oyunlar</h2>

            <p class="mb-0">
                Daha yavaş bir tempo mu tercih ediyorsunuz? Oyunu kendi temponuzda oynayın.
                Masaüstü ve mobil cihazlarda oyunlarınıza devam etmek için giriş yapın.
                Basit hamleleri otomatikleştirmek için koşullu hamleleri kullanarak merdivenleri daha hızlı oynayın.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="Koşullu hamlelerle hamle tabanlı Hex oyunu"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Yapay Zekâ Destekli Oyun Analizi</h2>

            <p class="mb-0">
                Her oyunun ardından, her hamlede kimin önde olduğunu gösteren yapay zekâ destekli analiz alın.
                En güçlü hamlelerinizi, hatalarınızı ve oynayabileceğiniz en iyi alternatifleri keşfedin.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="Hex maçının yapay zekâ incelemesi"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Dereceli Oyunlar ve Gelişim Takibi</h2>

            <p class="mb-0">
                Dereceli maçlar oynayarak puan kazanın ve benzer becerilere sahip oyuncularla eşleşin.
                Zamanla bir Hex oyuncusu olarak gelişiminizi takip edin.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="Hex oyuncu derecesi geçmişi grafiği"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">Mobil ve Masaüstü Üzerinde Oynayın</h2>

            <p>
                PlayHex’i her cihazda keyifle oynayın.
                Platform, masaüstü ve mobil için tamamen duyarlı ve optimize edilmiştir.
                Kurulum gerekmez; sadece tarayıcınızı açın ve oynamaya başlayın.
            </p>

            <p class="mb-0">
                Giriş yaptığınızda oyunlarınız cihazlar arasında senkronize edilir;
                masaüstünüzde başladığınız bir oyunu telefon veya tablette devam ettirebilirsiniz.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="Mobilde Hex oynayın"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">Lobiye git</router-link>
    </div>
</template>
