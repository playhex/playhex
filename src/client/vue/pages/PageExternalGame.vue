<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useSeoMeta } from '@unhead/vue';
import { t } from 'i18next';
import { ExternalGame } from '../../../shared/app/models/index.js';
import { getExternalGame } from '../../apiClient.js';
import AppExternalGame from '../components/external-games/AppExternalGame.vue';

const { externalGameId } = useRoute().params;

if (typeof externalGameId !== 'string') {
    throw new Error('unexpected array param in externalGameId');
}

const externalGame = ref<null | ExternalGame>(null);
const notFound = ref(false);

void (async () => {
    externalGame.value = await getExternalGame(externalGameId);
    notFound.value = externalGame.value === null;
})();

useSeoMeta({
    title: computed(() => externalGame.value
        ? `${externalGame.value.player0Name} vs ${externalGame.value.player1Name}` + (externalGame.value.source ? ` (${externalGame.value.source})` : '')
        : t('external_games.game'),
    ),
});
</script>

<template>
    <AppExternalGame v-if="externalGame" :externalGame />

    <div v-else class="container-fluid my-3">
        <p v-if="notFound" class="lead text-center">{{ $t('external_games.not_found') }}</p>
        <p v-else class="lead text-center">{{ $t('loading_game') }}</p>
    </div>
</template>
