import { v4 as uuidv4 } from 'uuid';
import { ExternalGame } from '../../../shared/app/models/index.js';
import { findPathWinner } from '../externalGameOutcome.js';
import type { Outcome } from '../../../shared/game-engine/Types.js';
import type { HexMove } from '@playhex/move-notation';
import { parseGameDetail } from './littleGolemParsers.js';
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

    const pathWinner = findPathWinner(boardsize, moves);

    if (pathWinner === undefined) {
        return null;
    }

    return pathWinner !== null ? 'path' : 'time';
};

/**
 * Creates an ExternalGame from Little Golem exports.
 *
 * @param hsgf Content of api /gameexport/<gid>
 * @param gameDetailJson Content of api /games/gamedetail/<gid>, for dates, players ids and ratings
 *
 * @throws {LittleGolemGameNotFinishedError}
 */
export const createExternalGameFromLittleGolem = (gid: number, hsgf: string, gameDetailJson: string): ExternalGame => {
    const parsed = parseLittleGolemHsgf(hsgf);
    const gameDetail = parseGameDetail(gameDetailJson);
    const externalGame = new ExternalGame();

    externalGame.publicId = uuidv4();
    externalGame.externalId = littleGolemGameExternalId(gid);
    externalGame.boardsize = parsed.boardsize;
    externalGame.moves = parsed.moves;
    // Only if consistent with moves from hsgf
    externalGame.moveTimestamps = gameDetail.moveTimestamps.length === parsed.moves.length && parsed.moves.length > 0
        ? gameDetail.moveTimestamps
        : null
    ;
    externalGame.player0Name = (parsed.player0Name ?? gameDetail.player0?.pseudo ?? '?').substring(0, 64);
    externalGame.player1Name = (parsed.player1Name ?? gameDetail.player1?.pseudo ?? '?').substring(0, 64);
    externalGame.player0ExternalId = gameDetail.player0 ? littleGolemPlayerExternalId(gameDetail.player0.plid) : null;
    externalGame.player1ExternalId = gameDetail.player1 ? littleGolemPlayerExternalId(gameDetail.player1.plid) : null;
    externalGame.player0Rating = gameDetail.player0Rating?.substring(0, 32) ?? null;
    externalGame.player1Rating = gameDetail.player1Rating?.substring(0, 32) ?? null;
    externalGame.winner = parsed.winner;
    externalGame.outcome = parsed.winner === null ? null : guessOutcome(parsed.boardsize, parsed.moves, parsed.resigned);
    externalGame.startedAt = gameDetail.startedAt;
    externalGame.endedAt = gameDetail.endedAt;
    externalGame.source = LITTLE_GOLEM_SOURCE;
    externalGame.sourceUrl = littleGolemGameUrl(gid);
    externalGame.event = parsed.event?.substring(0, 128) ?? null;

    return externalGame;
};
