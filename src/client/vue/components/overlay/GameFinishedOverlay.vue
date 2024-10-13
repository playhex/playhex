<script setup lang="ts">
/* eslint-env browser */
import { PropType } from 'vue';
import { usePrograms } from '@overlastic/vue';
import AppPseudo from '../AppPseudo.vue';
import Player from '../../../../shared/app/models/Player';
import { Game } from '../../../../shared/game-engine';

const { visible, resolve } = usePrograms();

const props = defineProps({
    game: {
        type: Game,
        required: true,
    },
    players: {
        type: Array as PropType<Player[]>,
        required: true,
    },
});

const { players, game } = props;

const winner: null | Player = game.isCanceled()
    ? null
    : players[game.getStrictWinner()]
;

</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="resolve()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <form class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ $t('game_finished_overlay.title') }}</h5>
                        <button type="button" class="btn-close" @click="resolve()"></button>
                    </div>
                    <div class="modal-body text-center lead">
                        <p v-if="null !== winner">
                            <i18next :translation="$t('player_wins_by.' + (game.getOutcome() ?? 'default'))">
                                <template #player>
                                    <AppPseudo
                                        :player="winner"
                                        is="strong"
                                        :classes="0 === game.getStrictWinner() ? 'text-danger' : 'text-primary'"
                                    />
                                </template>
                            </i18next>
                        </p>
                        <p v-else>{{ $t('game_has_been_canceled') }}</p>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button
                            type="button"
                            class="btn btn-outline-primary"
                            @click="resolve()"
                        >{{ $t('close') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
