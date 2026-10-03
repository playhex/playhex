import { Service } from 'typedi';
import { FileStorage } from '@flystorage/file-storage';
import { LocalStorageAdapter } from '@flystorage/local-fs';
import { Readable } from 'stream';
import path from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { safeFetch, SafeFetchError } from './safeFetch.js';

export class InvalidThumbnailError extends Error {}

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]);

const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 270; // 16:9
const JPEG_QUALITY = 85;
const DOWNLOAD_MAX_SIZE = 5 * 1024 * 1024;
const DOWNLOAD_TIMEOUT = 10000;

const { VIDEO_THUMBNAILS_PATH } = process.env;

if (!VIDEO_THUMBNAILS_PATH) {
    throw new Error('VIDEO_THUMBNAILS_PATH must be set');
}

export const videoThumbnailsPath = path.resolve(VIDEO_THUMBNAILS_PATH);

@Service()
export default class VideoThumbnailService
{
    private storage: FileStorage;

    constructor() {
        const adapter = new LocalStorageAdapter(videoThumbnailsPath);
        this.storage = new FileStorage(adapter);
    }

    isMimeTypeAllowed(mimeType: string): boolean {
        return ALLOWED_MIME_TYPES.has(mimeType);
    }

    /**
     * @returns Thumbnail public path, e.g "/video-thumbnails/<uuid>.jpg"
     * @throws {InvalidThumbnailError}
     */
    async saveFromBuffer(fileBuffer: Buffer, mimeType: string): Promise<string>
    {
        if (!this.isMimeTypeAllowed(mimeType)) {
            throw new InvalidThumbnailError(`Unsupported mime type: ${mimeType}`);
        }

        let thumbBuffer: Buffer;

        try {
            thumbBuffer = await sharp(fileBuffer)
                .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover' })
                .jpeg({ quality: JPEG_QUALITY })
                .toBuffer()
            ;
        } catch {
            throw new InvalidThumbnailError('Invalid image');
        }

        const filename = `${randomUUID()}.jpg`;

        await this.storage.write(filename, Readable.from(thumbBuffer));

        return `/video-thumbnails/${filename}`;
    }

    /**
     * Downloads image from an external url, then saves it.
     *
     * @throws {InvalidThumbnailError}
     */
    async saveFromUrl(url: string): Promise<string>
    {
        let response: Awaited<ReturnType<typeof safeFetch>>;

        try {
            response = await safeFetch(url, { maxSize: DOWNLOAD_MAX_SIZE, timeout: DOWNLOAD_TIMEOUT });
        } catch (e) {
            if (e instanceof SafeFetchError) {
                throw new InvalidThumbnailError(e.message);
            }

            throw e;
        }

        if (response.status !== 200) {
            throw new InvalidThumbnailError(`Could not download thumbnail, status ${response.status}`);
        }

        return await this.saveFromBuffer(response.body, response.mimeType);
    }

    async deleteThumbnail(thumbnailPath: string): Promise<void>
    {
        const filename = path.basename(thumbnailPath);

        if (await this.storage.fileExists(filename)) {
            await this.storage.deleteFile(filename);
        }
    }
}
