import { isSameDay } from 'date-fns';
import { SGF, SGFColor, sgfToString } from '../sgf';
import { HostedGame, ChatMessage } from './models';
import { pseudoString } from './pseudoUtils';
import { Move } from '../game-engine';
import { guessDemerHandicapFromHostedGame } from './demerHandicap';
import { isRatingConfident } from './ratingUtils';

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
const getMovesChatMessages = (hostedGame: HostedGame): ChatMessage[][] => {
    if (!hostedGame.gameData) {
        return [];
    }

    const { movesHistory } = hostedGame.gameData;

    if (0 === movesHistory.length) {
        // If there is no move, there is no move node in sgf to contain chat messages.
        // So returns empty.
        return [];
    }

    const { chatMessages } = hostedGame;
    const movesChatMessages: ChatMessage[][] = Array(movesHistory.length).fill(null).map(() => []);
    let i = 0;

    for (const chatMessage of chatMessages) {
        while (i + 1 < movesHistory.length && chatMessage.createdAt > movesHistory[i + 1].playedAt) {
            ++i;
        }

        movesChatMessages[i].push(chatMessage);
    }

    return movesChatMessages;
};

export const hostedGameToSGF = (hostedGame: HostedGame): string => {
    const sgf: SGF = {
        ...baseSGF,
        PC: `https://playhex.org/games/${hostedGame.publicId}`,
        GN: hostedGame.publicId,
        SZ: hostedGame.gameOptions.boardsize,
    };

    // Moves
    const movesHistory = hostedGame.gameData?.movesHistory;

    if (movesHistory && movesHistory.length > 0) {
        const colors: SGFColor[] = ['B', 'W'];
        const movesChatMessages = getMovesChatMessages(hostedGame);

        sgf.moves = movesHistory.map((move, index) => ({
            [colors[index % 2]]: Move.fromData(move).toString(),
            C: 0 === movesChatMessages[index].length
                ? undefined
                : movesChatMessages[index].map(chat => `${chat.player?.pseudo}: ${chat.content}`).join('\n')
            ,
        }));
    }

    // DT, date of the game
    if (hostedGame.gameData?.endedAt) {
        if (isSameDay(hostedGame.gameData.endedAt, hostedGame.gameData.startedAt)) {
            // Played in same day, outputs "YYYY-MM-DD"
            sgf.DT = hostedGame.gameData.startedAt.toISOString().substring(0, 10);
        } else {
            const startedAtStr = hostedGame.gameData.startedAt.toISOString().substring(0, 10);
            const endedAtStr = hostedGame.gameData.endedAt.toISOString().substring(0, 10);

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
    if (hostedGame.gameData?.endedAt) {
        if (null === hostedGame.gameData.winner) {
            sgf.RE = 'Void';
        } else {
            sgf.RE = hostedGame.gameData.winner === 0 ? 'B+' : 'W+';

            switch (hostedGame.gameData.outcome) {
                case 'resign': sgf.RE += 'Resign'; break;
                case 'time': sgf.RE += 'Time'; break;
                case 'forfeit': sgf.RE += 'Forfeit'; break;
            }
        }
    } else {
        sgf.RE = '?';
    }

    // PB PW, players name
    if (hostedGame.gameData?.startedAt) {
        sgf.PB = pseudoString(hostedGame.hostedGameToPlayers[0].player, 'pseudo');
        sgf.PW = pseudoString(hostedGame.hostedGameToPlayers[1].player, 'pseudo');
    }

    // BR, WR, players ratings if available (rated games only)
    if (hostedGame.ratings.length > 0) {
        const { ratings, hostedGameToPlayers } = hostedGame;
        const { round } = Math;

        const blackRating = ratings.find(rating => rating.player.publicId === hostedGameToPlayers[0].player.publicId);
        const whiteRating = ratings.find(rating => rating.player.publicId === hostedGameToPlayers[1].player.publicId);

        if (blackRating) {
            sgf.BR = round(blackRating.rating) + (isRatingConfident(blackRating) ? '' : '?');
        }

        if (whiteRating) {
            sgf.WR = round(whiteRating.rating) + (isRatingConfident(whiteRating) ? '' : '?');
        }
    }

    // HA, guess Demer handicap from game settings and pass moves
    sgf.HA = guessDemerHandicapFromHostedGame(hostedGame);

    return sgfToString(sgf);
};
