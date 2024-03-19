import { Get, JsonController } from 'routing-controllers';
import prisma from '../../../services/prisma';
import { Service } from 'typedi';
import { AIConfigStatusData } from '@shared/app/Types';
import HexAiApiClient from '../../../services/HexAiApiClient';
import logger from '../../../services/logger';
import AIConfig from '../../../../shared/app/models/AIConfig';

const { HEX_AI_API } = process.env;

@JsonController()
@Service()
export default class AIConfigController
{
    constructor(
        private hexAiApiClient: HexAiApiClient,
    ) {}

    @Get('/api/ai-configs')
    async get(): Promise<AIConfig<'withPlayerId'>[]> {
        const aIConfigs = await prisma.aIConfig.findMany({
            select: {
                engine: true,
                label: true,
                description: true,
                boardsizeMin: true,
                boardsizeMax: true,
                config: true,
                requireMorePower: true,
                isRemote: true,
                player: {
                    select: {
                        publicId: true,
                    },
                },
            },
            orderBy: [
                { order: 'asc' },
            ],
        });

        return aIConfigs as AIConfig<'withPlayerId'>[]; // Assume all aiConfig.config are json objects, and not json null/string/...
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
