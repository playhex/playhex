<script setup lang="ts">
/* eslint-env browser */
import { gameToSGF } from '../../../../shared/game-engine/SGF';
import { useOverlayMeta } from 'unoverlay-vue';
import { downloadString } from '../../../services/fileDownload';
import { gameToHexworldLink } from '../../../../shared/app/hexworld';
import { BIconRepeat, BIconDownload, BIconBoxArrowUpRight } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';
import { PropType } from 'vue';
import Player from '../../../../shared/app/models/Player';
import { Game } from '../../../../shared/game-engine';
import { pseudoString } from '../../../../shared/app/pseudoUtils';

const { visible, confirm } = useOverlayMeta();

const props = defineProps({
    game: {
        type: Game,
        required: true,
    },
    players: {
        type: Array as PropType<Player[]>,
        required: true,
    },
    rematch: {
        type: Function,
        required: false,
    },
});

const { players, game, rematch } = props;

const winner: null | Player = game.isCanceled()
    ? null
    : players[game.getStrictWinner()]
;

/*
 * SGF download
 */
const downloadSGF = (): void => {
    const filename = [
        'hex',
        game.getStartedAt().toISOString().substring(0, 10),
        pseudoString(players[0], 'slug'),
        'VS',
        pseudoString(players[1], 'slug'),
    ].join('-') + '.sgf';

    downloadString(gameToSGF(game, {
        PB: pseudoString(players[0], 'pseudo'),
        PW: pseudoString(players[1], 'pseudo'),
    }), filename);
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
                        <p v-if="null !== winner">
                            <AppPseudo
                                :player="winner"
                                is="strong"
                                :classes="0 === game.getStrictWinner() ? 'text-danger' : 'text-primary'"
                            />
                            won {{ outcomeToString() }} !
                        </p>
                        <p v-else>Game has been canceled.</p>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button
                            v-if="rematch"
                            type="button"
                            class="btn btn-primary"
                            @click="confirm(); rematch();"
                        ><BIconRepeat /> Rematch</button>

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
                        ><BIconDownload /> SGF</button>

                        <a
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            target="_blank"
                            :href="gameToHexworldLink(game)"
                        ><BIconBoxArrowUpRight/> <img src="/images/hexworld-icon.png" alt="HexWorld icon" height="18" /> HexWorld</a>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
