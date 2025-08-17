<script setup lang="ts">
import { PropType, toRefs } from 'vue';
import { Player, Tournament, TournamentMatch } from '../../../../shared/app/models';
import AppBracketManageGame from './AppBracketManageGame.vue';
import { IconCheck, IconPlayFill, IconThreeDots, IconTrophyFill } from '../../icons.js';
import AppPseudo from '../../components/AppPseudo.vue';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
    tournamentMatch: {
        type: TournamentMatch,
        required: true,
    },

    /**
     * Whether this tournament match should be highlighted,
     * when there is "#match-x.y" in the url.
     */
    isHighlighted: {
        type: Boolean,
        default: false,
        required: false,
    },

    /**
     * Which player is currently being highlighted in the bracket.
     */
    highlightedPlayer: {
        type: [null, Player] as PropType<null | Player>,
        required: false,
        default: null,
    },

    /**
     * Whether current player is host,
     * so we should show host menu.
     */
    isOrganizer: {
        type: Boolean,
        required: false,
        default: null,
    },
});

const { highlightedPlayer } = toRefs(props);

const emit = defineEmits<{
    highlightPlayer: [player: null | Player];
}>();

const highlightPlayer = (player: null | Player): void => emit('highlightPlayer', player);

const tournamentMatchStateClasses: { [state: string]: string } = {
    waiting: 'secondary',
    playing: 'danger',
    done: 'success',
};

const playerHighlightClasses = (player: null | Player = null): string => {
    if (!player || !highlightedPlayer.value) {
        return '';
    }

    if (player?.publicId === highlightedPlayer.value?.publicId) {
        return 'same-player-highlight';
    }

    return '';
};
</script>

<template>
    <div
        :class="[
            'card',
            'border-' + tournamentMatchStateClasses[tournamentMatch.state],
            isHighlighted ? 'card-highlighted' : '',
            `brackets-match-${tournamentMatch.group}-${tournamentMatch.round}-${tournamentMatch.number}`,
        ]"
    >
        <div class="card-body">
            <small class="text-secondary match-number">
                {{ $t(`match_title.${tournamentMatch.label ?? 'default'}`, {
                    round: tournamentMatch.round,
                    number: tournamentMatch.number,
                }) }}
            </small>

            <p
                :class="playerHighlightClasses(tournamentMatch.player1)"
                @mouseenter="highlightPlayer(tournamentMatch.player1)"
                @mouseleave="highlightPlayer(null)"
                class="mb-2"
            >
                <AppPseudo v-if="tournamentMatch.player1" :player="tournamentMatch.player1" />
                <span v-else>-</span>
                <IconTrophyFill
                    v-if="'done' === tournamentMatch.state && 0 === tournamentMatch.hostedGame?.gameData?.winner"
                    class="text-warning ms-1"
                />
            </p>

            <p
                :class="playerHighlightClasses(tournamentMatch.player2)"
                @mouseenter="highlightPlayer(tournamentMatch.player2)"
                @mouseleave="highlightPlayer(null)"
                class="my-0"
            >
                <AppPseudo v-if="tournamentMatch.player2" :player="tournamentMatch.player2" />
                <span v-else>-</span>
                <IconTrophyFill
                    v-if="'done' === tournamentMatch.state && 1 === tournamentMatch.hostedGame?.gameData?.winner"
                    class="text-warning ms-1"
                />
            </p>
        </div>
        <div class="card-footer">
            <AppBracketManageGame v-if="isOrganizer" :tournament :tournamentMatch />

            <span :class="'text-' + tournamentMatchStateClasses[tournamentMatch.state]">
                <IconThreeDots v-if="'waiting' === tournamentMatch.state" />
                <IconPlayFill v-if="'playing' === tournamentMatch.state" />
                <IconCheck v-if="'done' === tournamentMatch.state" />
            </span>

            <RouterLink
                v-if="tournamentMatch.hostedGame"
                :to="{ name: 'online-game', params: { gameId: tournamentMatch.hostedGame.publicId } }"
            >{{ $t('game.watch') }}</RouterLink>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.same-player-highlight
    background var(--bs-secondary-bg)

.match-number
    position absolute
    top -0.75em
    left 0.5em
    background var(--bs-body-bg)
    padding 0 0.5em

.card-highlighted
    box-shadow var(--bs-focus-ring-x, 0) var(--bs-focus-ring-y, 0) var(--bs-focus-ring-blur, 0) var(--bs-focus-ring-width) unquote('rgba(var(--bs-secondary-rgb), 0.5)')
</style>
