<script setup lang="ts">
import { computed, PropType } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { LadderChallenge, Player } from '../../../../shared/app/models/index.js';
import useAuthStore from '../../../stores/authStore.js';
import useMyGamesStore, { CurrentGame } from '../../../stores/myGamesStore.js';
import { getMyIndex } from '../../../services/context-utils.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppChrono from '../../components/AppChrono.vue';
import { IconLightningChargeFill, IconShieldFill } from '../../icons.js';
import type { PlayerTimeData } from '../../../../shared/time-control/TimeControl.js';

const props = defineProps({
    /**
     * Player owning these slots, me or another player
     */
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
    /**
     * Player running challenges occupying these slots
     */
    challenges: {
        type: Array as PropType<LadderChallenge[]>,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
    /**
     * Seat player will have if they win, by challenge publicId
     */
    seatsIfWon: {
        type: Object as PropType<{ [challengePublicId: string]: null | number }>,
        required: true,
    },
});

const { loggedInPlayer } = storeToRefs(useAuthStore());
const { myGames } = storeToRefs(useMyGamesStore());

/**
 * Free slots to display after occupied ones.
 * Can be 0 if more challenges than slots, i.e. after my seat changed.
 */
const isMe = computed((): boolean => props.player.publicId === loggedInPlayer.value?.publicId);

const emptySlotsCount = computed((): number => Math.max(0, props.total - props.challenges.length));

const getOpponent = (challenge: LadderChallenge): Player => challenge.challenger.publicId === props.player.publicId
    ? challenge.defender
    : challenge.challenger
;

/**
 * Defender does not move when winning, only their defense streak grows.
 */
const isDefender = (challenge: LadderChallenge): boolean => challenge.defender.publicId === props.player.publicId;

/**
 * Live game from my games store, to get turn and clock updated in real time.
 */
const getMyGame = (challenge: LadderChallenge): null | CurrentGame => !isMe.value || challenge.game === null
    ? null
    : myGames.value[challenge.game.publicId] ?? null
;

const isMyTurn = (challenge: LadderChallenge): boolean => getMyGame(challenge)?.isMyTurn ?? false;

/**
 * My clock in the game of this challenge
 */
const getMyTimeData = (challenge: LadderChallenge): null | PlayerTimeData => {
    const myGame = getMyGame(challenge);

    if (myGame === null) {
        return null;
    }

    const myIndex = getMyIndex(myGame.game);

    return myIndex === null
        ? null
        : myGame.game.timeControl?.players[myIndex] ?? null
    ;
};
</script>

<template>
    <div class="d-flex flex-column gap-2 mb-3">
        <component
            v-for="challenge in challenges"
            :key="challenge.publicId"
            :is="challenge.game ? RouterLink : 'div'"
            :to="challenge.game ? { name: 'online-game', params: { gameId: challenge.game.publicId } } : undefined"
            class="card text-decoration-none"
            :class="isMyTurn(challenge) ? 'border-success border-2' : ''"
        >
            <div class="card-body p-2">
                <div class="small text-truncate text-body">
                    {{ $t('ladder.slot_game_against') }}
                    <AppPseudo :player="getOpponent(challenge)" rating onlineStatus />
                </div>

                <div v-if="isMe || challenge.state === 'pending_live'" class="d-flex justify-content-between align-items-center gap-2 mt-1">
                    <span v-if="challenge.state === 'pending_live'" class="badge text-bg-info"><IconLightningChargeFill /> {{ $t('ladder.slot_waiting_live_answer') }}</span>
                    <span v-else-if="isMyTurn(challenge)" class="badge text-bg-success">{{ $t('lobby_your_turn_badge') }}</span>
                    <span v-else class="badge text-bg-secondary">{{ $t('lobby_waiting_badge') }}</span>

                    <AppChrono
                        v-if="getMyTimeData(challenge)"
                        :playerTimeData="getMyTimeData(challenge)!"
                        :timeControlOptions="getMyGame(challenge)!.game.timeControlType"
                        class="small"
                    />
                </div>

                <div class="d-flex justify-content-between gap-2 mt-1 small text-secondary">
                    <template v-if="isDefender(challenge)">
                        <span>{{ $t('ladder.slot_win_streak') }} <IconShieldFill />+1</span>
                        <span>{{ $t('ladder.slot_lose_seat') }}</span>
                    </template>
                    <template v-else>
                        <span>{{ seatsIfWon[challenge.publicId] ? $t('ladder.slot_win_seat', { position: seatsIfWon[challenge.publicId] }) : '' }}</span>
                        <span>{{ $t('ladder.slot_lose_streak') }} <IconShieldFill /> = 0</span>
                    </template>
                </div>
            </div>
        </component>

        <div v-for="i in emptySlotsCount" :key="`empty-${i}`" class="card bg-body-tertiary">
            <div class="card-body p-2 text-secondary small">
                {{ $t('ladder.slot_empty') }}
            </div>
        </div>
    </div>
</template>
