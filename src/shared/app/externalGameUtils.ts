import { createGame } from './models/Game.js';
import { ExternalGame, GameToPlayer, Player } from './models/index.js';
import type Game from './models/Game.js';
import { type SGF, type SGFColor, sgfToString } from '../sgf/index.js';
import { baseSGF } from './gameToSGF.js';

/**
 * Player instance only with a name, for an external game.
 * No slug, so not linked to a PlayHex profile.
 */
const createExternalPlayer = (externalGame: ExternalGame, position: 0 | 1): Player => {
    const player = new Player();

    player.publicId = `${externalGame.publicId}-${position}`;
    player.pseudo = position === 0 ? externalGame.player0Name : externalGame.player1Name;
    player.slug = '';
    player.isGuest = false;
    player.isBot = false;
    player.createdAt = externalGame.createdAt;

    return player;
};

/**
 * Ended Game instance from an external game,
 * to replay, simulate, analyze it like an ended PlayHex game.
 * Not to be persisted.
 */
export const externalGameToGame = (externalGame: ExternalGame): Game => {
    const game = createGame();
    const date = externalGame.endedAt ?? externalGame.startedAt ?? externalGame.createdAt;

    game.publicId = externalGame.publicId;
    game.state = 'ended';
    game.ranked = false;
    game.boardsize = externalGame.boardsize;
    game.swapRule = true;
    game.firstPlayer = 0;
    game.moves = [...externalGame.moves];
    game.moveTimestamps = externalGame.moveTimestamps?.length === externalGame.moves.length
        ? [...externalGame.moveTimestamps]
        : externalGame.moves.map(() => date)
    ;
    game.currentPlayerIndex = externalGame.moves.length % 2 as 0 | 1;
    game.winner = externalGame.winner;
    game.outcome = externalGame.outcome;
    game.timeControl = null;
    game.createdAt = externalGame.startedAt ?? externalGame.createdAt;
    game.startedAt = externalGame.startedAt ?? externalGame.createdAt;
    game.lastMoveAt = externalGame.moves.length > 0 ? date : null;
    game.endedAt = date;

    game.gameToPlayers = ([0, 1] as const).map(position => {
        const gameToPlayer = new GameToPlayer();

        gameToPlayer.game = game;
        gameToPlayer.player = createExternalPlayer(externalGame, position);
        gameToPlayer.order = position;

        return gameToPlayer;
    });

    return game;
};

const toSgfDate = (date: Date): string => date.toISOString().substring(0, 10);

/**
 * Export an external game to SGF, with moves in PlayHex notation.
 */
export const externalGameToSGF = (externalGame: ExternalGame): string => {
    const colors: SGFColor[] = ['B', 'W'];

    const sgf: SGF = {
        ...baseSGF,
        SZ: externalGame.boardsize,
        GN: externalGame.externalId,
        PB: externalGame.player0Name,
        PW: externalGame.player1Name,
        moves: externalGame.moves.map((move, index) => ({ [colors[index % 2]]: move })),
    };

    // Replaces baseSGF "PlayHex.org", game was not played on PlayHex
    sgf.SO = externalGame.source ?? undefined;

    if (externalGame.sourceUrl) {
        sgf.PC = externalGame.sourceUrl;
    }

    if (externalGame.event) {
        sgf.EV = externalGame.event;
    }

    if (externalGame.startedAt && externalGame.endedAt) {
        const startedAt = toSgfDate(externalGame.startedAt);
        const endedAt = toSgfDate(externalGame.endedAt);

        sgf.DT = startedAt === endedAt ? startedAt : `${startedAt},${endedAt}`;
    } else if (externalGame.endedAt) {
        sgf.DT = toSgfDate(externalGame.endedAt);
    }

    if (externalGame.winner === null) {
        sgf.RE = '?';
    } else {
        sgf.RE = externalGame.winner === 0 ? 'B+' : 'W+';

        switch (externalGame.outcome) {
            case 'resign': sgf.RE += 'Resign'; break;
            case 'time': sgf.RE += 'Time'; break;
            case 'forfeit': sgf.RE += 'Forfeit'; break;
        }
    }

    return sgfToString(sgf);
};
