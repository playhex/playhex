<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSeoMeta } from '@unhead/vue';
import { storeToRefs } from 'pinia';
import { t } from 'i18next';
import { getPlayerBySlug } from '../../../apiClient.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { Player } from '../../../../shared/app/models/index.js';
import useAuthStore from '../../../stores/authStore.js';
import { useMyRetrospectives } from '../composables/useMyRetrospectives.js';

/**
 * Only visible by the player itself:
 * retrospectives are private until player shares their link.
 */
const route = useRoute();
const router = useRouter();
const slug = String(route.params.slug);
const { loggedInPlayer } = storeToRefs(useAuthStore());

const player = ref<null | Player>(null);
const playerNotFound = ref(false);
const retrospectives = useMyRetrospectives();

// Other players retrospectives are private
const notFound = computed(() => playerNotFound.value || (
    player.value !== null
    && loggedInPlayer.value !== null
    && loggedInPlayer.value.publicId !== player.value.publicId
));

useSeoMeta({
    robots: 'noindex',
    title: () => player.value
        ? t('retrospective.list_title_of', { player: player.value.pseudo })
        : t('retrospective.list_title'),
});

void (async () => {
    try {
        const fetchedPlayer = await getPlayerBySlug(slug);

        if (fetchedPlayer.slug !== slug) {
            void router.replace({ name: 'player-retrospectives', params: { slug: fetchedPlayer.slug } });
            return;
        }

        player.value = fetchedPlayer;
    } catch (e) {
        if (e instanceof DomainHttpError && e.type === 'player_not_found') {
            playerNotFound.value = true;
            return;
        }

        throw e;
    }
})();
</script>

<template>
    <div class="container my-3">
        <p v-if="notFound" class="lead text-center my-5">{{ $t('retrospective.not_found') }}</p>

        <template v-else>
            <h1 class="mb-4">
                <template v-if="player">
                    {{ $t('retrospective.list_title_of', { player: player.pseudo }) }}
                </template>
                <template v-else>{{ $t('retrospective.list_title') }}</template>
            </h1>

            <p v-if="retrospectives === null || player === null">…</p>

            <p v-else-if="retrospectives.length === 0" class="text-body-secondary">{{ $t('retrospective.list_empty') }}</p>

            <div v-else class="row g-3">
                <div v-for="retrospective in retrospectives" :key="retrospective.year" class="col-6 col-md-4 col-lg-3">
                    <router-link
                        :to="{ name: 'player-retrospective', params: { slug: player.slug, year: retrospective.year, shareCode: retrospective.shareCode } }"
                        class="card text-center text-decoration-none h-100"
                    >
                        <div class="card-body">
                            <p class="retro-year mb-1">{{ retrospective.year }}</p>
                            <p class="mb-0 text-body-secondary">
                                {{ retrospective.games1v1 }} {{ $t('retrospective.games_1v1', { count: retrospective.games1v1 }) }}
                            </p>
                        </div>
                    </router-link>
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
.retro-year
    font-size 2.5rem
    font-weight 800
</style>
