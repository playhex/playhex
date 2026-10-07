import { Body, Delete, Get, HttpError, JsonController, NotFoundError, OnUndefined, Post, Put } from 'routing-controllers';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Expose } from '../../shared/app/class-transformer-custom.js';
import { ExternalGameImportJob, Player } from '../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import PlayerRepository from '../repositories/PlayerRepository.js';
import { rateLimiterConsumeImportExternalGames, rateLimiterConsumeLinkExternalAccount } from '../services/rate-limiters.js';
import ExternalGameRepository from './ExternalGameRepository.js';
import ExternalGameImportWorker from './ExternalGameImportWorker.js';
import LittleGolemClient, { LittleGolemFetchError } from '../../shared/app/little-golem/LittleGolemClient.js';
import { findPlayerByPseudo, LittleGolemPlayer, parsePlayerPagePseudo, parsePlidInput } from './little-golem/littleGolemParsers.js';

class LinkLittleGolemBody
{
    /**
     * Little Golem pseudo, profile url, or plid.
     */
    @Expose()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    pseudo: string;
}

/**
 * @throws {HttpError} If player cannot import games
 */
const mustNotBeGuest = (player: Player): void => {
    if (player.isGuest) {
        throw new HttpError(403, 'Guests cannot link external accounts nor import games');
    }
};

/**
 * Link an external account (Little Golem) to player,
 * and import all games of this account.
 */
@JsonController()
@Service()
export default class ExternalGameImportController
{
    constructor(
        private playerRepository: PlayerRepository,
        private externalGameRepository: ExternalGameRepository,
        private externalGameImportWorker: ExternalGameImportWorker,
        private littleGolemClient: LittleGolemClient,
    ) {}

    /**
     * Not verified: any player can link any Little Golem account,
     * and a same Little Golem account can be linked to many players.
     */
    @Put('/api/players/me/little-golem')
    async linkLittleGolem(
        @AuthenticatedPlayer() player: Player,
        @Body() { pseudo }: LinkLittleGolemBody,
    ): Promise<{ littleGolemPlid: number, littleGolemPseudo: string }> {
        mustNotBeGuest(player);

        await rateLimiterConsumeLinkExternalAccount(player.publicId);

        let littleGolemPlayer: null | LittleGolemPlayer;

        try {
            littleGolemPlayer = await this.findLittleGolemPlayer(pseudo);
        } catch (e) {
            if (e instanceof LittleGolemFetchError) {
                throw new HttpError(502, 'Could not reach Little Golem, try again later');
            }

            throw e;
        }

        if (littleGolemPlayer === null) {
            throw new NotFoundError('Little Golem player not found. Only recently active players can be found by pseudo, paste your Little Golem profile link instead.');
        }

        await this.playerRepository.updateLittleGolemAccount(player.publicId, littleGolemPlayer.plid, littleGolemPlayer.pseudo);

        return {
            littleGolemPlid: littleGolemPlayer.plid,
            littleGolemPseudo: littleGolemPlayer.pseudo,
        };
    }

    /**
     * Search by plid or profile url if provided,
     * else by pseudo, but Little Golem search only lists recently active players.
     *
     * @throws {LittleGolemFetchError}
     */
    private async findLittleGolemPlayer(input: string): Promise<null | LittleGolemPlayer>
    {
        const plid = parsePlidInput(input);

        if (plid !== null) {
            const pseudo = parsePlayerPagePseudo(await this.littleGolemClient.fetchPlayerPage(plid));

            return pseudo === null ? null : { plid, pseudo };
        }

        if (input.trim().length > 64) {
            return null;
        }

        return findPlayerByPseudo(await this.littleGolemClient.fetchPlayerList(input.trim()), input);
    }

    /**
     * Imported games are kept.
     */
    @Delete('/api/players/me/little-golem')
    @OnUndefined(204)
    async unlinkLittleGolem(
        @AuthenticatedPlayer() player: Player,
    ): Promise<void> {
        await this.playerRepository.updateLittleGolemAccount(player.publicId, null, null);
    }

    /**
     * Import all finished games of the linked Little Golem account, in background.
     * Already imported games are skipped.
     */
    @Post('/api/external-games/imports/little-golem')
    async importLittleGolem(
        @AuthenticatedPlayer() player: Player,
    ): Promise<ExternalGameImportJob> {
        mustNotBeGuest(player);

        if (!ExternalGameImportWorker.isEnabled()) {
            throw new HttpError(503, 'Games import is disabled');
        }

        if (!player.littleGolemPlid) {
            throw new HttpError(400, 'Link a Little Golem account first');
        }

        const lastJob = await this.externalGameRepository.findLastImportJob(player);

        if (lastJob !== null && (lastJob.status === 'pending' || lastJob.status === 'running')) {
            return lastJob;
        }

        await rateLimiterConsumeImportExternalGames(player.publicId);

        const job = new ExternalGameImportJob();

        job.publicId = uuidv4();
        job.requestedBy = player;
        job.source = 'LG';
        job.externalPlayerId = String(player.littleGolemPlid);
        job.status = 'pending';

        await this.externalGameRepository.saveImportJob(job);

        this.externalGameImportWorker.notifyNewJob();

        return job;
    }

    /**
     * Last import requested by player, to show progress.
     */
    @Get('/api/external-games/imports/me')
    @OnUndefined(204)
    async getMyLastImport(
        @AuthenticatedPlayer() player: Player,
    ): Promise<undefined | ExternalGameImportJob> {
        return await this.externalGameRepository.findLastImportJob(player) ?? undefined;
    }
}
