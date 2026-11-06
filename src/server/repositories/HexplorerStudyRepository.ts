import { Inject, Service } from 'typedi';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { HexplorerStudy, Player } from '../../shared/app/models/index.js';
import { HEXPLORER_STUDIES_PAGE_SIZE } from '../../shared/app/hexplorerStudy.js';
import type SearchHexplorerStudiesParameters from '../../shared/app/SearchHexplorerStudiesParameters.js';

@Service()
export default class HexplorerStudyRepository
{
    constructor(
        @Inject('Repository<HexplorerStudy>')
        private hexplorerStudyRepository: Repository<HexplorerStudy>,
    ) {}

    /**
     * With author, and only link of initial study, not its data.
     */
    private createQueryBuilder(): SelectQueryBuilder<HexplorerStudy>
    {
        return this.hexplorerStudyRepository.createQueryBuilder('study')
            .leftJoinAndSelect('study.author', 'author')
            .leftJoin('study.forkedFrom', 'forkedFrom')
            .addSelect(['forkedFrom.id', 'forkedFrom.publicId', 'forkedFrom.title'])
        ;
    }

    async findByPublicId(publicId: string): Promise<null | HexplorerStudy>
    {
        return await this.createQueryBuilder()
            .where('study.publicId = :publicId', { publicId })
            .getOne()
        ;
    }

    /**
     * A page of studies, without data as only displayed in a list.
     * Untitled studies are always last when sorting by title.
     */
    async findByAuthor(
        author: Player,
        { sortBy = 'date', sortDirection = 'desc', paginationPage = 0 }: SearchHexplorerStudiesParameters = {},
    ): Promise<{ results: HexplorerStudy[], count: number }>
    {
        const direction = sortDirection === 'asc' ? 'ASC' : 'DESC';

        const queryBuilder = this.hexplorerStudyRepository.createQueryBuilder('study')
            .select(['study.id', 'study.publicId', 'study.title', 'study.createdAt', 'study.updatedAt'])
            .addSelect(`json_length(study.data, '$.nodes') - 1`, 'nodesCount')
            .where('study.author = :authorId', { authorId: author.id })
        ;

        if (sortBy === 'title') {
            queryBuilder
                .orderBy('study.title IS NULL', 'ASC')
                .addOrderBy('study.title', direction)
                .addOrderBy('study.updatedAt', 'DESC')
            ;
        } else {
            queryBuilder.orderBy('study.updatedAt', direction);
        }

        const [{ entities, raw }, count] = await Promise.all([
            queryBuilder
                .addOrderBy('study.id', direction) // Same order on all pages when values are equal
                .limit(HEXPLORER_STUDIES_PAGE_SIZE)
                .offset(paginationPage * HEXPLORER_STUDIES_PAGE_SIZE)
                .getRawAndEntities<{ nodesCount: number | string }>(),
            this.hexplorerStudyRepository.countBy({ author: { id: author.id } }),
        ]);

        entities.forEach((study, index) => {
            study.nodesCount = Number(raw[index].nodesCount);
        });

        return { results: entities, count };
    }

    async save(study: HexplorerStudy): Promise<HexplorerStudy>
    {
        return await this.hexplorerStudyRepository.save(study);
    }

    async remove(study: HexplorerStudy): Promise<void>
    {
        await this.hexplorerStudyRepository.remove(study);
    }
}
