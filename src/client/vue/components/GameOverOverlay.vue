<script setup lang="ts">
import { Player, PlayerIndex } from '@shared/game-engine';
import { useOverlayMeta } from 'unoverlay-vue';
import { PropType } from 'vue';

const { visible, confirm, cancel } = useOverlayMeta();

const props = defineProps({
    winner: {
        type: Player,
        required: true,
    },
});
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="cancel()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <form class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Game over</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong :class="'text-player-' + (props.winner.getPlayerIndex() ? 'b' : 'a')">{{ props.winner.getName() }}</strong> won the game !</p>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-outline-primary" @click="confirm()">Ok</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
