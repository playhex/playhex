<script setup lang="ts">
import { format } from 'date-fns';
import { PropType } from 'vue';
import { ExternalGame } from '../../../../shared/app/models/index.js';

defineProps({
    externalGames: {
        type: Array as PropType<ExternalGame[]>,
        required: true,
    },
});

const winnerName = (externalGame: ExternalGame): string => externalGame.winner === 0
    ? externalGame.player0Name
    : externalGame.player1Name
;
</script>

<template>
    <div class="table-responsive">
        <table class="table text-nowrap mb-0">
            <thead>
                <tr>
                    <th scope="col"></th>
                    <th scope="col">{{ $t('game.red') }}</th>
                    <th scope="col">{{ $t('game.blue') }}</th>
                    <th scope="col">{{ $t('game.outcome') }}</th>
                    <th scope="col">{{ $t('game.size') }}</th>
                    <th scope="col">{{ $t('external_games.source') }}</th>
                    <th scope="col">{{ $t('game.finished') }}</th>
                    <th scope="col">{{ $t('external_games.imported') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="externalGame in externalGames"
                    :key="externalGame.publicId"
                >
                    <td class="ps-0">
                        <router-link
                            :to="{ name: 'external-game', params: { externalGameId: externalGame.publicId } }"
                            class="btn btn-sm btn-link"
                        >{{ $t('external_games.open') }}</router-link>
                    </td>

                    <td><span class="text-danger">{{ externalGame.player0Name }}</span> <small v-if="null !== externalGame.player0Rating" class="text-body-secondary">{{ externalGame.player0Rating }}</small></td>
                    <td><span class="text-primary">{{ externalGame.player1Name }}</span> <small v-if="null !== externalGame.player1Rating" class="text-body-secondary">{{ externalGame.player1Rating }}</small></td>

                    <td>
                        <span v-if="null !== externalGame.winner">
                            <span :class="0 === externalGame.winner ? 'text-danger' : 'text-primary'">{{ winnerName(externalGame) }}</span>
                            {{ ' ' }}
                            <small>+ {{ externalGame.outcome ? $t('outcome.' + externalGame.outcome) : '??' }}</small>
                        </span>
                        <span v-else>-</span>
                    </td>

                    <td>{{ externalGame.boardsize }}</td>

                    <td>
                        <a v-if="externalGame.sourceUrl" :href="externalGame.sourceUrl" target="_blank" rel="noopener">{{ externalGame.source ?? externalGame.sourceUrl }}</a>
                        <span v-else>{{ externalGame.source ?? '-' }}</span>
                    </td>

                    <td>{{ externalGame.endedAt ? format(externalGame.endedAt, 'd MMMM yyyy') : '-' }}</td>

                    <td>{{ format(externalGame.createdAt, 'd MMMM yyyy') }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
