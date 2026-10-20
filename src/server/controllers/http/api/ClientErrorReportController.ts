import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Body, CurrentUser, JsonController, Post, Req } from 'routing-controllers';
import { ClientErrorReport, Player } from '../../../../shared/app/models/index.js';
import { CLIENT_ERROR_REPORT_CREATE } from '../../../../shared/app/models/ClientErrorReport.js';
import { rateLimiterConsumeClientErrorReport } from '../../../services/rate-limiters.js';

@JsonController()
@Service()
export default class ClientErrorReportController
{
    constructor(
        @Inject('Repository<ClientErrorReport>')
        private clientErrorReportRepository: Repository<ClientErrorReport>,
    ) {}

    /**
     * Store a javascript error that happened on player device.
     * Not logged in player can also report errors.
     */
    @Post('/api/client-error-reports')
    async postClientErrorReport(
        @Req() request: Request,
        @Body({
            validate: { groups: [CLIENT_ERROR_REPORT_CREATE] },
            transform: { groups: [CLIENT_ERROR_REPORT_CREATE] },
        }) clientErrorReport: ClientErrorReport,
        @CurrentUser() player?: Player,
    ): Promise<void> {
        await rateLimiterConsumeClientErrorReport(request.ip);

        clientErrorReport.player = player ?? null;

        await this.clientErrorReportRepository.save(clientErrorReport);
    }
}
