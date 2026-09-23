<script setup lang="ts">
import { computed, PropType, ref } from 'vue';
import { useDisclosure } from '@overlastic/vue';
import { LadderChallenge, Player } from '../../../../shared/app/models/index.js';
import { LadderPlayerStatusDto } from '../../../../shared/app/models/LadderDto.js';
import { apiGetLadderPlayerStatus } from '../../../apiClient.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppLadderSlots from './AppLadderSlots.vue';
import AppLadderTitles from './AppLadderTitles.vue';
import AppLadderPlayerStats from './AppLadderPlayerStats.vue';
import { IconExclamationTriangleFill } from '../../icons.js';

const { visible, confirm } = useDisclosure();

const props = defineProps({
    slug: {
        type: String,
        required: true,
    },
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
});

/**
 * null: loading, false: error
 */
const status = ref<null | false | LadderPlayerStatusDto>(null);

apiGetLadderPlayerStatus(props.slug, props.player.publicId)
    .then(dto => status.value = dto)
    .catch(() => status.value = false)
;

const outgoingChallenges = computed((): LadderChallenge[] => status.value
    ? status.value.runningChallenges.filter(c => c.challenger.publicId === props.player.publicId)
    : [],
);

const incomingChallenges = computed((): LadderChallenge[] => status.value
    ? status.value.runningChallenges.filter(c => c.defender.publicId === props.player.publicId)
    : [],
);
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="confirm()">
            <div class="modal-dialog modal-dialog-scrollable" @click="e => e.stopPropagation()">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><AppPseudo :player rating flag onlineStatus /></h5>
                        <button type="button" class="btn-close" @click="confirm()"></button>
                    </div>
                    <div class="modal-body">
                        <p v-if="status === null" class="text-secondary m-0">{{ $t('loading') }}</p>
                        <p v-else-if="status === false" class="text-danger m-0">{{ $t('ladder.load_error') }}</p>

                        <template v-else-if="status.ladderPlayer">
                            <h4 v-if="status.ladderPlayer.position !== null">{{ $t('ladder.player_position', { position: status.ladderPlayer.position }) }}</h4>

                            <p class="mb-2"><AppLadderTitles :ladderPlayer="status.ladderPlayer" /></p>

                            <div v-if="status.strikes > 0" class="alert alert-warning">
                                <IconExclamationTriangleFill /> {{ $t('ladder.strikes', { count: status.strikes }) }}
                            </div>

                            <template v-if="status.ladderPlayer.state === 'active'">
                                <h6>{{ $t('ladder.outgoing_slots', { used: status.outgoingUsed, total: status.outgoingTotal }) }}</h6>
                                <AppLadderSlots :player :challenges="outgoingChallenges" :total="status.outgoingTotal" :seatsIfWon="status.seatsIfWon" />

                                <h6>{{ $t('ladder.incoming_slots', { used: status.incomingUsed, total: status.incomingTotal }) }}</h6>
                                <AppLadderSlots :player :challenges="incomingChallenges" :total="status.incomingTotal" :seatsIfWon="status.seatsIfWon" />
                            </template>

                            <hr>
                            <h6>{{ $t('ladder.stats.title_player') }}</h6>
                            <AppLadderPlayerStats :ladderPlayer="status.ladderPlayer" :strikes="status.strikes" :runningChallengesCount="status.runningChallenges.length" />
                        </template>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" @click="confirm()">{{ $t('close') }}</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
