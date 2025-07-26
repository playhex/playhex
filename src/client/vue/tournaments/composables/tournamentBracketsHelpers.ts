import { computed, ref } from 'vue';
import TournamentMatch from '../../../../shared/app/models/TournamentMatch.js';
import Player from '../../../../shared/app/models/Player.js';
import Tournament from '../../../../shared/app/models/Tournament.js';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../../stores/authStore.js';
import { groupAndSortTournamentMatches, parseTournamentMatchKey, tournamentMatchKey } from '../../../../shared/app/tournamentUtils.js';
import LeaderLine from 'leader-line-new';

export const useTournamentBracketsHelpers = (tournament: Tournament) => {

    // Do not re-position arrows when zooming because it will break arrows positions when zooming after scroll horizontally
    (LeaderLine as unknown as { positionByWindowResize: boolean }).positionByWindowResize = false;

    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const isOrganizer = computed(() => loggedInPlayer.value?.publicId === tournament.organizer.publicId);
    const groups = groupAndSortTournamentMatches(tournament.matches);

    // Highlight same player in brackets on hover. Defaults to current player.
    const highlightedPlayer = ref<null | Player>(loggedInPlayer.value);
    const highlightPlayer = (player: null | Player): void => {
        highlightedPlayer.value = player ?? loggedInPlayer.value;
    };

    // Highlight tournament match from url hash
    const { hash } = location;
    const urlMatch = hash.match(/^#match-(\d)+\.(\d)+\.(\d)+/);
    let highlightedGroup: null | number = null;
    let highlightedRound: null | number = null;
    let highlightedNumber: null | number = null;

    if (urlMatch) {
        highlightedGroup = parseInt(urlMatch[1], 10);
        highlightedRound = parseInt(urlMatch[2], 10);
        highlightedNumber = parseInt(urlMatch[3], 10);
    }

    const isTournamentMatchHighlighted = (tournamentMatch: TournamentMatch): boolean => {
        return (tournamentMatch.group) === highlightedGroup
            && (tournamentMatch.round) === highlightedRound
            && (tournamentMatch.number) === highlightedNumber
        ;
    };

    // Arrows
    const yRow1 = '32%';
    const yRow2 = '42%';
    const gravity = 60;
    const allArrows: LeaderLine[] = [];

    return {
        /**
         * Whether current logged in player is tournament organizer.
         * Used to know if we should show some organizer menus.
         */
        isOrganizer,

        /**
         * Tournament games grouped by group, rounds, and sorted by match number
         */
        groups,

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
         * Whether this tournament match is the one highlighted from url hash
         */
        isTournamentMatchHighlighted,

        /**
         * Creates an arrow between two tournament matches.
         *
         * @param from "1.1"
         * @param to "2.1"
         * @param winOrLose Whether to show an arrow for the winner path or the loser path
         */
        drawArrow(from: string, to: string, winOrLose: 'win' | 'lose'): LeaderLine
        {
            const startElement = document.querySelector(`.brackets-match-${from.replace(/\./g, '-')}`) as HTMLElement;
            const endElement = document.querySelector(`.brackets-match-${to.replace(/\./g, '-')}`) as HTMLElement;

            if (!startElement || !endElement) {
                throw new Error(`Missing start or end element, from ${from} to ${to}, path ${winOrLose}`);
            }

            const baseOptions: LeaderLine.Options = {
                startSocket: 'right',
                endSocket: 'left',
                path: 'fluid',
                size: 2,
                startSocketGravity: gravity,
                endSocketGravity: gravity,
            };

            return winOrLose === 'win'

                // win arrow
                ? new LeaderLine({
                    ...baseOptions,
                    color: '#198754',
                    start: LeaderLine.pointAnchor({
                        element: startElement,
                        x: '100%',
                        y: yRow1,
                    }),
                    end: LeaderLine.pointAnchor({
                        element: endElement,
                        x: 0,
                        y: yRow1,
                    }),
                })

                // lose arrow
                : new LeaderLine({
                    ...baseOptions,
                    color: '#dc3545',
                    start: LeaderLine.pointAnchor({
                        element: startElement,
                        x: '100%',
                        y: yRow2,
                    }),
                    end: LeaderLine.pointAnchor({
                        element: endElement,
                        x: 0,
                        y: yRow2,
                    }),
                })
            ;
        },

        drawAllArrows(tournament: Tournament, loserArrows = false): void
        {
            for (const tournamentMatch of tournament.matches) {
                const { winnerPath, loserPath } = tournamentMatch;

                if (winnerPath) {
                    const { group } = parseTournamentMatchKey(winnerPath);

                    if (group === tournamentMatch.group) {
                        const line = this.drawArrow(
                            tournamentMatchKey(tournamentMatch),
                            winnerPath,
                            'win',
                        );

                        allArrows.push(line);
                    }
                }

                if (loserPath) {
                    const { group } = parseTournamentMatchKey(loserPath);

                    if (group === tournamentMatch.group) {
                        const line = this.drawArrow(
                            tournamentMatchKey(tournamentMatch),
                            loserPath,
                            'lose',
                        );

                        // Hide loser arrows. Should be shown when hover a specfic player
                        if (!loserArrows) {
                            line.hide('none');
                        }

                        allArrows.push(line);
                    }
                }
            }

            // Move to container which will follow brackets container
            const container = document.querySelector('.arrows-container') as HTMLElement;

            document.querySelectorAll('.leader-line').forEach(arrow => {
                container.appendChild(arrow);
            });
        },

        clearAllArrows()
        {
            // Move back to body to clearly remove arrow: library only searches arrows in body
            document.querySelectorAll('.leader-line').forEach(arrow => {
                document.body.appendChild(arrow);
            });

            allArrows.forEach(line => line.remove());
        },
    };
};
