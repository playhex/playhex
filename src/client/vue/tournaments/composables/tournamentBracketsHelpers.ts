import { computed, ref } from 'vue';
import TournamentGame from '../../../../shared/app/models/TournamentGame.js';
import Player from '../../../../shared/app/models/Player.js';
import Tournament from '../../../../shared/app/models/Tournament.js';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../../stores/authStore.js';
import { getRoundsFromTournament } from '../../../../shared/app/tournamentUtils.js';

export const useTournamentBracketsHelpers = (tournament: Tournament) => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const isHost = computed(() => loggedInPlayer.value?.publicId === tournament.host.publicId);
    const rounds = getRoundsFromTournament(tournament);

    // Highlight same player in brackets on hover. Defaults to current player.
    const highlightedPlayer = ref<null | Player>(loggedInPlayer.value);
    const highlightPlayer = (player: null | Player): void => {
        highlightedPlayer.value = player ?? loggedInPlayer.value;
    };

    // Highlight tournament game from url hash
    const { hash } = location;
    const urlMatch = hash.match(/^#match-(\d)+\.(\d)+/);
    let highlightedRound: null | number = null;
    let highlightedNumber: null | number = null;

    if (urlMatch) {
        highlightedRound = parseInt(urlMatch[1], 10);
        highlightedNumber = parseInt(urlMatch[2], 10);
    }

    const isTournamentGameHighlighted = (tournamentGame: TournamentGame): boolean => {
        return tournamentGame.round === highlightedRound
            && tournamentGame.number === highlightedNumber
        ;
    };

    return {
        /**
         * Whether current logged in player is tournament host.
         * Used to know if we should show some host menus.
         */
        isHost,

        /**
         * Tournament games grouped by rounds, and sorted by match number
         */
        rounds,

        /**
        * Highlight same player in brackets.
        * If null, no player should be highlighted.
        */
        highlightedPlayer,

        /**
         * Change currently highlighted player.
         * Passing null will highlight current logged in player.
         */
        highlightPlayer,

        /**
         * Whether this tournament game is the one highlighted from url hash
         */
        isTournamentGameHighlighted,
    };
};
