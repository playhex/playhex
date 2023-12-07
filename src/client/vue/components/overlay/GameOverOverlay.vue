<script setup lang="ts">
import { Player } from '@shared/game-engine';
import { useOverlayMeta } from 'unoverlay-vue';

const { visible, confirm } = useOverlayMeta();

const props = defineProps({
    winner: {
        type: Player,
        required: true,
    },
    rematch: {
        type: Function,
        required: false,
    },
});

const { winner, rematch } = props;
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="confirm()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <form class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Game over</h5>
                        <button type="button" class="btn-close" @click="confirm()"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong :class="'text-player-' + (winner.getPlayerIndex() ? 'b' : 'a')">{{ winner.getName() }}</strong> won the game !</p>
                    </div>
                    <div class="modal-footer">
                        <button
                            v-if="rematch"
                            type="button"
                            class="btn btn-primary"
                            @click="confirm(); rematch();"
                        ><i class="bi-repeat"></i> Rematch</button>

                        <button
                            type="button"
                            class="btn btn-outline-primary"
                            @click="confirm()"
                        >Ok</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
