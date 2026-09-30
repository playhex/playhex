import { Get, JsonController, ResponseClassTransformOptions } from 'routing-controllers';
import { Inject, Service } from 'typedi';
import type { AIConfigStatusData } from '../../../../shared/app/Types.js';
import { isAIConfigAvailable } from '../../../services/AIManager.js';
import { AIConfig } from '../../../../shared/app/models/index.js';
import { Repository } from 'typeorm';

@JsonController()
@Service()
export default class AIConfigController
{
    constructor(
        @Inject('Repository<AIConfig>')
        private aiConfigRepository: Repository<AIConfig>,
    ) {}

    @Get('/api/ai-configs')
    @ResponseClassTransformOptions({ groups: ['ai_config'] })
    async get(): Promise<AIConfig[]> {
        return await this.aiConfigRepository.find({
            relations: {
                player: true,
            },
            select: {
                engine: true,
                label: true,
                description: true,
                boardsizeMin: true,
                boardsizeMax: true,
                config: true as unknown as undefined,
                relativeLevel: true,
                player: {
                    publicId: true,
                },
            },
            order: {
                order: 'asc',
            },
        });
    }

    @Get('/api/ai-configs-status')
    async getStatus(): Promise<AIConfigStatusData> {
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
        };
    }
}
