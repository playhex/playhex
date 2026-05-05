<script setup lang="ts">
import { Tournament } from '../../../../../shared/app/models/index.js';
import { byRank } from '../../../../../shared/app/tournamentUtils.js';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    <div class="card">
        <div class="card-header">
            <h2 class="card-title m-0">{{ $t('n_participants', { count: tournament.participants.length }) }}</h2>
        </div>
        <table class="table mb-0">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">{{ $t('player') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="participant in tournament.participants.sort(byRank)">
                    <th scope="row">{{ participant.rank ?? '-' }}</th>
                    <td>{{ participant.player.pseudo }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
