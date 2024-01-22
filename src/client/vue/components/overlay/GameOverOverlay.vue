<script setup lang="ts">
/* eslint-env browser */
import { Game, PlayerInterface } from '@shared/game-engine';
import { gameToSGF } from '@shared/game-engine/SGF';
import { useOverlayMeta } from 'unoverlay-vue';
import { downloadString } from '../../../services/fileDownload';
import { gameToHexworldLink } from '../../../../shared/app/hexworld';
import { pseudoSlug } from '../../../../shared/app/pseudoUtils';
import { BIconRepeat, BIconDownload, BIconBoxArrowUpRight } from 'bootstrap-icons-vue';

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
const downloadSGF = (): void => {
    const filename = [
        'hex',
        (game.getStartedAt() ?? game.getCreatedAt()).toISOString().substring(0, 10),
        pseudoSlug(game.getPlayer(0).getName()),
        'VS',
        pseudoSlug(game.getPlayer(1).getName()),
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
                        <h5 class="modal-title">Game finished</h5>
                        <button type="button" class="btn-close" @click="confirm()"></button>
                    </div>
                    <div class="modal-body text-center lead">
                        <p v-if="null !== winner"><strong :class="0 === game.getStrictWinner() ? 'text-danger' : 'text-primary'">{{ winner.getName() }}</strong> won {{ outcomeToString() }} !</p>
                        <p v-else>Game has been canceled.</p>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button
                            v-if="rematch"
                            type="button"
                            class="btn btn-primary"
                            @click="confirm(); rematch();"
                        ><b-icon-repeat /> Rematch</button>

                        <button
                            type="button"
                            class="btn btn-outline-primary"
                            @click="confirm()"
                        >Ok, close</button>
                    </div>
                    <div class="modal-footer">
                        <p>Review game:</p>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            @click="downloadSGF();"
                        ><b-icon-download /> SGF</button>

                        <a
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            target="_blank"
                            :href="gameToHexworldLink(game)"
                        ><b-icon-box-arrow-up-right/> <img src="/images/hexworld-icon.png" alt="HexWorld icon" height="18" /> HexWorld</a>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
