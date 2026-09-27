<script setup lang="ts">
import { PropType } from 'vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { OfflineGameHistoryEntry } from '../models/OfflineGameHistoryEntry.js';
import { OfflineGameMode } from '../services/OfflineGamesStorage.js';
import { EngineGame, PlayerIndex } from '../../../../shared/game-engine/index.js';
import { IconHourglass, IconTrophyFill } from '../../icons.js';

const props = defineProps({
    entries: {
        type: Array as PropType<OfflineGameHistoryEntry[]>,
        required: true,
    },

    /**
     * Used to link to game review.
     */
    mode: {
        type: String as PropType<OfflineGameMode>,
        required: true,
    },
});

type DisplayedEntry = {
    entry: OfflineGameHistoryEntry;
    winner: null | PlayerIndex;
    timeWinner: null | PlayerIndex;
    boardsize: number;
    endedAgo: null | string;
};

const displayedEntries: DisplayedEntry[] = props.entries.map(entry => {
    const game = EngineGame.fromData(entry.gameData);
    const endedAt = game.getEndedAt();
    const timeoutLoser = entry.timeoutLoser ?? null;

    return {
        entry,
        winner: game.getWinner(),
        timeWinner: timeoutLoser === null ? null : (1 - timeoutLoser) as PlayerIndex,
        boardsize: game.getSize(),
        endedAgo: endedAt ? formatDistanceToNowStrict(new Date(endedAt), { addSuffix: true }) : null,
    };
});
</script>

<template>
    <div v-if="displayedEntries.length > 0">
        <h4>{{ $t('local_play.recent_games') }}</h4>

        <div class="row g-2">
            <div v-for="{ entry, winner, timeWinner, boardsize, endedAgo }, key in displayedEntries" :key class="col-6 col-sm-4 col-lg-3 col-xxl-2">
                <div class="card h-100 text-center">
                    <div class="card-body p-2">
                        <p v-for="playerIndex in ([0, 1] as PlayerIndex[])" :key="playerIndex" class="mb-0 text-truncate">
                            <span :class="0 === playerIndex ? 'text-danger' : 'text-primary'">{{ entry.pseudos[playerIndex] }}</span>
                            <IconTrophyFill v-if="winner === playerIndex" class="ms-1 text-warning" />
                            <IconHourglass v-if="timeWinner === playerIndex" class="ms-1 text-secondary" :title="$t('local_play.x_wins_on_time', { player: entry.pseudos[playerIndex] })" />
                        </p>

                        <small class="text-secondary">{{ boardsize }}×{{ boardsize }}<template v-if="endedAgo"> · {{ endedAgo }}</template></small>

                        <router-link
                            :to="{ name: 'local-game-review', params: { mode, index: key } }"
                            class="stretched-link"
                            :title="$t('local_play.review')"
                            :aria-label="$t('local_play.review')"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

