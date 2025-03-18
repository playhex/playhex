import { Get, JsonController, ResponseClassTransformOptions } from 'routing-controllers';
import { Inject, Service } from 'typedi';
import { AIConfigStatusData } from '../../../../shared/app/Types.js';
import HexAiApiClient from '../../../services/HexAiApiClient.js';
import logger from '../../../services/logger.js';
import AIConfig from '../../../../shared/app/models/AIConfig.js';
import { Repository } from 'typeorm';

const { HEX_AI_API } = process.env;

@JsonController()
@Service()
export default class AIConfigController
{
    constructor(
        private hexAiApiClient: HexAiApiClient,

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
                requireMorePower: true,
                isRemote: true,
                config: true as unknown as undefined,
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
        if (!HEX_AI_API) {
            return {
                aiApiAvailable: false,
                powerfulPeerAvailable: false,
            };
        }

        try {
            const peersStatus = await this.hexAiApiClient.getPeersStatus();

            return {
                aiApiAvailable: peersStatus.totalPeers > 0,
                powerfulPeerAvailable: peersStatus.totalPeersPrimary > 0,
            };
        } catch (e) {
            logger.error(e.message);

            return {
                aiApiAvailable: false,
                powerfulPeerAvailable: false,
            };
        }
    }
}
