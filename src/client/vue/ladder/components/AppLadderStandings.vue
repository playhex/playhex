<script setup lang="ts">
import { computed, PropType, ref } from 'vue';
import { LadderChallenge, LadderPlayer, Player } from '../../../../shared/app/models/index.js';
import { LadderChallengeCandidateDto, LadderMeDto } from '../../../../shared/app/models/LadderDto.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppLadderTitles from './AppLadderTitles.vue';
import LadderChallengeRefusalOverlay from './LadderChallengeRefusalOverlay.vue';
import LadderPlayerStatusOverlay from './LadderPlayerStatusOverlay.vue';
import { defineOverlay } from '@overlastic/vue';
import { t } from 'i18next';
import { pseudoString } from '../../../../shared/app/pseudoUtils.js';
import { IconCrown, IconExclamationTriangleFill, IconGraphUp, IconSearch, IconShieldFill, IconTablerSwords } from '../../icons.js';

const props = defineProps({
    slug: {
        type: String,
        required: true,
    },
    standings: {
        type: Array as PropType<LadderPlayer[]>,
        required: true,
    },
    runningChallenges: {
        type: Array as PropType<LadderChallenge[]>,
        required: true,
    },
    strikes: {
        type: Object as PropType<{ [playerPublicId: string]: number }>,
        required: true,
    },
    me: {
        type: Object as PropType<null | LadderMeDto>,
        default: null,
    },
});

const emit = defineEmits<{
    challenge: [player: Player];
}>();

const refusalOverlay = defineOverlay(LadderChallengeRefusalOverlay);
const playerStatusOverlay = defineOverlay(LadderPlayerStatusOverlay);

const showPlayerStatus = async (player: Player): Promise<void> => {
    try {
        await playerStatusOverlay({ slug: props.slug, player });
    } catch (e) {
        // closed
    }
};

const candidatesByPlayer = computed((): Map<string, LadderChallengeCandidateDto> => {
    return new Map((props.me?.candidates ?? []).map(candidate => [candidate.player.publicId, candidate]));
});

const runningChallengesCount = (player: Player): number => props.runningChallenges
    .filter(c => c.challenger.publicId === player.publicId || c.defender.publicId === player.publicId)
    .length
;

const refusalText = (ladderPlayer: LadderPlayer): string => t(`ladder.refusal.${candidatesByPlayer.value.get(ladderPlayer.player.publicId)?.refusal}`);

const showRefusal = async (ladderPlayer: LadderPlayer): Promise<void> => {
    try {
        await refusalOverlay({
            title: t('ladder.challenge_overlay.title', { player: pseudoString(ladderPlayer.player) }),
            message: refusalText(ladderPlayer),
        });
    } catch (e) {
        // closed
    }
};

const search = ref('');

/**
 * Standings filtered by player pseudo, keeping real seats
 */
const filteredStandings = computed((): LadderPlayer[] => {
    const query = search.value.trim().toLowerCase();

    if (query === '') {
        return props.standings;
    }

    return props.standings.filter(ladderPlayer => ladderPlayer.player.pseudo.toLowerCase().includes(query));
});

const isMe = (ladderPlayer: LadderPlayer): boolean => props.me?.ladderPlayer?.player.publicId === ladderPlayer.player.publicId;
</script>

<template>
    <p v-if="standings.length === 0" class="text-secondary">{{ $t('ladder.no_players') }}</p>

    <div v-else class="input-group input-group-sm mb-2">
        <span class="input-group-text"><IconSearch /></span>
        <input v-model="search" type="search" class="form-control" :placeholder="$t('ladder.search_player')" :aria-label="$t('ladder.search_player')">
    </div>

    <div v-if="standings.length > 0" class="table-responsive">
        <table class="table table-sm align-middle">
            <thead class="align-top">
                <tr>
                    <th class="text-end">{{ $t('ladder.position') }}</th>
                    <th>{{ $t('ladder.player') }}</th>
                    <th></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="filteredStandings.length === 0">
                    <td colspan="4" class="text-secondary">{{ $t('ladder.no_player_found') }}</td>
                </tr>
                <tr v-for="ladderPlayer in filteredStandings" :key="ladderPlayer.player.publicId" :class="{ 'table-active': isMe(ladderPlayer) }">
                    <td class="text-end">
                        <IconCrown v-if="ladderPlayer.position === 1" class="text-warning me-1" />
                        <span class="fs-4 fw-bold">{{ ladderPlayer.position }}</span>
                    </td>
                    <td>
                        <AppPseudo :player="ladderPlayer.player" rating flag onlineStatus />
                        <span v-if="strikes[ladderPlayer.player.publicId]" class="text-warning ms-1" :title="$t('ladder.strikes', { count: strikes[ladderPlayer.player.publicId] })"><IconExclamationTriangleFill /></span>
                    </td>
                    <td>
                        <small class="text-secondary text-nowrap">
                            <span v-if="runningChallengesCount(ladderPlayer.player) > 0" class="me-2" :title="$t('ladder.running_games')"><IconTablerSwords /> {{ runningChallengesCount(ladderPlayer.player) }}</span>
                            <span class="me-2" :title="$t('ladder.defense_streak_help')"><IconShieldFill /> {{ ladderPlayer.currentDefenseStreak }} / {{ ladderPlayer.bestDefenseStreak }}</span>
                            <AppLadderTitles :ladderPlayer />
                        </small>
                    </td>
                    <td class="text-end text-nowrap">
                        <template v-if="candidatesByPlayer.get(ladderPlayer.player.publicId)">
                            <button
                                v-if="candidatesByPlayer.get(ladderPlayer.player.publicId)!.refusal === null"
                                type="button"
                                class="btn btn-sm btn-warning"
                                @click="emit('challenge', ladderPlayer.player)"
                            ><IconTablerSwords /> {{ $t('ladder.challenge') }}</button>
                            <button
                                v-else
                                type="button"
                                class="btn btn-sm btn-outline-secondary opacity-50"
                                :title="refusalText(ladderPlayer)"
                                @click="showRefusal(ladderPlayer)"
                            ><IconTablerSwords /> {{ $t('ladder.challenge') }}</button>
                        </template>
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary ms-1"
                            :title="$t('ladder.player_stats')"
                            :aria-label="$t('ladder.player_stats')"
                            @click="showPlayerStatus(ladderPlayer.player)"
                        ><IconGraphUp /></button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
