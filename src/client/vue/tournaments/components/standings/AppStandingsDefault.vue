<script setup lang="ts">
import { Tournament } from '../../../../../shared/app/models';
import { byRank } from '../../../../../shared/app/tournamentUtils';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    <table class="table">
        <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col">{{ $t('player') }}</th>
                <th scope="col">{{ $t('tournament_player_score') }}</th>
                <th scope="col">{{ $t('tournament_player_tiebreak') }}</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="participant in tournament.participants.sort(byRank)">
                <th scope="row">{{ participant.rank ?? '-' }}</th>
                <td>{{ participant.player.pseudo }}</td>
                <td>{{ participant.score }}</td>
                <td>{{ participant.tiebreak }}</td>
            </tr>
        </tbody>
    </table>
</template>
