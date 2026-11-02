import { createHash } from 'node:crypto';
import { Body, HttpError, JsonController, Post, Req } from 'routing-controllers';
import { Service } from 'typedi';
import type { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { QueryFailedError } from 'typeorm';
import { Expose } from '../../shared/app/class-transformer-custom.js';
import { ExternalGame } from '../../shared/app/models/index.js';
import { ImportUserError } from '../../shared/app/hex-game-importer/errors.js';
import type { ImportedGame } from '../../shared/app/hex-game-importer/types.js';
import type { ImporterHandlerInterface } from '../../shared/app/hex-game-importer/ImporterHandlerInterface.js';
import { parsePlayHexGameId } from '../../shared/app/hex-game-importer/handlers/PlayHexLink.js';
import { parseLittleGolemGameId } from '../../shared/app/hex-game-importer/handlers/LittleGolemLink.js';
import { LittleGolemSGF } from '../../shared/app/hex-game-importer/handlers/LittleGolemSGF.js';
import { SGF } from '../../shared/app/hex-game-importer/handlers/SGF.js';
import { AbstractPlay } from '../../shared/app/hex-game-importer/handlers/AbstractPlay.js';
import { AbstractPlayJson } from '../../shared/app/hex-game-importer/handlers/AbstractPlayJson.js';
import { HexWorldLink } from '../../shared/app/hex-game-importer/handlers/HexWorldLink.js';
import LittleGolemClient, { LittleGolemFetchError } from '../../shared/app/little-golem/LittleGolemClient.js';
import { LittleGolemGameNotFinishedError } from '../../shared/app/little-golem/littleGolemHsgf.js';
import { LITTLE_GOLEM_SOURCE, littleGolemGameExternalId } from '../../shared/app/little-golem/littleGolemUtils.js';
import { hexGameImporter } from '../services/hexGameImporter.js';
import logger from '../services/logger.js';
import { rateLimiterConsumeImportExternalGame } from '../services/rate-limiters.js';
import { mustBeOAuthClientWithScope } from '../controllers/http/middlewares.js';
import GameRepository from '../repositories/GameRepository.js';
import ExternalGameRepository from './ExternalGameRepository.js';
import { createExternalGameFromLittleGolem } from './little-golem/littleGolemExternalGame.js';
import { findPathWinner } from './externalGameOutcome.js';

class ImportSourceBody
{
    /**
     * Game url (PlayHex, Little Golem, HexWorld...), SGF, AbstractPlay export, or raw moves.
     */
    @Expose()
    @IsString()
    @MinLength(1)
    @MaxLength(100_000)
    source: string;
}

/**
 * Where game to analyze is:
 * - "game": a game played on PlayHex, see /api/games/:publicId
 * - "external-game": an imported game, see /api/external-games/:publicId
 */
export type ImportSourceResult = {
    kind: 'game' | 'external-game';
    publicId: string;
};

/**
 * Prefix of externalId of games imported from any other source than Little Golem.
 * Followed by a hash of boardsize and moves, so a same game is imported only once.
 */
const IMPORTED_EXTERNAL_ID_PREFIX = 'IMP:';

const importedGameExternalId = (boardsize: number, moves: string[]): string => IMPORTED_EXTERNAL_ID_PREFIX
    + createHash('sha1').update(`${boardsize} ${moves.join(' ')}`).digest('hex')
;

/**
 * Displayed source name, null if unknown (e.g raw moves).
 */
const getSourceName = (handler: null | ImporterHandlerInterface): null | string => {
    if (handler instanceof LittleGolemSGF) return LITTLE_GOLEM_SOURCE;
    if (handler instanceof AbstractPlay || handler instanceof AbstractPlayJson) return 'AbstractPlay';
    if (handler instanceof HexWorldLink) return 'HexWorld';
    if (handler instanceof SGF) return 'SGF';

    return null;
};

const getSourceUrl = (source: string): null | string => {
    const url = URL.parse(source.trim());

    if (url === null || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
        return null;
    }

    const href = url.toString();

    return href.length <= 255 ? href : null;
};

/**
 * Lets an application (e.g Discord bot) import any game to analyze it.
 * Only for applications with "games:analyze" scope, not for players,
 * because it creates external games on PlayHex.
 */
@JsonController()
@Service()
export default class ExternalGameSourceImportController
{
    constructor(
        private externalGameRepository: ExternalGameRepository,
        private gameRepository: GameRepository,
        private littleGolemClient: LittleGolemClient,
    ) {}

    /**
     * Import a game from any source, so it can be analyzed.
     * A PlayHex game is not imported, the existing game is returned.
     * A game already imported is not imported again, the existing one is returned.
     */
    @Post('/api/external-games/import')
    async importSource(
        @Req() req: Request,
        @Body() { source }: ImportSourceBody,
    ): Promise<ImportSourceResult> {
        const { clientId } = mustBeOAuthClientWithScope(req, 'games:analyze');

        await rateLimiterConsumeImportExternalGame(clientId);

        try {
            const playHexGameId = parsePlayHexGameId(source);

            if (playHexGameId !== null) {
                return await this.findPlayHexGame(playHexGameId);
            }

            const littleGolemGameId = parseLittleGolemGameId(source);

            if (littleGolemGameId !== null) {
                return await this.importLittleGolemGame(littleGolemGameId);
            }

            return await this.importFromAnySource(source);
        } catch (e) {
            if (e instanceof ImportUserError) {
                throw new HttpError(400, e.message);
            }

            throw e;
        }
    }

    private async findPlayHexGame(publicId: string): Promise<ImportSourceResult>
    {
        // Only finished games can be analyzed
        if (await this.gameRepository.getAnalyzeGameRequest(publicId) === null) {
            throw new ImportUserError('PlayHex game not found, or not finished');
        }

        return { kind: 'game', publicId };
    }

    /**
     * Imported like Little Golem account import, to get players ratings, dates, outcome...
     */
    private async importLittleGolemGame(gid: number): Promise<ImportSourceResult>
    {
        const externalId = littleGolemGameExternalId(gid);
        const existing = await this.externalGameRepository.findByExternalId(externalId);

        if (existing !== null) {
            return { kind: 'external-game', publicId: existing.publicId };
        }

        let externalGame: ExternalGame;

        try {
            const hsgf = await this.littleGolemClient.fetchGameHsgf(gid);
            const gameDetail = await this.littleGolemClient.fetchGameDetail(gid);

            externalGame = createExternalGameFromLittleGolem(gid, hsgf, gameDetail);
        } catch (e) {
            if (e instanceof LittleGolemFetchError) {
                throw new ImportUserError('Could not download Little Golem game');
            }

            if (e instanceof LittleGolemGameNotFinishedError) {
                throw new ImportUserError('Cannot import a game that is not finished');
            }

            throw e;
        }

        return await this.saveOnce(externalGame);
    }

    private async importFromAnySource(source: string): Promise<ImportSourceResult>
    {
        const handler = hexGameImporter.findHandler(source);
        let importedGame: ImportedGame;

        try {
            importedGame = await hexGameImporter.import(source);
        } catch (e) {
            // Handlers throw plain errors on malformed source (invalid SGF, invalid move coords...)
            if (e instanceof Error && !(e instanceof ImportUserError)) {
                logger.notice('Could not import game from source', { errorMessage: e.message, source: source.substring(0, 200) });

                throw new ImportUserError(`Could not read this game: ${e.message}`);
            }

            throw e;
        }

        if (importedGame.moves.length === 0) {
            throw new ImportUserError('Game has no moves');
        }

        const pathWinner = findPathWinner(importedGame.boardsize, importedGame.moves);

        // Could not be analyzed
        if (pathWinner === undefined) {
            throw new ImportUserError('Invalid game: moves cannot be replayed (illegal move, or move outside board)');
        }

        const externalId = importedGameExternalId(importedGame.boardsize, importedGame.moves);
        const existing = await this.externalGameRepository.findByExternalId(externalId);

        if (existing !== null) {
            return { kind: 'external-game', publicId: existing.publicId };
        }

        const externalGame = new ExternalGame();

        externalGame.publicId = uuidv4();
        externalGame.externalId = externalId;
        externalGame.boardsize = importedGame.boardsize;
        externalGame.moves = importedGame.moves;
        externalGame.player0Name = (importedGame.playerBlackName || '?').substring(0, 64);
        externalGame.player1Name = (importedGame.playerWhiteName || '?').substring(0, 64);
        externalGame.winner = pathWinner;
        externalGame.outcome = pathWinner !== null ? 'path' : null;
        externalGame.source = getSourceName(handler);
        externalGame.sourceUrl = getSourceUrl(source);
        externalGame.createdBy = null;

        return await this.saveOnce(externalGame);
    }

    /**
     * Same game may be imported at same time (e.g many Discord users analyzing same game):
     * on unique externalId conflict, return the game imported meanwhile.
     */
    private async saveOnce(externalGame: ExternalGame): Promise<ImportSourceResult>
    {
        try {
            await this.externalGameRepository.save(externalGame);
        } catch (e) {
            if (!(e instanceof QueryFailedError)) {
                throw e;
            }

            const existing = await this.externalGameRepository.findByExternalId(externalGame.externalId);

            if (existing === null) {
                throw e;
            }

            return { kind: 'external-game', publicId: existing.publicId };
        }

        return { kind: 'external-game', publicId: externalGame.publicId };
    }
}
