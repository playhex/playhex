import { isSameDay } from 'date-fns';
import { SGF, SGFColor, sgfToString } from '../sgf/index.js';
import { Game, ChatMessage } from './models/index.js';
import { pseudoString } from './pseudoUtils.js';
import { guessDemerHandicapFromGame } from './demerHandicap.js';
import { isRatingConfident } from './ratingUtils.js';
import { SGFMove } from '../sgf/types.js';
import { createTimeControl } from '../time-control/createTimeControl.js';
import { PlayerIndex } from '../time-control/TimeControl.js';
import { ByoYomiTimeControl } from '../time-control/time-controls/ByoYomiTimeControl.js';
import { getTimestampedMoves } from './gameUtils.js';

const baseSGF: SGF = {
    FF: 4,
    CA: 'UTF-8',
    AP: 'PlayHex:0.0.0',
    GM: 11,
    SO: 'PlayHex.org',
};

/**
 * Returns chat messages grouped by moves.
 * Used to get chat messages posted on a given move.
 *
 * Chat messages posted before first move are on first move.
 * Then, all messages are on the move they are posted when given move was last played move.
 */
const getMovesChatMessages = (game: Game): ChatMessage[][] => {
    if (!game) {
        return [];
    }

    const { moveTimestamps } = game;

    if (moveTimestamps.length === 0) {
        // If there is no move, there is no move node in sgf to contain chat messages.
        // So returns empty.
        return [];
    }

    const { chatMessages } = game;
    const movesChatMessages: ChatMessage[][] = Array(moveTimestamps.length).fill(null).map(() => []);
    let i = 0;

    for (const chatMessage of chatMessages) {
        while (i + 1 < moveTimestamps.length && chatMessage.createdAt > moveTimestamps[i + 1]) {
            ++i;
        }

        movesChatMessages[i].push(chatMessage);
    }

    return movesChatMessages;
};

export const gameToSGF = (game: Game): string => {
    const sgf: SGF = {
        ...baseSGF,
        PC: `https://playhex.org/games/${game.publicId}`,
        GN: game.publicId,
        SZ: game.boardsize,
    };

    // Moves
    const timestampedMoves = getTimestampedMoves(game);

    if (timestampedMoves && timestampedMoves.length > 0) {
        const timeControl = createTimeControl(game.timeControlType);
        timeControl.start(timestampedMoves[0].playedAt, timestampedMoves[0].playedAt);

        const colors: SGFColor[] = ['B', 'W'];
        const movesChatMessages = getMovesChatMessages(game);

        sgf.moves = timestampedMoves.map((timestampedMove, index) => {
            const sgfMove: SGFMove = {};

            // Move
            sgfMove[colors[index % 2]] = timestampedMove.move;

            // Chat messages as comment
            if (movesChatMessages[index].length > 0) {
                sgfMove.C = movesChatMessages[index].map(chat => `${chat.player ? pseudoString(chat.player) : 'System'}: ${chat.content}`).join('\n');
            }

            // Remaining time
            timeControl.push(index % 2 as PlayerIndex, timestampedMove.playedAt, timestampedMove.playedAt);

            if (timeControl instanceof ByoYomiTimeControl) {
                const { remainingMainTime, remainingPeriods } = timeControl.getValues().players[index % 2];

                if (typeof remainingMainTime === 'number') {
                    sgfMove[colors[index % 2] + 'L' as 'BL' | 'WL'] = msToSeconds(remainingMainTime);
                }

                sgfMove['O' + colors[index % 2] as 'OB' | 'OW'] = remainingPeriods;
            } else {
                const { totalRemainingTime } = timeControl.getValues().players[index % 2];

                if (typeof totalRemainingTime === 'number') {
                    sgfMove[colors[index % 2] + 'L' as 'BL' | 'WL'] = msToSeconds(totalRemainingTime);
                }
            }

            return sgfMove;
        });
    }

    // DT, date of the game
    if (game.endedAt && game.startedAt) {
        if (isSameDay(game.endedAt, game.startedAt)) {
            // Played in same day, outputs "YYYY-MM-DD"
            sgf.DT = game.startedAt.toISOString().substring(0, 10);
        } else {
            const startedAtStr = game.startedAt.toISOString().substring(0, 10);
            const endedAtStr = game.endedAt.toISOString().substring(0, 10);

            if (startedAtStr.substring(0, 7) === endedAtStr.substring(0, 7)) {
                // Played in multiple days of same month, outputs "YYYY-MM-DD,DD"
                sgf.DT = startedAtStr + ',' + endedAtStr.substring(8);
            } else {
                // Played in multiple months, outputs "YYYY-MM-DD,YYYY-MM-DD"
                sgf.DT = startedAtStr + ',' + endedAtStr;
            }
        }
    }

    // RE, outcome
    if (game.endedAt) {
        if (game.winner === null) {
            sgf.RE = 'Void';
        } else {
            sgf.RE = game.winner === 0 ? 'B+' : 'W+';

            switch (game.outcome) {
                case 'resign': sgf.RE += 'Resign'; break;
                case 'time': sgf.RE += 'Time'; break;
                case 'forfeit': sgf.RE += 'Forfeit'; break;
            }
        }
    } else {
        sgf.RE = '?';
    }

    // PB PW, players name
    if (game.startedAt) {
        sgf.PB = pseudoString(game.gameToPlayers[0].player, 'pseudo');
        sgf.PW = pseudoString(game.gameToPlayers[1].player, 'pseudo');
    }

    // BR, WR, players ratings if available (rated games only)
    if (game.ratings?.length > 0) {
        const { ratings, gameToPlayers } = game;
        const { round } = Math;

        const blackRating = ratings.find(rating => rating.player.publicId === gameToPlayers[0].player.publicId);
        const whiteRating = ratings.find(rating => rating.player.publicId === gameToPlayers[1].player.publicId);

        if (blackRating) {
            sgf.BR = round(blackRating.rating) + (isRatingConfident(blackRating) ? '' : '?');
        }

        if (whiteRating) {
            sgf.WR = round(whiteRating.rating) + (isRatingConfident(whiteRating) ? '' : '?');
        }
    }

    // TM, OT, LC, LT, time control
    const { timeControlType } = game;
    sgf.TM = msToSeconds(timeControlType.options.initialTime);

    if (timeControlType.family === 'fischer') {
        sgf.OT = 'fischer ' + msToSeconds(timeControlType.options.timeIncrement ?? 0);

        if (timeControlType.options.maxTime === timeControlType.options.initialTime) {
            sgf.OT += ' capped';
        } else if (timeControlType.options.maxTime !== undefined) {
            sgf.OT += ' capped ' + msToSeconds(timeControlType.options.maxTime);
        }
    } else if (timeControlType.family === 'byoyomi') {
        const { periodsCount, periodTime } = timeControlType.options;

        sgf.OT = `${periodsCount}x${msToSeconds(periodTime)} byo-yomi`;
    }

    // HA, guess Demer handicap from game settings and pass moves
    sgf.HA = guessDemerHandicapFromGame(game);


    // EV, RO, tournament
    if (game.tournamentMatch) {
        const tournamentTitle = game.tournamentMatch.tournament.title;
        const roundNumber = game.tournamentMatch.round;
        const matchType = game.tournamentMatch.label;

        sgf.EV = tournamentTitle;
        sgf.RO = '' + roundNumber;

        if (matchType) {
            sgf.RO += ' (' + matchType.replace(/\)/g, '\\)') + ')';
        }
    }

    return sgfToString(sgf);
};

const msToSeconds = (ms: number): number => Math.ceil(ms / 1000);
