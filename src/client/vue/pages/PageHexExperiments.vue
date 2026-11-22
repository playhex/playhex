<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import AppExperimentCard from '../components/AppExperimentCard.vue';

useHead({
    title: () => t('hex_experiments.title'),
});
</script>

<template>
    <div class="container my-3">
        <h1>{{ $t('hex_experiments.title') }}</h1>
        <p class="lead">{{ $t('hex_experiments.intro') }}</p>

        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
            <div class="col">
                <AppExperimentCard
                    href="https://royale.playhex.org/"
                    image="/images/puzzle-royale.jpg"
                    title="Puzzle Royale"
                    :description="$t('puzzle_royale_description')"
                    :badge="$t('another_experiment')"
                />
            </div>
            <div class="col">
                <AppExperimentCard
                    href="https://chill.playhex.org/"
                    image="/images/playhex-chill.jpg"
                    title="PlayHex Chill"
                    :description="$t('playhex_chill_description')"
                    :badge="$t('experimental')"
                />
            </div>
            <div class="col">
                <AppExperimentCard
                    href="https://y.playhex.org/"
                    image="/images/y-hex.jpg"
                    title="Y"
                    :description="$t('y_hex_description')"
                    :badge="$t('experimental')"
                />
            </div>
        </div>
    </div>
</template>
