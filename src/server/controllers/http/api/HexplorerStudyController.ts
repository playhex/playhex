import { BadRequestError, Body, Delete, Get, HttpError, JsonController, NotFoundError, OnUndefined, Param, Post, Put, QueryParams, Res } from 'routing-controllers';
import { Service } from 'typedi';
import type { Response } from 'express';
import { format } from 'content-range';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedPlayer } from '../middlewares.js';
import { HexplorerStudy, Player } from '../../../../shared/app/models/index.js';
import { HEXPLORER_STUDY_MAX_BYTES, HEXPLORER_STUDY_MAX_NODES, HEXPLORER_STUDY_TITLE_MAX_LENGTH, InvalidHexplorerStateError, parseHexplorerState, type HexplorerStudyInput } from '../../../../shared/app/hexplorerStudy.js';
import SearchHexplorerStudiesParameters from '../../../../shared/app/SearchHexplorerStudiesParameters.js';
import { instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';
import HexplorerStudyRepository from '../../../repositories/HexplorerStudyRepository.js';
import PlayerModerationActionRepository from '../../../repositories/PlayerModerationActionRepository.js';
import { rateLimiterConsumeCreateHexplorerStudy, rateLimiterRewardCreateHexplorerStudy } from '../../../services/rate-limiters.js';

/**
 * Body size limit, as a tree with many nodes and comments can exceed default 100kb.
 */
const BODY_OPTIONS = { required: true, options: { limit: HEXPLORER_STUDY_MAX_BYTES } };

/**
 * Only fields displayed on Hexplorer, e.g not all data of author.
 */
const serializeStudy = (data: object) => instanceToPlain(data, { groups: ['hexplorer_study', 'puzzle'] });

/**
 * Applies title and data sent by client, which are not validated by class-validator.
 *
 * @throws {BadRequestError}
 */
const applyStudyInput = (study: HexplorerStudy, input: HexplorerStudyInput): void => {
    const title = input.title ?? null;

    if (title !== null && (typeof title !== 'string' || title.length > HEXPLORER_STUDY_TITLE_MAX_LENGTH)) {
        throw new BadRequestError('Invalid study title');
    }

    try {
        study.data = parseHexplorerState(input.data, HEXPLORER_STUDY_MAX_NODES);
    } catch (e) {
        if (e instanceof InvalidHexplorerStateError) {
            throw new BadRequestError(e.message);
        }

        throw e;
    }

    study.title = title?.trim() || null;
};

const mustBeStudyAuthor = (study: HexplorerStudy, player: Player): void => {
    if (study.author?.publicId !== player.publicId) {
        throw new HttpError(403, 'Only study author can do this');
    }
};

@JsonController()
@Service()
export default class HexplorerStudyController
{
    constructor(
        private hexplorerStudyRepository: HexplorerStudyRepository,
        private playerModerationActionRepository: PlayerModerationActionRepository,
    ) {}

    private async getStudyOrFail(publicId: string): Promise<HexplorerStudy>
    {
        const study = await this.hexplorerStudyRepository.findByPublicId(publicId);

        if (study === null) {
            throw new NotFoundError(`Study "${publicId}" not found`);
        }

        return study;
    }

    @Get('/api/hexplorer/studies')
    async getMyStudies(
        @AuthenticatedPlayer() player: Player,
        @QueryParams() params: SearchHexplorerStudiesParameters,
        @Res() res: Response,
    ) {
        const { results, count } = await this.hexplorerStudyRepository.findByAuthor(player, params);

        const contentRange = format({
            unit: 'studies',
            size: count,
            start: 0,
            end: results.length,
        });

        if (contentRange !== null) {
            res.set('Content-Range', contentRange);
        }

        return serializeStudy(results);
    }

    @Get('/api/hexplorer/studies/:publicId')
    async getStudy(
        @Param('publicId') publicId: string,
    ) {
        return serializeStudy(await this.getStudyOrFail(publicId));
    }

    /**
     * Creates a study, or a fork when forkedFromPublicId is provided.
     * A fork of a study deleted in the meantime is still saved, without link.
     */
    @Post('/api/hexplorer/studies')
    async postStudy(
        @AuthenticatedPlayer() player: Player,
        @Body(BODY_OPTIONS) input: HexplorerStudyInput,
    ) {
        await this.playerModerationActionRepository.mustNotBeContentRestricted(player);

        const study = new HexplorerStudy();

        applyStudyInput(study, input);

        study.publicId = uuidv4();
        study.author = player;
        study.forkedFrom = typeof input.forkedFromPublicId === 'string'
            ? await this.hexplorerStudyRepository.findByPublicId(input.forkedFromPublicId)
            : null
        ;

        await rateLimiterConsumeCreateHexplorerStudy(player.publicId);

        return serializeStudy(await this.hexplorerStudyRepository.save(study));
    }

    @Put('/api/hexplorer/studies/:publicId')
    async putStudy(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body(BODY_OPTIONS) input: HexplorerStudyInput,
    ) {
        const study = await this.getStudyOrFail(publicId);

        mustBeStudyAuthor(study, player);
        await this.playerModerationActionRepository.mustNotBeContentRestricted(player);

        applyStudyInput(study, input);
        study.updatedAt = new Date();

        return serializeStudy(await this.hexplorerStudyRepository.save(study));
    }

    @Delete('/api/hexplorer/studies/:publicId')
    @OnUndefined(204)
    async deleteStudy(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ): Promise<void> {
        const study = await this.getStudyOrFail(publicId);

        mustBeStudyAuthor(study, player);

        await this.hexplorerStudyRepository.remove(study);
        await rateLimiterRewardCreateHexplorerStudy(player.publicId);
    }
}
