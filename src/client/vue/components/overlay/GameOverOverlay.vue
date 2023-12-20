<script setup lang="ts">
/* eslint-env browser */
import { Game, PlayerInterface } from '@shared/game-engine';
import { gameToSGF } from '@shared/game-engine/SGF';
import { useOverlayMeta } from 'unoverlay-vue';
import { downloadString } from '../../../services/fileDownload';

const { visible, confirm } = useOverlayMeta();

const props = defineProps({
    game: {
        type: Game,
        required: true,
    },
    rematch: {
        type: Function,
        required: false,
    },
});

const { game, rematch } = props;

const winner: null | PlayerInterface = game.isCanceled()
    ? null
    : game.getPlayer(game.getStrictWinner())
;

/*
 * SGF download
 */
const slugify = (string: string): string => string
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, '_')
;

const downloadSGF = (): void => {
    const filename = [
        'hex',
        (game.getStartedAt() ?? game.getCreatedAt()).toISOString().substring(0, 10),
        slugify(game.getPlayer(0).getName()),
        'VS',
        slugify(game.getPlayer(1).getName()),
    ].join('-') + '.sgf';

    downloadString(gameToSGF(game), filename);
};

const outcomeToString = (): string => {
    switch (game.getOutcome()) {
        case null: return 'the game';
        case 'resign': return 'by resignation';
        case 'time': return 'by time';
        case 'forfeit': return 'by forfeit';
    }
};
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
                        <p v-if="null !== winner"><strong :class="'text-player-' + (game.getStrictWinner() ? 'b' : 'a')">{{ winner.getName() }}</strong> won {{ outcomeToString() }} !</p>
                        <p v-else>Game has been canceled.</p>
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
                            @click="downloadSGF();"
                        ><i class="bi-download"></i> SGF</button>

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
