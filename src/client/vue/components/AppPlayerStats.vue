<script setup lang="ts">
import { PropType } from 'vue';
import { PlayerStats } from '../../../shared/app/models';
import { ref } from 'vue';

const { playerStats } = defineProps({
    playerStats: {
        type: Object as PropType<PlayerStats>,
        required: true,
    },
});

const topBoardsizes: { boardsize: number, playedGames: number }[] = [];
let totalGames = 0;

for (const [boardsize, playedGames] of Object.entries(playerStats.preferredBoardsizes)) {
    topBoardsizes.push({
        boardsize: Number(boardsize),
        playedGames,
    });

    totalGames += playedGames;
}

topBoardsizes.sort((a, b) => b.playedGames - a.playedGames);

let show = ref(0);

while (show.value < 3 && topBoardsizes.length > show.value && topBoardsizes[show.value].playedGames / totalGames >= 0.095) {
    ++show.value;
}
</script>

<template>
    <div class="row">
        <div class="col-6 col-sm-4">
            <p class="mb-0">{{ $t('total_played_games') }}</p>
            <p class="lead">{{ playerStats.totalPlayedGames }}</p>
        </div>
        <div class="col-6 col-sm-6">
            <p class="mb-0">{{ $t('preferred_board_sizes') }}</p>
            <ul class="list-inline" v-if="topBoardsizes.length > 0">
                <li v-for="{ boardsize, playedGames } in topBoardsizes.slice(0, show)" :key="boardsize" class="list-inline-item">
                    <span class="lead">{{ boardsize }}</span>
                    {{ ' ' }}
                    <small>({{ Math.round(100 * playedGames / totalGames) }}%)</small>
                </li>
            </ul>
            <p v-else><small>{{ $t('no_yet_data') }}</small></p>
        </div>
        <div class="col-6 col-sm-4">
            <p class="mb-0">{{ $t('ranked_games') }}</p>
            <p class="lead">{{ playerStats.totalRanked }}</p>
        </div>
        <div class="col-6 col-sm-4">
            <p class="mb-0">{{ $t('friendly_games') }}</p>
            <p class="lead">{{ playerStats.totalFriendly }}</p>
        </div>
        <div class="col-6 col-sm-4">
            <p class="mb-0">{{ $t('bot_games') }}</p>
            <p class="lead">{{ playerStats.totalBotGames }}</p>
        </div>
    </div>
</template>
