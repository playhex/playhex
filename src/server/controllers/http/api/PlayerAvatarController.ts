import { Service } from 'typedi';
import { Controller, HttpError, Param, Put, Req, UseBefore } from 'routing-controllers';
import multer from 'multer';
import type { Request } from 'express';
import { Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import PlayerAvatarService, { InvalidImageError } from '../../../services/PlayerAvatarService.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import PlayerModerationActionRepository from '../../../repositories/PlayerModerationActionRepository.js';
import logger from '../../../services/logger.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
});

@Controller()
@Service()
export default class PlayerAvatarController
{
    constructor(
        private playerAvatarService: PlayerAvatarService,
        private playerRepository: PlayerRepository,
        private playerModerationActionRepository: PlayerModerationActionRepository,
    ) {}

    @Put('/api/players/:publicId/avatar')
    @UseBefore(upload.single('avatar'))
    async uploadAvatar(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Req() req: Request,
    ) {
        if (player.publicId !== publicId) {
            throw new HttpError(403, 'Cannot upload avatar for another player');
        }

        if (player.isGuest) {
            throw new HttpError(403, 'Guests cannot upload avatars');
        }

        if (await this.playerModerationActionRepository.isCurrentlyAvatarRestricted(publicId)) {
            throw new HttpError(403, 'You are not allowed to upload an avatar at this time');
        }

        const file = req.file;

        if (!file) {
            throw new HttpError(400, 'No file uploaded');
        }

        let avatarPath: string;
        let avatarThumbnailPath: string;
        let deleteOldAvatars: () => Promise<void>;

        try {
            ({ avatarPath, avatarThumbnailPath, deleteOldAvatars } = await this.playerAvatarService.saveAvatar(
                file.buffer,
                file.mimetype,
                player.avatarPath,
                player.avatarThumbnailPath,
            ));
        } catch (e) {
            if (e instanceof InvalidImageError) {
                throw new HttpError(400, 'Invalid or unsupported image');
            }
            throw e;
        }

        await this.playerRepository.updateAvatar(publicId, avatarPath, avatarThumbnailPath);

        deleteOldAvatars().catch(reason => {
            logger.notice('Error while deleting old avatars', {
                reason,
            });
        });

        return { avatarPath, avatarThumbnailPath };
    }
}
