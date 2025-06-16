<script setup lang="ts">
import { PropType, toRefs } from 'vue';
import { Player, Tournament, TournamentGame } from '../../../../shared/app/models';
import { tournamentMatchNumber } from '../../../../shared/app/tournamentUtils';
import AppBracketManageGame from './AppBracketManageGame.vue';
import { BIconTrophyFill } from 'bootstrap-icons-vue';
import AppPseudo from '../../components/AppPseudo.vue';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
    tournamentGame: {
        type: TournamentGame,
        required: true,
    },

    /**
     * Whether this tournament game should be highlighted,
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
    isHost: {
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

const tournamentGameStateClasses: { [state: string]: string } = {
    waiting: 'border-secondary',
    playing: 'border-danger',
    done: 'border-success',
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
        :id="'match-' + tournamentMatchNumber(tournamentGame)"
        :class="[
            'card',
            tournamentGameStateClasses[tournamentGame.state],
            isHighlighted ? 'card-highlighted' : '',
        ]"
    >
        <div class="card-body">
            <small class="text-secondary match-number">
                {{ $t(`match_title.${tournamentGame.label ?? 'default'}`, {
                    round: tournamentGame.round,
                    number: tournamentGame.number,
                }) }}
            </small>

            <p
                :class="playerHighlightClasses(tournamentGame.player1)"
                @mouseenter="highlightPlayer(tournamentGame.player1)"
                @mouseleave="highlightPlayer(null)"
                class="mb-2"
            >
                <AppPseudo v-if="tournamentGame.player1" :player="tournamentGame.player1" />
                <span v-else>-</span>
                <BIconTrophyFill
                    v-if="'done' === tournamentGame.state && 0 === tournamentGame.hostedGame?.gameData?.winner"
                    class="text-warning ms-1"
                />
            </p>

            <p
                :class="playerHighlightClasses(tournamentGame.player2)"
                @mouseenter="highlightPlayer(tournamentGame.player2)"
                @mouseleave="highlightPlayer(null)"
                class="my-0"
            >
                <AppPseudo v-if="tournamentGame.player2" :player="tournamentGame.player2" />
                <span v-else>-</span>
                <BIconTrophyFill
                    v-if="'done' === tournamentGame.state && 1 === tournamentGame.hostedGame?.gameData?.winner"
                    class="text-warning ms-1"
                />
            </p>
        </div>
        <div class="card-footer">
            <AppBracketManageGame v-if="isHost" :tournament :tournamentGame />

            <RouterLink
                v-if="tournamentGame.hostedGame"
                :to="{ name: 'online-game', params: { gameId: tournamentGame.hostedGame.publicId } }"
            >
                View game
            </RouterLink>
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
