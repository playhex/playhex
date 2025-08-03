<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import useOnlinePlayersStore from '../../../stores/onlinePlayersStore.js';
import AppPseudo from '../AppPseudo.vue';
import AppTournamentCard from '../AppTournamentCard.vue';
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

/*
 * Hex Monthly card.
 * every 3rd saturday, at 17h utc
 *
 * to test it, mock Date by copy pasting mockdate/lib/mockdate.js content in browser:
 * https://www.npmjs.com/package/mockdate?activeTab=code
 *
 * then:
 * MockDate.set('2025-01-17')
 */
const pad = (n: number) => String(n).padStart(2, '0');

const getNthDayInMonth = (nth: number, day: number, month = new Date()): Date => {
    const d = new Date(month.getFullYear(), month.getMonth());

    d.setDate(1 + (7 - d.getDay() + day) % 7 + (nth - 1) * 7);


    return new Date(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T17:00:00Z`);
};

const getHexMonthlyDate = (month = new Date()): Date => {
    const third = 3;
    const saturday = 6;

    return getNthDayInMonth(third, saturday, month);
};

const getNextHexMonthlyNumber = (month: Date): number => {
    return month.getFullYear() * 12 + month.getMonth() - 24275;
};

const nextHexMonthlyDate = getHexMonthlyDate();
const nextHexMonthlyNumber = getNextHexMonthlyNumber(nextHexMonthlyDate);

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
