import { Service } from 'typedi';

export class InvalidImageError extends Error {}

import { FileStorage } from '@flystorage/file-storage';
import { LocalStorageAdapter } from '@flystorage/local-fs';
import { Readable } from 'stream';
import path from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]);

const AVATAR_MAX_SIZE = 512;
const AVATAR_THUMB_WIDTH = 128;
const AVATAR_THUMB_HEIGHT = Math.round(128 * Math.sqrt(3) / 2); // 111px: matches hexagon 2/√3 ratio
const JPEG_QUALITY = 90;

const { AVATARS_PATH } = process.env;

if (!AVATARS_PATH) {
    throw new Error('AVATARS_PATH must be set');
}

export const avatarsPath = path.resolve(AVATARS_PATH);

type SavedAvatar = {
    avatarPath: string;
    avatarThumbnailPath: string;

    /**
     * Callback to delete old avatar files.
     * To be called once new avatars have been successfully
     * and old ones are no longer used for sure.
     */
    deleteOldAvatars: () => Promise<void>;
};

@Service()
export default class PlayerAvatarService
{
    private storage: FileStorage;

    constructor() {
        const adapter = new LocalStorageAdapter(avatarsPath);
        this.storage = new FileStorage(adapter);
    }

    isMimeTypeAllowed(mimeType: string): boolean {
        return ALLOWED_MIME_TYPES.has(mimeType);
    }

    private urlToFilename(avatarPath: string): string {
        return path.basename(avatarPath.split('?')[0]);
    }

    private async deleteIfExists(filename: string): Promise<void> {
        if (await this.storage.fileExists(filename)) {
            await this.storage.deleteFile(filename);
        }
    }

    async deleteAvatar(avatarPath: null | string | undefined, avatarThumbnailPath: null | string | undefined): Promise<void>
    {
        await Promise.all([
            avatarPath ? this.deleteIfExists(this.urlToFilename(avatarPath)) : Promise.resolve(),
            avatarThumbnailPath ? this.deleteIfExists(this.urlToFilename(avatarThumbnailPath)) : Promise.resolve(),
        ]);
    }

    async saveAvatar(
        fileBuffer: Buffer,
        mimeType: string,
        oldAvatarPath?: null | string,
        oldAvatarThumbnailPath?: null | string,
    ): Promise<SavedAvatar> {
        if (!this.isMimeTypeAllowed(mimeType)) {
            throw new Error(`Unsupported mime type: ${mimeType}`);
        }

        const uuid = randomUUID();

        let fullBuffer: Buffer;
        let thumbBuffer: Buffer;

        try {
            [fullBuffer, thumbBuffer] = await Promise.all([
                sharp(fileBuffer)
                    .resize(AVATAR_MAX_SIZE, AVATAR_MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: JPEG_QUALITY })
                    .toBuffer()
                ,
                sharp(fileBuffer)
                    .resize(AVATAR_THUMB_WIDTH, AVATAR_THUMB_HEIGHT, { fit: 'cover' })
                    .jpeg({ quality: JPEG_QUALITY })
                    .toBuffer()
                ,
            ]);
        } catch {
            throw new InvalidImageError();
        }

        await Promise.all([
            this.storage.write(`${uuid}.jpg`, Readable.from(fullBuffer)),
            this.storage.write(`${uuid}_thumb.jpg`, Readable.from(thumbBuffer)),
        ]);

        return {
            avatarPath: `/avatars/${uuid}.jpg`,
            avatarThumbnailPath: `/avatars/${uuid}_thumb.jpg`,

            deleteOldAvatars: async () => {
                try {
                    await Promise.all([
                        oldAvatarPath ? this.deleteIfExists(this.urlToFilename(oldAvatarPath)) : Promise.resolve(),
                        oldAvatarThumbnailPath ? this.deleteIfExists(this.urlToFilename(oldAvatarThumbnailPath)) : Promise.resolve(),
                    ]);
                } catch (e) {
                    throw new Error(`Error while deleting old avatars "${oldAvatarPath}" and "${oldAvatarThumbnailPath}". Reason: "${e instanceof Error ? e.message : String(e)}"`);
                }
            },
        };
    }
}
