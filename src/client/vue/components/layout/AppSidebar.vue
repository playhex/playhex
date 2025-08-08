<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '../../../stores/onlinePlayersStore.js';
import AppPseudo from '../AppPseudo.vue';
import { Tournament, type OnlinePlayer } from '../../../../shared/app/models/index.js';
import { apiGetActiveTournaments } from '../../../apiClient.js';
import AppFeaturedTournamentCard from '../../tournaments/components/AppFeaturedTournamentCard.vue';

const {
    players,
    totalPlayers,
} = storeToRefs(useOnlinePlayersStore());

const orderedPlayers = computed<OnlinePlayer[]>(() => {
    return Object.values<OnlinePlayer>(players.value)
        .sort((a, b) => {
            // Guests go after non-guests
            if (!a.player.isGuest && b.player.isGuest) return -1;
            if (a.player.isGuest && !b.player.isGuest) return 1;
            return a.player.pseudo.localeCompare(b.player.pseudo);
        });
});

// Featured tournaments
const featuredTournaments = ref<Tournament[]>([]);

(async () => {
    featuredTournaments.value = await apiGetActiveTournaments({
        featured: true,
    });
})();
</script>

<template>
    <div>
        <AppFeaturedTournamentCard
            v-for="tournament in featuredTournaments"
            :key="tournament.publicId"
            :tournament
        />

        <h3>{{ $t('n_online_players', { n: null === totalPlayers ? '…' : totalPlayers }) }}</h3>

        <p
            v-for="player in orderedPlayers"
            :key="player.player.publicId"
            class="mb-1"
        >
            <AppPseudo rating :player="player.player" onlineStatus />
        </p>
    </div>
</template>
