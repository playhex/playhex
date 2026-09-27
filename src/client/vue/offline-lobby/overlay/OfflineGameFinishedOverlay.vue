<script setup lang="ts">
import { PropType } from 'vue';
import { useDisclosure } from '@overlastic/vue';
import { EngineGame, PlayerIndex } from '../../../../shared/game-engine/index.js';

/**
 * Resolves with "rematch" when player clicked rematch, or undefined when just closed.
 */
const { visible, confirm } = useDisclosure();

const props = defineProps({
    game: {
        type: EngineGame,
        required: true,
    },

    /**
     * Players pseudos, indexed by color.
     */
    pseudos: {
        type: Array as unknown as PropType<[string, string]>,
        required: true,
    },

    /**
     * Local 1v1 only: player who lost on time before game ended on board.
     */
    timeoutLoser: {
        type: Number as PropType<null | PlayerIndex>,
        default: null,
    },

    /**
     * Local 1v1 only: a player just lost on time, but game is not ended on board.
     * Players can continue without time instead of closing.
     */
    timeoutOnly: {
        type: Boolean,
        default: false,
    },
});

const { pseudos, game, timeoutLoser, timeoutOnly } = props;

const timeWinner: null | PlayerIndex = timeoutLoser === null ? null : (1 - timeoutLoser) as PlayerIndex;

const winner: null | PlayerIndex = timeoutOnly || game.isCanceled()
    ? null
    : game.getStrictWinner()
;

const colorClass = (playerIndex: PlayerIndex): string => playerIndex === 0 ? 'text-danger' : 'text-primary';
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="confirm()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <form class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('game_finished_overlay.title') }}</h5>
                        <button type="button" class="btn-close" @click="confirm()"></button>
                    </div>
                    <div class="modal-body text-center lead">
                        <!-- A player lost on time: only show time winner, even if game continued on board -->
                        <p v-if="null !== timeWinner">
                            <i18next :translation="$t('local_play.x_wins_on_time', { player: '{player}' })">
                                <template #player>
                                    <strong :class="colorClass(timeWinner)">{{ pseudos[timeWinner] }}</strong>
                                </template>
                            </i18next>
                        </p>
                        <p v-else-if="null !== winner">
                            <i18next :translation="$t('player_wins_by.' + (game.getOutcome() ?? 'default'))">
                                <template #player>
                                    <strong :class="colorClass(winner)">{{ pseudos[winner] }}</strong>
                                </template>
                            </i18next>
                        </p>
                        <p v-else>{{ $t('game_has_been_canceled') }}</p>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button
                            v-if="timeoutOnly"
                            type="button"
                            class="btn btn-outline-primary"
                            @click="confirm()"
                        >{{ $t('local_play.continue_without_time') }}</button>
                        <button
                            v-else
                            type="button"
                            class="btn btn-outline-primary"
                            @click="confirm()"
                        >{{ $t('close') }}</button>
                        <button
                            type="button"
                            class="btn btn-success"
                            @click="confirm('rematch')"
                        >{{ $t('rematch.label') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
