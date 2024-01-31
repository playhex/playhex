<script setup lang="ts">
/* eslint-env browser */
import { gameToSGF } from '../../../../shared/game-engine/SGF';
import { useOverlayMeta } from 'unoverlay-vue';
import { downloadString } from '../../../services/fileDownload';
import { gameToHexworldLink } from '../../../../shared/app/hexworld';
import { BIconRepeat, BIconDownload, BIconBoxArrowUpRight } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';
import { PropType } from 'vue';
import { PlayerData } from '../../../../shared/app/Types';
import { Game } from '../../../../shared/game-engine';

const { visible, confirm } = useOverlayMeta();

const props = defineProps({
    game: {
        type: Game,
        required: true,
    },
    players: {
        type: Array as PropType<PlayerData[]>,
        required: true,
    },
    rematch: {
        type: Function,
        required: false,
    },
});

const { players, game, rematch } = props;

const winner: null | PlayerData = game.isCanceled()
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
        players[0].slug,
        'VS',
        players[1].slug,
    ].join('-') + '.sgf';

    downloadString(gameToSGF(game, {
        PB: players[0].pseudo,
        PW: players[1].pseudo,
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
                            <app-pseudo
                                :player-data="winner"
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
