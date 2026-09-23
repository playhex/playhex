import { Body, Get, JsonController, Param, Patch, Post, QueryParam } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { Player } from '../../shared/app/models/index.js';
import { LadderChallengeInput, LadderMeInput } from '../../shared/app/models/LadderDto.js';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';
import LadderService from './LadderService.js';

@JsonController()
@Service()
export default class LadderController
{
    constructor(
        private ladderService: LadderService,
    ) {}

    @Get('/api/ladders/:slug')
    async getLadder(
        @Param('slug') slug: string,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.getLadderView(ladder));
    }

    @Get('/api/ladders/:slug/me')
    async getMe(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.getMe(ladder, player));
    }

    @Get('/api/ladders/:slug/players/:playerPublicId')
    async getPlayerStatus(
        @Param('slug') slug: string,
        @Param('playerPublicId') playerPublicId: string,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.getPlayerStatus(ladder, playerPublicId));
    }

    @Patch('/api/ladders/:slug/me')
    async patchMe(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
        @Body() input: LadderMeInput,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.setIncomingSlots(ladder, player, input.incomingSlots));
    }

    @Get('/api/ladders/:slug/history')
    async getHistory(
        @Param('slug') slug: string,
        @QueryParam('page') page?: number,
        @QueryParam('player') playerPublicId?: string,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.getHistory(ladder, page ?? 0, playerPublicId ?? null));
    }

    @Get('/api/ladders/:slug/hall-of-fame')
    async getHallOfFame(
        @Param('slug') slug: string,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.getHallOfFame(ladder));
    }

    @Post('/api/ladders/:slug/join')
    async join(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.join(ladder, player));
    }

    @Post('/api/ladders/:slug/leave')
    async leave(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        await this.ladderService.leave(ladder, player);
    }

    @Post('/api/ladders/:slug/challenges')
    async postChallenge(
        @AuthenticatedPlayer() player: Player,
        @Param('slug') slug: string,
        @Body() input: LadderChallengeInput,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.challenge(
            ladder,
            player,
            input.defenderPublicId,
            input.boardsize,
            input.liveTimeControlType ?? null,
        ));
    }

    @Post('/api/ladder-challenges/:publicId/accept-live')
    async acceptLive(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ) {
        return instanceToPlain(await this.ladderService.answerLiveProposal(publicId, player, true));
    }

    @Post('/api/ladder-challenges/:publicId/decline-live')
    async declineLive(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ) {
        return instanceToPlain(await this.ladderService.answerLiveProposal(publicId, player, false));
    }
}
