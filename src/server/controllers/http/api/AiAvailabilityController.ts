import { Get, JsonController } from 'routing-controllers';
import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import type { AiAvailabilityData } from '../../../../shared/app/Types.js';
import { isAIConfigAvailable } from '../../../services/AIManager.js';
import { AIConfig } from '../../../../shared/app/models/index.js';
import AiJobService from '../../../ai-jobs/AiJobService.js';
import { ANALYSIS_ENGINES } from '../../../../shared/app/hexplorer.js';

/**
 * What AI features can be used now, given AI workers currently connected.
 */
@JsonController()
@Service()
export default class AiAvailabilityController
{
    constructor(
        @Inject('Repository<AIConfig>')
        private aiConfigRepository: Repository<AIConfig>,

        private aiJobService: AiJobService,
    ) {}

    @Get('/api/ai-availability')
    async getAvailability(): Promise<AiAvailabilityData> {
        const aiConfigs = await this.aiConfigRepository.find({
            relations: {
                player: true,
            },
        });

        return {
            availableAiPlayerPublicIds: aiConfigs
                .filter(aiConfig => isAIConfigAvailable(aiConfig))
                .map(aiConfig => aiConfig.player!.publicId)
            ,
            availableAnalysisEngines: ANALYSIS_ENGINES.filter(engine => this.aiJobService.isAnalysisEngineAvailable(engine)),
        };
    }
}
