<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../../stores/authStore.js';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore.js';
import { lobbyRetrospectiveYear, shouldShowLobbyCard } from '../../../../shared/app/retrospective/retrospectiveRules.js';
import { useMyRetrospectives } from '../composables/useMyRetrospectives.js';
import { IconPartyPopper } from '../../icons.js';

/**
 * Promotes last year retrospective on lobby, from January to April, until dismissed.
 */
const { loggedInPlayer } = storeToRefs(useAuthStore());
const playerSettingsStore = usePlayerSettingsStore();
const { playerSettings } = storeToRefs(playerSettingsStore);

const year = lobbyRetrospectiveYear();
const retrospectives = useMyRetrospectives();

const shareCode = computed((): null | string => retrospectives.value
    ?.find(retrospective => retrospective.year === year)
    ?.shareCode
    ?? null,
);

const shouldShow = computed(() => loggedInPlayer.value !== null
    && playerSettings.value !== null
    && shouldShowLobbyCard(new Date(), playerSettings.value.retrospectiveDismissedAt, shareCode.value !== null),
);

const dismiss = async () => {
    if (!playerSettings.value) {
        return;
    }

    playerSettings.value.retrospectiveDismissedAt = new Date();
    await playerSettingsStore.updatePlayerSettings();
};
</script>

<template>
    <div v-if="shouldShow && loggedInPlayer && shareCode" class="card mb-4 border-warning">
        <div class="card-body">
            <button
                class="btn btn-sm btn-outline-secondary float-end ms-2"
                @click="dismiss"
                type="button"
            >✕ {{ $t('dismiss') }}</button>

            <h5 class="card-title">
                <IconPartyPopper class="text-warning" />
                {{ $t('retrospective.lobby_card_title', { year }) }}
            </h5>

            <p class="card-text">{{ $t('retrospective.lobby_card_description') }}</p>

            <router-link
                :to="{ name: 'player-retrospective', params: { slug: loggedInPlayer.slug, year, shareCode } }"
                class="btn btn-warning"
            >{{ $t('retrospective.lobby_card_button') }}</router-link>
        </div>
    </div>
</template>
