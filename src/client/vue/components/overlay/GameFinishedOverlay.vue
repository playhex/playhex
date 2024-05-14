<script setup lang="ts">
/* eslint-env browser */
import { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore';
import { gameToSGF } from '../../../../shared/game-engine/SGF';
import { useOverlayMeta } from 'unoverlay-vue';
import { downloadString } from '../../../services/fileDownload';
import { gameToHexworldLink } from '../../../../shared/app/hexworld';
import { BIconDownload, BIconBoxArrowUpRight } from 'bootstrap-icons-vue';
import AppPseudo from '../AppPseudo.vue';
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
    }
});

const { players, game } = props;

const winner: null | Player = game.isCanceled()
    ? null
    : players[game.getStrictWinner()]
;

const { playerSettings } = storeToRefs(usePlayerSettingsStore());

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
                        <p v-if="null !== winner">
                            <i18next :translation="$t('player_won_by.' + (game.getOutcome() ?? 'default'))">
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
                            @click="confirm()"
                        >{{ $t('close') }}</button>
                    </div>
                    <div class="modal-footer">
                        <p>{{ $t('game_finished_overlay.review_game') }}</p>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            @click="downloadSGF();"
                        ><BIconDownload /> SGF</button>

                        <a
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            target="_blank"
                            :href="gameToHexworldLink(game, playerSettings?.orientationLandscape)"
                        ><BIconBoxArrowUpRight /> <img src="/images/hexworld-icon.png" alt="HexWorld icon" height="18" /> HexWorld</a>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
