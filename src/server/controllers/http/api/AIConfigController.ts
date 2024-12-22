import { Get, JsonController } from 'routing-controllers';
import { Inject, Service } from 'typedi';
import { AIConfigStatusData } from '@shared/app/Types';
import HexAiApiClient from '../../../services/HexAiApiClient';
import logger from '../../../services/logger';
import AIConfig from '../../../../shared/app/models/AIConfig';
import { EntityRepository } from '@mikro-orm/core';
import { instanceToPlain } from '../../../../shared/app/class-transformer-custom';

const { HEX_AI_API } = process.env;

@JsonController()
@Service()
export default class AIConfigController
{
    constructor(
        private hexAiApiClient: HexAiApiClient,

        @Inject('EntityRepository<AIConfig>')
        private aiConfigRepository: EntityRepository<AIConfig>,
    ) {}

    @Get('/api/ai-configs')
    async get() {
        const aiConfigs = await this.aiConfigRepository.findAll({
            populate: ['player'],
            orderBy: {
                order: 'asc',
            },
        });

        return instanceToPlain(aiConfigs, { groups: ['ai_config'] });
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
