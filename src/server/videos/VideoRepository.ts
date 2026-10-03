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

    async save(video: Video): Promise<Video>
    {
        return await this.videoRepository.save(video);
    }
}
