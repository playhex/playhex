<script setup lang="ts">
/*
 * Host side of a live session: play a match from current position.
 */
import { inject, ref, watchEffect } from 'vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import { hexplorerLiveHostKey, useLoadingAction } from '../composables/useHexplorerLive.js';
import { createKatahexAnalyzers } from '../composables/useAnalysisEngines.js';
import type { HexplorerMatchOpponentInput } from '../../../../shared/app/hexplorerLive.js';
import type { AnalysisEngine } from '../../../../shared/app/hexplorer.js';
import type { Player } from '../../../../shared/app/models/index.js';
import AppOpponentPlayerSelect from '../../components/overlay/create-game/AppOpponentPlayerSelect.vue';
import HexplorerMatchPanel from './HexplorerMatchPanel.vue';
import HexplorerLiveLink from './HexplorerLiveLink.vue';
import HexplorerLiveElsewhere from './HexplorerLiveElsewhere.vue';
import { IconCircleFill, IconDiagram2, IconPlayFill } from '../../icons.js';

const { state, isEngineAvailable } = inject(hexplorerKey)!;

const {
    match,
    matchRunning,
    showMatchBoard,
    myColor,
    canJoin,
    liveElsewhere,
    createMatch,
    resignMatch,
    joinMatch,
} = inject(hexplorerLiveHostKey)!;

const { loading, run } = useLoadingAction();

/*
 * New match form
 */
const bots = createKatahexAnalyzers().map(analyzer => ({ engine: analyzer.engine, name: analyzer.getName() }));

const hostColor = ref<0 | 1>(0);
const opponentType = ref<AnalysisEngine | 'player'>(bots[0].engine);
const invitedPlayer = ref<null | Player>(null);

// Do not keep an unavailable bot selected
watchEffect(() => {
    if (opponentType.value !== 'player' && !isEngineAvailable(opponentType.value)) {
        opponentType.value = bots.find(bot => isEngineAvailable(bot.engine))?.engine ?? 'player';
    }
});

const startMatch = () => run(async () => {
    const opponent: HexplorerMatchOpponentInput = opponentType.value === 'player'
        ? { type: 'player', invitedPlayerPublicId: invitedPlayer.value?.publicId ?? null }
        : { type: 'bot', engine: opponentType.value }
    ;

    await createMatch({ hostColor: hostColor.value, opponent });
});
</script>

<template>
    <div>
        <h2 class="h6 d-flex align-items-center gap-2">
            <IconPlayFill />
            {{ $t('hexplorer_live.match') }}
        </h2>

        <template v-if="match && (matchRunning || showMatchBoard)">
            <HexplorerMatchPanel
                :match
                :myColor
                :canJoin
                @join="run(joinMatch)"
                @resign="run(resignMatch)"
            />

            <HexplorerLiveLink v-if="match.state === 'waiting'" class="mt-2" />

            <button
                type="button"
                class="btn btn-primary btn-sm mt-2"
                @click="showMatchBoard = !showMatchBoard"
            >
                <template v-if="showMatchBoard"><IconDiagram2 /> {{ $t('hexplorer_live.back_to_analysis') }}</template>
                <template v-else><IconPlayFill /> {{ $t('hexplorer_live.back_to_match') }}</template>
            </button>
        </template>

        <HexplorerLiveElsewhere v-else-if="liveElsewhere" />

        <form v-else @submit.prevent="startMatch">
            <p class="small text-body-secondary mb-2">{{ $t('hexplorer_live.match_description') }}</p>

            <div class="mb-2">
                <div class="small mb-1">{{ $t('hexplorer_live.i_play') }}</div>
                <div class="btn-group btn-group-sm" role="group">
                    <input type="radio" class="btn-check" id="hexplorer-play-color-red" :value="0" v-model="hostColor">
                    <label class="btn btn-outline-danger" for="hexplorer-play-color-red"><IconCircleFill /> {{ $t('game.red') }}</label>

                    <input type="radio" class="btn-check" id="hexplorer-play-color-blue" :value="1" v-model="hostColor">
                    <label class="btn btn-outline-primary" for="hexplorer-play-color-blue"><IconCircleFill /> {{ $t('game.blue') }}</label>
                </div>
            </div>

            <div class="mb-2">
                <label class="small mb-1" for="hexplorer-play-opponent">{{ $t('hexplorer_live.opponent') }}</label>
                <select id="hexplorer-play-opponent" class="form-select form-select-sm" v-model="opponentType">
                    <option
                        v-for="bot in bots"
                        :key="bot.engine"
                        :value="bot.engine"
                        :disabled="!isEngineAvailable(bot.engine)"
                    >{{ bot.name }}{{ isEngineAvailable(bot.engine) ? '' : ` (${$t('hexplorer_live.bot_unavailable')})` }}</option>
                    <option value="player">{{ $t('hexplorer_live.opponent_player') }}</option>
                </select>
            </div>

            <div v-if="opponentType === 'player'" class="mb-2">
                <AppOpponentPlayerSelect v-model="invitedPlayer" :placeholder="$t('hexplorer_live.invite_player_optional')" />
                <div class="form-text">{{ $t('hexplorer_live.invite_player_help') }}</div>
            </div>


            <p v-if="state.setupMode" class="small text-warning mb-2">{{ $t('hexplorer_live.validate_setup_first') }}</p>

            <button type="submit" class="btn btn-success" :disabled="loading || state.setupMode">
                <IconPlayFill /> {{ $t('hexplorer_live.start_match') }}
            </button>
        </form>
    </div>
</template>
