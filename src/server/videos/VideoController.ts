import { BadRequestError, Body, Get, HttpError, JsonController, NotFoundError, Post, Req, UseBefore } from 'routing-controllers';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import type { Request } from 'express';
import { AuthenticatedPlayer } from '../controllers/http/middlewares.js';
import { Player, Video } from '../../shared/app/models/index.js';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';
import { normalizeVideoUrl } from '../../shared/app/videos/youtube.js';
import { isHttpUrl, validateVideoInput, type VideoInput, type VideoMetadata } from '../../shared/app/videos/videoInput.js';
import VideoRepository from './VideoRepository.js';
import VideoThumbnailService, { InvalidThumbnailError } from './VideoThumbnailService.js';
import VideoMetadataService from './metadata/VideoMetadataService.js';
import { VideoMetadataUnavailableError, VideoNotFoundError } from './metadata/metadataErrors.js';
import logger from '../services/logger.js';

/**
 * Prevent a player to flood moderation queue.
 */
const MAX_PENDING_VIDEOS_PER_PLAYER = 10;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
});

/**
 * @throws {HttpError} If player cannot submit videos
 */
const mustBeAllowedToSubmit = (player: Player): void => {
    if (player.isGuest) {
        throw new HttpError(403, 'Guests cannot submit videos');
    }
};

/**
 * Multipart fields are all strings, converts them to video input.
 *
 * @throws {BadRequestError}
 */
const parseMultipartVideoInput = (body: Record<string, unknown>): VideoInput => {
    const { url, title, authorName, durationSeconds, languages, keywords } = body;

    if (typeof url !== 'string' || typeof title !== 'string' || typeof authorName !== 'string' || typeof durationSeconds !== 'string' || typeof languages !== 'string' || (keywords !== undefined && typeof keywords !== 'string')) {
        throw new BadRequestError('Missing fields');
    }

    let parsedLanguages: unknown;

    try {
        parsedLanguages = JSON.parse(languages);
    } catch {
        throw new BadRequestError('Invalid languages');
    }

    if (!Array.isArray(parsedLanguages) || parsedLanguages.some(language => typeof language !== 'string')) {
        throw new BadRequestError('Invalid languages');
    }

    const input: VideoInput = {
        url: normalizeVideoUrl(url),
        title: title.trim(),
        authorName: authorName.trim(),
        durationSeconds: Number(durationSeconds),
        languages: [...new Set(parsedLanguages as string[])],
        keywords: (keywords ?? '').trim(),
    };

    const errors = validateVideoInput(input);

    if (errors.length > 0) {
        throw new BadRequestError(`Invalid video: ${errors.join(', ')}`);
    }

    return input;
};

@JsonController()
@Service()
export default class VideoController
{
    constructor(
        private videoRepository: VideoRepository,
        private videoThumbnailService: VideoThumbnailService,
        private videoMetadataService: VideoMetadataService,
    ) {}

    @Get('/api/videos')
    async getVideos()
    {
        return instanceToPlain(await this.videoRepository.findAcceptedForList(), { groups: ['video'] });
    }

    /**
     * Used to prefill video submission form from a video link.
     */
    @Post('/api/videos/metadata')
    async getVideoMetadata(
        @AuthenticatedPlayer() player: Player,
        @Body({ required: true }) { url }: { url: string },
    ): Promise<VideoMetadata> {
        mustBeAllowedToSubmit(player);

        if (typeof url !== 'string' || !isHttpUrl(url.trim())) {
            throw new BadRequestError('Invalid url');
        }

        try {
            return await this.videoMetadataService.fetchMetadata(url.trim());
        } catch (e) {
            if (e instanceof VideoNotFoundError) {
                throw new NotFoundError('Video not found');
            }

            if (e instanceof VideoMetadataUnavailableError) {
                throw new HttpError(422, `Could not get video infos from this link: ${e.message}`);
            }

            throw e;
        }
    }

    /**
     * Submit a video, will be listed once accepted by moderation.
     * Multipart, with either a "thumbnail" file, or a "thumbnailUrl" field.
     */
    @Post('/api/videos')
    @UseBefore(upload.single('thumbnail'))
    async postVideo(
        @AuthenticatedPlayer() player: Player,
        @Req() req: Request,
    ) {
        mustBeAllowedToSubmit(player);

        const body = (req.body ?? {}) as Record<string, unknown>;
        const input = parseMultipartVideoInput(body);

        if (await this.videoRepository.existsByUrl(input.url)) {
            throw new HttpError(409, 'This video has already been submitted');
        }

        if (await this.videoRepository.countPendingBySubmitter(player) >= MAX_PENDING_VIDEOS_PER_PLAYER) {
            throw new HttpError(429, 'Too many videos waiting for moderation, try again later');
        }

        let thumbnailPath: string;

        try {
            if (req.file) {
                thumbnailPath = await this.videoThumbnailService.saveFromBuffer(req.file.buffer, req.file.mimetype);
            } else if (typeof body.thumbnailUrl === 'string' && body.thumbnailUrl !== '') {
                thumbnailPath = await this.videoThumbnailService.saveFromUrl(body.thumbnailUrl);
            } else {
                throw new BadRequestError('Missing thumbnail');
            }
        } catch (e) {
            if (e instanceof InvalidThumbnailError) {
                throw new BadRequestError(`Invalid thumbnail: ${e.message}`);
            }

            throw e;
        }

        const video = new Video();

        video.publicId = uuidv4();
        video.url = input.url;
        video.title = input.title;
        video.authorName = input.authorName;
        video.durationSeconds = input.durationSeconds;
        video.languages = input.languages;
        video.keywords = input.keywords === '' ? null : input.keywords;
        video.thumbnailPath = thumbnailPath;
        video.submittedBy = player;
        video.accepted = null;
        video.moderatedAt = null;

        try {
            await this.videoRepository.save(video);
        } catch (e) {
            this.videoThumbnailService.deleteThumbnail(thumbnailPath).catch(reason => {
                logger.notice('Error while deleting unused video thumbnail', { reason });
            });

            throw e;
        }

        return instanceToPlain(video, { groups: ['video'] });
    }
}
