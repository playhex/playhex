<script setup lang="ts">
import { toRefs } from 'vue';
import { Player, Tournament } from '../../../../../shared/app/models/index.js';
import { byRank } from '../../../../../shared/app/tournamentUtils.js';
import { getWinnerPlayer } from '../../../../../shared/app/hostedGameUtils.js';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournament } = toRefs(props);

/**
 * Get player history, returns like ['W', 'W', 'L', 'W', 'L']
 */
const playerGamesHistory = (player: Player) => {
    const history: { endedAt: Date, win: boolean }[] = [];

    for (const game of tournament.value.matches) {
        if (!game.hostedGame || !game.player1 || !game.player2) {
            continue;
        }

        if (game.player1.publicId !== player.publicId && game.player2.publicId !== player.publicId) {
            continue;
        }

        const winner = getWinnerPlayer(game.hostedGame);

        if (!winner) {
            continue;
        }

        let endedAt = game.hostedGame.endedAt;

        if (typeof endedAt === 'string') {
            endedAt = new Date(endedAt);
        }

        if (!(endedAt instanceof Date)) {
            throw new Error('missing ended at');
        }

        history.push({
            endedAt,
            win: winner.publicId === player.publicId,
        });
    }

    history.sort((a, b) => a.endedAt.getTime() - b.endedAt.getTime());

    return history.map(h => h.win ? 'W' : 'L');
};
</script>

<template>
    <table class="table">
        <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col">{{ $t('player') }}</th>
                <th scope="col">History</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="participant in tournament.participants.sort(byRank)">
                <th scope="row">{{ participant.rank ?? '-' }}</th>
                <td>{{ participant.player.pseudo }}</td>
                <td class="font-monospace">{{ playerGamesHistory(participant.player).join(' ') }}</td>
            </tr>
        </tbody>
    </table>
</template>
