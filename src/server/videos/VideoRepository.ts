import { Inject, Service } from 'typedi';
import { In, Repository } from 'typeorm';
import { Video, VideoAlternateLink } from '../../shared/app/models/index.js';

@Service()
export default class VideoRepository
{
    constructor(
        @Inject('Repository<Video>')
        private videoRepository: Repository<Video>,

        @Inject('Repository<VideoAlternateLink>')
        private videoAlternateLinkRepository: Repository<VideoAlternateLink>,
    ) {}

    /**
     * Accepted videos, most recently added first.
     * Client sorts them by publication or added date.
     */
    async findAcceptedForList(): Promise<Video[]>
    {
        return await this.videoRepository.find({
            where: { accepted: true },
            relations: { alternateLinks: true },
            order: { createdAt: 'DESC', alternateLinks: { position: 'ASC' } },
        });
    }

    /**
     * Whether one of these urls is already used, as main or secondary link of a video.
     */
    async existsByAnyUrl(urls: string[]): Promise<boolean>
    {
        return await this.videoRepository.existsBy({ url: In(urls) })
            || await this.videoAlternateLinkRepository.existsBy({ url: In(urls) })
        ;
    }

    /**
     * Last submitted videos, accepted, refused or pending, most recent first, with submitter.
     */
    async findLastForModeration(limit = 100): Promise<Video[]>
    {
        return await this.videoRepository.find({
            relations: { submittedBy: true, alternateLinks: true },
            order: { createdAt: 'DESC', alternateLinks: { position: 'ASC' } },
            take: limit,
        });
    }

    async findByPublicId(publicId: string): Promise<null | Video>
    {
        return await this.videoRepository.findOne({
            where: { publicId },
            relations: { submittedBy: true, alternateLinks: true },
            order: { alternateLinks: { position: 'ASC' } },
        });
    }

    async save(video: Video): Promise<Video>
    {
        return await this.videoRepository.save(video);
    }
}
