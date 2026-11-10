<script setup lang="ts">
/*
 * Players, status and actions of a match played from a Hexplorer position.
 */
import { computed } from 'vue';
import { getMatchPosition, type HexplorerMatch } from '../../../../shared/app/hexplorerLive.js';
import AppPseudo from '../../components/AppPseudo.vue';
import { IconCircleFill, IconFlag, IconPlayFill, IconRobot, IconXLg } from '../../icons.js';
import { analysisEngineName } from '../composables/useAnalysisEngines.js';

const props = defineProps<{
    match: HexplorerMatch;
    myColor: null | 0 | 1;
    canJoin: boolean;
}>();

const emit = defineEmits<{
    join: [];
    resign: [];
}>();

const nextPlayer = computed(() => getMatchPosition(props.match).nextPlayer);

const isMyTurn = computed(() => props.match.state === 'playing' && props.myColor === nextPlayer.value);

const canSwap = computed(() => isMyTurn.value
    && props.match.startPosition.swapAllowed
    && props.match.moves.length === 0,
);

const colorClass = (color: 0 | 1): string => color === 0 ? 'text-danger' : 'text-primary';
</script>

<template>
    <div class="hexplorer-match-panel">
        <ul class="list-unstyled mb-2">
            <li
                v-for="color in [0, 1] as const"
                :key="color"
                class="d-flex align-items-center gap-2 py-1 px-2 rounded"
                :class="{ 'bg-body-secondary': match.state === 'playing' && nextPlayer === color }"
            >
                <IconCircleFill :class="colorClass(color)" />

                <template v-if="match.seats[color].type === 'bot'">
                    <IconRobot />
                    <span>{{ analysisEngineName(match.seats[color].engine) }}</span>
                </template>
                <AppPseudo v-else-if="match.seats[color].player" :player="match.seats[color].player" />
                <span v-else class="text-body-secondary fst-italic">
                    {{ match.invitedPlayer ? $t('hexplorer_live.waiting_for_player', { pseudo: match.invitedPlayer.pseudo }) : $t('hexplorer_live.waiting_for_opponent') }}
                </span>

                <span
                    v-if="myColor === color"
                    class="badge ms-auto"
                    :class="!isMyTurn ? 'text-bg-secondary' : color === 0 ? 'text-bg-danger' : 'text-bg-primary'"
                    :title="canSwap ? $t('hexplorer_live.swap_hint') : undefined"
                >{{ isMyTurn ? $t('hexplorer_live.your_turn') : $t('hexplorer_live.you') }}</span>
            </li>
        </ul>

        <p v-if="match.state === 'ended'" class="fw-semibold mb-2">
            <template v-if="match.winner !== null">
                <span :class="colorClass(match.winner)">{{ match.winner === 0 ? $t('game.red') : $t('game.blue') }}</span>
                {{ match.outcome === 'resign' ? $t('hexplorer_live.wins_by_resignation') : $t('hexplorer_live.wins') }}
            </template>
            <template v-else-if="match.outcome === 'expired'">{{ $t('hexplorer_live.match_expired') }}</template>
            <template v-else>{{ $t('hexplorer_live.match_canceled') }}</template>
        </p>

        <div class="d-flex flex-wrap gap-2">
            <button v-if="canJoin" type="button" class="btn btn-success" @click="emit('join')">
                <IconPlayFill /> {{ $t('hexplorer_live.join_match') }}
            </button>

            <button v-if="myColor !== null && match.state === 'playing'" type="button" class="btn btn-outline-danger btn-sm" @click="emit('resign')">
                <IconFlag /> {{ $t('resign') }}
            </button>

            <button v-if="myColor !== null && match.state === 'waiting'" type="button" class="btn btn-outline-warning btn-sm" @click="emit('resign')">
                <IconXLg /> {{ $t('hexplorer_live.cancel_match') }}
            </button>
        </div>
    </div>
</template>
