import { Inject, Service } from 'typedi';
import { IsNull, Repository } from 'typeorm';
import { Player, Video } from '../../shared/app/models/index.js';

@Service()
export default class VideoRepository
{
    constructor(
        @Inject('Repository<Video>')
        private videoRepository: Repository<Video>,
    ) {}

    /**
     * Accepted videos, most recently added first.
     * Client sorts them by publication or added date.
     */
    async findAcceptedForList(): Promise<Video[]>
    {
        return await this.videoRepository.find({
            where: { accepted: true },
            order: { createdAt: 'DESC' },
        });
    }

    async existsByUrl(url: string): Promise<boolean>
    {
        return await this.videoRepository.existsBy({ url });
    }

    async countPendingBySubmitter(player: Player): Promise<number>
    {
        return await this.videoRepository.countBy({
            accepted: IsNull(),
            submittedBy: { id: player.id },
        });
    }

    /**
     * Last submitted videos, accepted, refused or pending, most recent first, with submitter.
     */
    async findLastForModeration(limit = 100): Promise<Video[]>
    {
        return await this.videoRepository.find({
            relations: { submittedBy: true },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    async findByPublicId(publicId: string): Promise<null | Video>
    {
        return await this.videoRepository.findOne({
            where: { publicId },
            relations: { submittedBy: true },
        });
    }

    async save(video: Video): Promise<Video>
    {
        return await this.videoRepository.save(video);
    }
}
