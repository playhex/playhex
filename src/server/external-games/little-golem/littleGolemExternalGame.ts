import { v4 as uuidv4 } from 'uuid';
import { ExternalGame } from '../../../shared/app/models/index.js';
import { EngineGame } from '../../../shared/game-engine/index.js';
import type { Outcome } from '../../../shared/game-engine/Types.js';
import type { HexMove } from '@playhex/move-notation';
import { parseGamePage } from './littleGolemParsers.js';
import { parseLittleGolemHsgf } from '../../../shared/app/little-golem/littleGolemHsgf.js';
import { LITTLE_GOLEM_SOURCE, littleGolemGameExternalId, littleGolemGameUrl, littleGolemPlayerExternalId } from '../../../shared/app/little-golem/littleGolemUtils.js';

/**
 * Little Golem does not tell how game ended, except for resignation.
 * Replays moves to know if winner connected, else assume a timeout.
 */
const guessOutcome = (boardsize: number, moves: HexMove[], resigned: boolean): null | Outcome => {
    if (resigned) {
        return 'resign';
    }

    if (moves.length === 0) {
        return 'forfeit';
    }

    try {
        const engineGame = new EngineGame(boardsize);

        engineGame.setAllowSwap(true);

        moves.forEach((move, index) => engineGame.move(move, index % 2 as 0 | 1));

        if (engineGame.hasWinner()) {
            return 'path';
        }
    } catch {
        return null;
    }

    return 'time';
};

/**
 * Creates an ExternalGame from Little Golem exports.
 *
 * @param hsgf Content of servlet/sgf/<gid>/game<gid>.hsgf
 * @param gamePageHtml Content of jsp/game/game.jsp?gid=<gid>, for dates and players ids
 *
 * @throws {LittleGolemGameNotFinishedError}
 */
export const createExternalGameFromLittleGolem = (gid: number, hsgf: string, gamePageHtml: string): ExternalGame => {
    const parsed = parseLittleGolemHsgf(hsgf);
    const gamePage = parseGamePage(gamePageHtml);
    const externalGame = new ExternalGame();

    externalGame.publicId = uuidv4();
    externalGame.externalId = littleGolemGameExternalId(gid);
    externalGame.boardsize = parsed.boardsize;
    externalGame.moves = parsed.moves;
    externalGame.moveTimestamps = null;
    externalGame.player0Name = (parsed.player0Name ?? gamePage.player0?.pseudo ?? '?').substring(0, 64);
    externalGame.player1Name = (parsed.player1Name ?? gamePage.player1?.pseudo ?? '?').substring(0, 64);
    externalGame.player0ExternalId = gamePage.player0 ? littleGolemPlayerExternalId(gamePage.player0.plid) : null;
    externalGame.player1ExternalId = gamePage.player1 ? littleGolemPlayerExternalId(gamePage.player1.plid) : null;
    externalGame.player0Rating = gamePage.player0Rating?.substring(0, 32) ?? null;
    externalGame.player1Rating = gamePage.player1Rating?.substring(0, 32) ?? null;
    externalGame.winner = parsed.winner;
    externalGame.outcome = parsed.winner === null ? null : guessOutcome(parsed.boardsize, parsed.moves, parsed.resigned);
    externalGame.startedAt = gamePage.startedAt;
    externalGame.endedAt = gamePage.endedAt;
    externalGame.source = LITTLE_GOLEM_SOURCE;
    externalGame.sourceUrl = littleGolemGameUrl(gid);
    externalGame.event = parsed.event?.substring(0, 128) ?? null;

    return externalGame;
};
